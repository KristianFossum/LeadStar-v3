-- Add interests and skills to user_profile
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS interests jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills_to_learn jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skills_to_teach jsonb DEFAULT '[]'::jsonb;

-- Update user_matcher_profile to include interest/skill vectors
ALTER TABLE user_matcher_profile
ADD COLUMN IF NOT EXISTS interest_vector jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS skill_vector jsonb DEFAULT '{}'::jsonb;

-- Create skill_groups table for LearnStar forums
CREATE TABLE IF NOT EXISTS public.skill_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  creator_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  members text[] DEFAULT ARRAY[]::text[],
  privacy boolean DEFAULT true,
  category text,
  mode text DEFAULT 'friend' CHECK (mode IN ('friend', 'lover', 'self')),
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create skill_group_members table
CREATE TABLE IF NOT EXISTS skill_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES skill_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'learner' CHECK (role IN ('learner', 'mentor', 'peer')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create skill_group_posts table for anonymous sharing
CREATE TABLE IF NOT EXISTS skill_group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES skill_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_anonymous boolean DEFAULT true,
  post_type text DEFAULT 'share' CHECK (post_type IN ('share', 'question', 'resource', 'achievement')),
  ai_moderation_status text DEFAULT 'pending' CHECK (ai_moderation_status IN ('pending', 'approved', 'flagged')),
  created_at timestamptz DEFAULT now()
);

-- Create skill_metrics table for KPI tracking
CREATE TABLE IF NOT EXISTS skill_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name text NOT NULL,
  metric_type text DEFAULT 'progress' CHECK (metric_type IN ('progress', 'mastery', 'practice_time', 'shared_goal')),
  current_value numeric DEFAULT 0,
  target_value numeric DEFAULT 100,
  unit text DEFAULT 'percent',
  history jsonb DEFAULT '[]'::jsonb,
  bond_id uuid DEFAULT NULL, -- For shared metrics with a bond
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_name, bond_id)
);

-- Update learn_paths to include skill-based matching
ALTER TABLE learn_paths
ADD COLUMN IF NOT EXISTS skill_category text,
ADD COLUMN IF NOT EXISTS difficulty_level text DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
ADD COLUMN IF NOT EXISTS matched_peers jsonb DEFAULT '[]'::jsonb;

-- Create compatibility_quizzes table
CREATE TABLE IF NOT EXISTS compatibility_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_type text CHECK (quiz_type IN ('interests', 'skills', 'values', 'learning_style')),
  responses jsonb NOT NULL,
  results jsonb,
  created_at timestamptz DEFAULT now()
);

-- Update matcher_matches to track skill-based compatibility
ALTER TABLE matcher_matches
ADD COLUMN IF NOT EXISTS skill_compatibility_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_compatibility_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS shared_interests jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS shared_skills jsonb DEFAULT '[]'::jsonb;

-- Create skill_match_rituals table for joint learning activities
CREATE TABLE IF NOT EXISTS skill_match_rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matcher_matches(id) ON DELETE CASCADE,
  ritual_type text CHECK (ritual_type IN ('weekly_chess_oath', 'skill_check_in', 'joint_learning', 'peer_review')),
  skill_focus text NOT NULL,
  prompt text NOT NULL,
  frequency text DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  next_ritual_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Update journal_entries to include skill reflections
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS skill_reflections jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS skill_progress_notes text,
ADD COLUMN IF NOT EXISTS skill_notes text;

-- Create value_amplifiers table for Values enhancements
CREATE TABLE IF NOT EXISTS value_amplifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  value_name text NOT NULL,
  rituals jsonb DEFAULT '[]'::jsonb,
  collaboration_suggestions jsonb DEFAULT '[]'::jsonb,
  grokipedia_branches jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, value_name)
);

-- Create growth_arcs table for Growth section
CREATE TABLE IF NOT EXISTS growth_arcs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  area text NOT NULL,
  start_date timestamptz NOT NULL,
  target_date timestamptz NOT NULL,
  predicted_mastery_days integer NOT NULL,
  current_progress numeric DEFAULT 0,
  milestones jsonb DEFAULT '[]'::jsonb,
  bond_suggestions jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE value_amplifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_arcs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own amplifiers" ON value_amplifiers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own growth arcs" ON growth_arcs FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_value_amplifiers_user ON value_amplifiers(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_arcs_user ON growth_arcs(user_id);

-- Create unlock_requirements table for effort-gated features
CREATE TABLE IF NOT EXISTS unlock_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  requirement_type text CHECK (requirement_type IN ('kpi_days', 'skill_tracked', 'test_complete', 'journal_entries')),
  progress_value numeric DEFAULT 0,
  target_value numeric NOT NULL,
  is_unlocked boolean DEFAULT false,
  unlocked_at timestamptz,
  UNIQUE(user_id, feature_name, requirement_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_groups_category ON skill_groups(category);
CREATE INDEX IF NOT EXISTS idx_skill_group_members_user ON skill_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_group_posts_group ON skill_group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_skill_metrics_user ON skill_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_metrics_bond ON skill_metrics(bond_id) WHERE bond_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matcher_matches_skills ON matcher_matches USING gin(shared_skills);
CREATE INDEX IF NOT EXISTS idx_user_profile_interests ON user_profile USING gin(interests);

-- Enable RLS on new tables
ALTER TABLE skill_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE compatibility_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_match_rituals ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlock_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view public groups" ON skill_groups FOR SELECT USING (is_public = true);
CREATE POLICY "Users can create groups" ON skill_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creators can update" ON skill_groups FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can join groups" ON skill_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their memberships" ON skill_group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON skill_group_members FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Group members can view posts" ON skill_group_posts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM skill_group_members
    WHERE skill_group_members.group_id = skill_group_posts.group_id
    AND skill_group_members.user_id = auth.uid()
  ));
CREATE POLICY "Users can create posts" ON skill_group_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own skill metrics" ON skill_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skill metrics" ON skill_metrics FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quizzes" ON compatibility_quizzes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view own rituals" ON skill_match_rituals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM matcher_matches
    WHERE matcher_matches.id = skill_match_rituals.match_id
    AND (matcher_matches.user1_id = auth.uid() OR matcher_matches.user2_id = auth.uid())
  ));

CREATE POLICY "Users can view own unlocks" ON unlock_requirements FOR ALL USING (auth.uid() = user_id);

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE skill_groups
    SET member_count = member_count + 1
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE skill_groups
    SET member_count = member_count - 1
    WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_count_trigger
AFTER INSERT OR DELETE ON skill_group_members
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();
