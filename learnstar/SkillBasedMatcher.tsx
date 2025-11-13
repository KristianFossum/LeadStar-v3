import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Heart, Users, MessageSquare, Target, TrendingUp, Sparkles, Calendar, BookHeart } from 'lucide-react';
import { toast } from 'sonner';

interface SkillMatch {
  user_id: string;
  skill_name: string;
  role: 'learner' | 'mentor' | 'peer';
  match_score: number;
  shared_traits: string[];
  shared_values: string[];
  shared_interests: string[];
}

interface MatchRequest {
  id: string;
  requester_id: string;
  target_id: string;
  skill_name: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

interface DevotionalRitual {
  id: string;
  bond_id: string;
  prompt: string;
  grokipedia_topic?: string;
  mode: 'friend' | 'lover';
  completed: boolean;
  created_at: string;
}

export function SkillBasedMatcher() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<SkillMatch[]>([]);
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchingMatches, setSearchingMatches] = useState(false);
  const [rituals, setRituals] = useState<DevotionalRitual[]>([]);
  const [showRituals, setShowRituals] = useState(false);

  useEffect(() => {
    if (user) {
      loadMySkills();
      loadRituals();
    }
  }, [user]);

  const loadRituals = async () => {
    try {
      const { data, error } = await supabase
        .from('devotional_rituals')
        .select('*')
        .or(`requester_id.eq.${user?.id},target_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRituals(data || []);
    } catch (error) {
      console.error('Error loading rituals:', error);
    }
  };

  const generateDailyRitual = async () => {
    if (!selectedSkill) {
      toast.error('Select a skill first');
      return;
    }

    try {
      // In production, fetch Grokipedia-based prompts via Grok AI
      const grokipediaTopic = `${selectedSkill} collaboration`;
      const prompt = `Daily oath: Explore "${grokipediaTopic}" together with your learning bond. Grokipedia offers shared wisdom—devote 15 minutes to mutual mastery.`;

      const { error } = await supabase
        .from('devotional_rituals')
        .insert({
          bond_id: `temp_${Date.now()}`, // In production, link to actual bond
          prompt,
          grokipedia_topic: grokipediaTopic,
          mode: 'friend',
          completed: false
        });

      if (error) throw error;
      toast.success('Devotional ritual created from Grokipedia!');
      loadRituals();
    } catch (error: any) {
      toast.error('Failed to create ritual: ' + error.message);
    }
  };

  const loadMySkills = async () => {
    try {
      // Get skills from learning paths and skill metrics
      const { data: pathsData } = await supabase
        .from('learning_paths')
        .select('skill_name')
        .eq('user_id', user?.id);

      const { data: metricsData } = await supabase
        .from('skill_metrics')
        .select('skill_name')
        .eq('user_id', user?.id);

      const skills = new Set<string>();
      pathsData?.forEach(p => skills.add(p.skill_name));
      metricsData?.forEach(m => skills.add(m.skill_name));

      setMySkills(Array.from(skills));
      if (skills.size > 0) {
        setSelectedSkill(Array.from(skills)[0]);
      }
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const findMatches = async () => {
    if (!selectedSkill) {
      toast.error('Select a skill to find matches');
      return;
    }

    setSearchingMatches(true);
    try {
      // Get current user's personality and interests
      const { data: myProfile } = await supabase
        .from('personality_results')
        .select('traits, values')
        .eq('user_id', user?.id)
        .single();

      const { data: myInterests } = await supabase
        .from('user_profiles')
        .select('interests')
        .eq('user_id', user?.id)
        .single();

      // Find users with similar interests/skills
      const { data: potentialMatches } = await supabase
        .from('learning_paths')
        .select('user_id, skill_name')
        .eq('skill_name', selectedSkill)
        .neq('user_id', user?.id);

      if (!potentialMatches || potentialMatches.length === 0) {
        toast.info('No matches found for this skill yet');
        setMatches([]);
        return;
      }

      // Calculate match scores (simplified cosine similarity)
      // In production, use proper vector embeddings
      const matchesWithScores: SkillMatch[] = [];

      for (const match of potentialMatches.slice(0, 10)) {
        const { data: matchProfile } = await supabase
          .from('personality_results')
          .select('traits, values')
          .eq('user_id', match.user_id)
          .single();

        if (!matchProfile) continue;

        // Simple similarity calculation
        const sharedTraits = myProfile?.traits?.filter((t: string) =>
          matchProfile.traits?.includes(t)
        ) || [];

        const sharedValues = myProfile?.values?.filter((v: string) =>
          matchProfile.values?.includes(v)
        ) || [];

        // Calculate weighted score (50% traits, 30% values, 20% interests/skills)
        const traitScore = (sharedTraits.length / (myProfile?.traits?.length || 1)) * 50;
        const valueScore = (sharedValues.length / (myProfile?.values?.length || 1)) * 30;
        const skillScore = 20; // They share the skill

        const matchScore = traitScore + valueScore + skillScore;

        matchesWithScores.push({
          user_id: match.user_id,
          skill_name: selectedSkill,
          role: 'peer', // In production, determine based on skill level
          match_score: matchScore,
          shared_traits: sharedTraits,
          shared_values: sharedValues,
          shared_interests: [selectedSkill]
        });
      }

      // Sort by score
      matchesWithScores.sort((a, b) => b.match_score - a.match_score);
      setMatches(matchesWithScores);

      if (matchesWithScores.length > 0) {
        toast.success(`Found ${matchesWithScores.length} synergistic matches! I get your goal for peers.`);
      }
    } catch (error: any) {
      console.error('Error finding matches:', error);
      toast.error('Failed to find matches: ' + error.message);
    } finally {
      setSearchingMatches(false);
    }
  };

  const sendMatchRequest = async (targetUserId: string) => {
    try {
      const { error } = await supabase
        .from('skill_match_requests')
        .insert({
          requester_id: user?.id,
          target_id: targetUserId,
          skill_name: selectedSkill,
          status: 'pending'
        });

      if (error) throw error;
      toast.success('Connection request sent!');
    } catch (error: any) {
      toast.error('Failed to send request: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading matcher...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">SKILL-BASED BONDS</h2>
        <p className="text-muted-foreground">
          Find like-minded souls for collaborative learning with Devotional Study Rituals from Grokipedia
        </p>
      </div>

      {/* Devotional Study Rituals Section */}
      <Card className="bg-gradient-to-r from-pink-500/10 to-rose-500/10 border-pink-300/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookHeart className="h-5 w-5" />
                Devotional Study Rituals
              </CardTitle>
              <CardDescription>
                Grokipedia-based prompts for mode-specific commitment—explore one entry together daily
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRituals(!showRituals)}
            >
              {showRituals ? 'Hide' : 'Show'} Rituals
            </Button>
          </div>
        </CardHeader>
        {showRituals && (
          <CardContent className="space-y-4">
            <Button onClick={generateDailyRitual} className="w-full" disabled={!selectedSkill}>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Daily Ritual from Grokipedia
            </Button>
            {rituals.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No rituals yet. Generate a Grokipedia-based daily devotional for your bonds.
              </p>
            ) : (
              <div className="space-y-2">
                {rituals.map((ritual) => (
                  <Card key={ritual.id} className="bg-pink-50 border-pink-200">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-pink-600">
                            <BookHeart className="h-3 w-3 mr-1" />
                            Ritual
                          </Badge>
                          {ritual.grokipedia_topic && (
                            <Badge variant="outline" className="text-xs">
                              {ritual.grokipedia_topic}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ritual.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm italic text-pink-900">{ritual.prompt}</p>
                      {!ritual.completed && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-xs"
                          onClick={async () => {
                            await supabase
                              .from('devotional_rituals')
                              .update({ completed: true })
                              .eq('id', ritual.id);
                            loadRituals();
                            toast.success('Ritual completed—your commitment strengthens your bond!');
                          }}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Find Learning Partners</CardTitle>
          <CardDescription>
            Match with peers and mentors based on traits, values, and shared interests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Skill</label>
            {mySkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No skills tracked yet. Create a learning path or add skill metrics first.
              </p>
            ) : (
              <select
                className="w-full border rounded p-2"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
              >
                {mySkills.map((skill) => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
            )}
          </div>

          <Button
            onClick={findMatches}
            disabled={!selectedSkill || searchingMatches}
            className="w-full"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {searchingMatches ? 'Searching...' : 'Find Matches'}
          </Button>

          <div className="bg-blue-50 p-3 rounded-lg text-sm">
            <p className="font-medium mb-1">Matching Algorithm:</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• 50% Personality Traits (e.g., strategic thinkers)</li>
              <li>• 30% Core Values (e.g., growth mindset)</li>
              <li>• 20% Shared Interests & Skills</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">
            Suggested Matches ({matches.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matches.map((match, idx) => (
              <Card key={idx} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        Learning Partner #{idx + 1}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        {match.role === 'mentor' && <Badge variant="default">Mentor</Badge>}
                        {match.role === 'peer' && <Badge variant="secondary">Peer</Badge>}
                        {match.role === 'learner' && <Badge variant="outline">Learner</Badge>}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {match.match_score.toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">Match</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={match.match_score} className="h-2" />

                  <div className="space-y-2">
                    {match.shared_traits.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Shared Traits:</p>
                        <div className="flex flex-wrap gap-1">
                          {match.shared_traits.slice(0, 3).map((trait, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {match.shared_values.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">Shared Values:</p>
                        <div className="flex flex-wrap gap-1">
                          {match.shared_values.slice(0, 3).map((value, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {value}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => sendMatchRequest(match.user_id)}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      Connect
                    </Button>
                    <Button size="sm" variant="outline">
                      <Target className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground italic">
                    "I get your goal—pair with synergistic traits for mutual mastery"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {matches.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No matches found yet. Select a skill and search for learning partners!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
