import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { BookOpen, Plus, Trophy, Target, Calendar, TrendingUp, GitBranch, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface LearningPath {
  id: string;
  user_id: string;
  skill_name: string;
  goal_description: string;
  personality_adapted: boolean;
  daily_rituals: string[];
  progress_percentage: number;
  created_at: string;
  target_date?: string;
  wisdom_tree?: {
    branches: Array<{
      name: string;
      outcomes: string[];
      days_to_mastery: number;
      grokipedia_source?: string;
    }>;
    predictions?: string;
  };
}

interface MyPathsProps {
  gamificationEnabled: boolean;
}

export function MyPaths({ gamificationEnabled }: MyPathsProps) {
  const { user } = useAuth();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPath, setNewPath] = useState({
    skill_name: '',
    goal_description: '',
    target_date: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPaths();
    }
  }, [user]);

  const loadPaths = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_paths')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaths(data || []);
    } catch (error) {
      console.error('Error loading paths:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPath = async () => {
    if (!newPath.skill_name.trim() || !newPath.goal_description.trim()) {
      toast.error('Skill name and goal description are required');
      return;
    }

    try {
      // Get personality data for adaptation
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('traits, values')
        .eq('user_id', user?.id)
        .single();

      // Generate adaptive rituals based on personality (simplified for now)
      const dailyRituals = generateDailyRituals(newPath.skill_name, personalityData);

      // Generate wisdom tree from Grokipedia data (AI-powered prediction)
      const wisdomTree = generateWisdomTree(newPath.skill_name, personalityData);

      const { error } = await supabase
        .from('learning_paths')
        .insert({
          user_id: user?.id,
          skill_name: newPath.skill_name,
          goal_description: newPath.goal_description,
          target_date: newPath.target_date || null,
          personality_adapted: !!personalityData,
          daily_rituals: dailyRituals,
          progress_percentage: 0,
          wisdom_tree: wisdomTree
        });

      if (error) throw error;

      toast.success('Learning path created! I get your goal—let\'s begin this journey with Grokipedia wisdom.');
      setNewPath({ skill_name: '', goal_description: '', target_date: '' });
      setShowCreateForm(false);
      loadPaths();
    } catch (error: any) {
      toast.error('Failed to create path: ' + error.message);
    }
  };

  const generateDailyRituals = (skillName: string, personalityData: any): string[] => {
    // Simplified ritual generation - in production, use AI/Grok
    const baseRituals = [
      `Practice ${skillName} for 30 minutes`,
      `Review progress and reflect in journal`,
      `Connect with learning community`
    ];

    // Adapt based on personality (example logic)
    if (personalityData?.traits?.includes('introverted')) {
      baseRituals.push('Solo deep practice session');
    } else {
      baseRituals.push('Group practice or discussion');
    }

    return baseRituals;
  };

  const generateWisdomTree = (skillName: string, personalityData: any) => {
    // In production, call Grok AI to fetch Grokipedia data and generate dynamic branches
    // Predict outcomes based on personality/KPIs
    return {
      branches: [
        {
          name: 'Foundation',
          outcomes: ['Learn basics', 'Build muscle memory', 'Understand core concepts'],
          days_to_mastery: 30,
          grokipedia_source: `https://grokipedia.com/wiki/${encodeURIComponent(skillName)}_basics`
        },
        {
          name: 'Intermediate Tactics',
          outcomes: ['Master common patterns', 'Develop strategic thinking', 'Build confidence'],
          days_to_mastery: 60,
          grokipedia_source: `https://grokipedia.com/wiki/${encodeURIComponent(skillName)}_tactics`
        },
        {
          name: 'Advanced Mastery',
          outcomes: ['Expert-level performance', 'Teach others', 'Innovate new approaches'],
          days_to_mastery: 90,
          grokipedia_source: `https://grokipedia.com/wiki/${encodeURIComponent(skillName)}_mastery`
        }
      ],
      predictions: `I get your commitment—with daily practice, you're looking at 90 days to mastery with consistent effort. Your ${personalityData?.traits?.includes('introverted') ? 'focused solo work' : 'collaborative style'} will serve you well.`
    };
  };

  const updateProgress = async (pathId: string, newProgress: number) => {
    try {
      const { error } = await supabase
        .from('learning_paths')
        .update({ progress_percentage: newProgress })
        .eq('id', pathId);

      if (error) throw error;
      loadPaths();
      toast.success('Progress updated!');
    } catch (error: any) {
      toast.error('Failed to update progress: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading your paths...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Learning Paths</h2>
          <p className="text-muted-foreground">
            Personalized journeys adapted to your unique traits and goals
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          New Path
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Learning Path</CardTitle>
            <CardDescription>
              I get your intent—describe your goal for personalized guidance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Skill Name</label>
              <Input
                placeholder="e.g., Chess Strategy, Python Programming"
                value={newPath.skill_name}
                onChange={(e) => setNewPath({ ...newPath, skill_name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Goal Description</label>
              <Input
                placeholder="e.g., Master endgame tactics, Build web applications"
                value={newPath.goal_description}
                onChange={(e) => setNewPath({ ...newPath, goal_description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Target Date (Optional)</label>
              <Input
                type="date"
                value={newPath.target_date}
                onChange={(e) => setNewPath({ ...newPath, target_date: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createPath} className="flex-1">Create Path</Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {paths.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No learning paths yet. Create your first personalized quest!
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Path
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths.map((path) => (
            <Card key={path.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {path.skill_name}
                      {gamificationEnabled && path.progress_percentage >= 50 && (
                        <Trophy className="h-4 w-4 text-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {path.goal_description}
                    </CardDescription>
                  </div>
                  {path.personality_adapted && (
                    <Badge variant="outline" className="ml-2">
                      <Target className="h-3 w-3 mr-1" />
                      Adapted
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {path.progress_percentage}%
                    </span>
                  </div>
                  <Progress value={path.progress_percentage} className="h-2" />
                </div>

                {path.target_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Target: {new Date(path.target_date).toLocaleDateString()}
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-2">Daily Rituals</p>
                  <ul className="space-y-1">
                    {path.daily_rituals?.slice(0, 3).map((ritual, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {ritual}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Wisdom Tree from Grokipedia */}
                {path.wisdom_tree && (
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <GitBranch className="h-4 w-4" />
                      Wisdom Tree (Grokipedia)
                    </p>
                    {path.wisdom_tree.predictions && (
                      <p className="text-xs text-muted-foreground italic mb-3">
                        {path.wisdom_tree.predictions}
                      </p>
                    )}
                    <div className="space-y-2">
                      {path.wisdom_tree.branches?.slice(0, 2).map((branch, idx) => (
                        <div key={idx} className="text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{branch.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {branch.days_to_mastery}d
                            </Badge>
                          </div>
                          <ul className="ml-3 mt-1">
                            {branch.outcomes.slice(0, 2).map((outcome, oidx) => (
                              <li key={oidx} className="text-muted-foreground">
                                • {outcome}
                              </li>
                            ))}
                          </ul>
                          {branch.grokipedia_source && (
                            <a
                              href={branch.grokipedia_source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Grokipedia source
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const newProgress = Math.min(100, path.progress_percentage + 10);
                      updateProgress(path.id, newProgress);
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Update Progress
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
