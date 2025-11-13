import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendingUp, Users, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import { ModernAIResponses } from '../../lib/ai/modernLanguage';
import { format, differenceInDays, addDays } from 'date-fns';

interface GrowthArc {
  id: string;
  user_id: string;
  area: string;
  start_date: string;
  target_date: string;
  predicted_mastery_days: number;
  current_progress: number;
  milestones: Array<{
    name: string;
    target_date: string;
    completed: boolean;
  }>;
  bond_suggestions: string[];
  created_at: string;
}

export function GrowthArcs() {
  const { user } = useAuth();
  const [arcs, setArcs] = useState<GrowthArc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newArcArea, setNewArcArea] = useState('');

  useEffect(() => {
    if (user) {
      loadGrowthArcs();
    }
  }, [user]);

  const loadGrowthArcs = async () => {
    try {
      const { data, error } = await supabase
        .from('growth_arcs')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArcs(data || []);
    } catch (error) {
      console.error('Error loading growth arcs:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateGrowthArc = async (area: string) => {
    try {
      // Get user's journal and KPI data for prediction
      const [journalData, kpiData] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user?.id)
          .order('date', { ascending: false })
          .limit(30),
        supabase
          .from('skill_metrics')
          .select('*')
          .eq('user_id', user?.id)
          .eq('skill_name', area)
          .maybeSingle()
      ]);

      // Analyze consistency and predict mastery timeline
      const journalEntries = journalData.data || [];
      const daysActive = journalEntries.length;
      const avgProgress = kpiData.data?.current_value || 0;

      // Simple prediction: Based on current progress and consistency
      const predictedDays = daysActive > 0
        ? Math.max(30, Math.floor((100 - avgProgress) / (avgProgress / daysActive) * 1.5))
        : 90;

      const startDate = new Date();
      const targetDate = addDays(startDate, predictedDays);

      // Generate milestones
      const milestones = [
        {
          name: `Foundation: Grasp ${area} basics`,
          target_date: addDays(startDate, Math.floor(predictedDays * 0.25)).toISOString(),
          completed: avgProgress >= 25
        },
        {
          name: `Development: Build ${area} skills`,
          target_date: addDays(startDate, Math.floor(predictedDays * 0.5)).toISOString(),
          completed: avgProgress >= 50
        },
        {
          name: `Refinement: Master ${area} techniques`,
          target_date: addDays(startDate, Math.floor(predictedDays * 0.75)).toISOString(),
          completed: avgProgress >= 75
        },
        {
          name: `Mastery: Excel at ${area}`,
          target_date: targetDate.toISOString(),
          completed: avgProgress >= 100
        }
      ];

      // Generate bond suggestions
      const bondSuggestions = [
        `Partner with a Friend-mode bond to practice ${area} together`,
        `Find a Lover-mode bond who shares your ${area} journey for mutual growth`,
        `Join a LearnStar group focused on ${area} for community support`
      ];

      // Save growth arc
      const { data, error } = await supabase
        .from('growth_arcs')
        .insert({
          user_id: user?.id,
          area,
          start_date: startDate.toISOString(),
          target_date: targetDate.toISOString(),
          predicted_mastery_days: predictedDays,
          current_progress: avgProgress,
          milestones,
          bond_suggestions: bondSuggestions
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        `Growth arc created! Based on your trends, mastery in ${predictedDays} days – track it and build on it!`
      );
      loadGrowthArcs();
      setShowCreateForm(false);
      setNewArcArea('');
    } catch (error: any) {
      toast.error('Failed to create growth arc: ' + error.message);
    }
  };

  const deleteArc = async (arcId: string) => {
    try {
      const { error } = await supabase
        .from('growth_arcs')
        .delete()
        .eq('id', arcId);

      if (error) throw error;
      toast.success('Growth arc removed');
      loadGrowthArcs();
    } catch (error: any) {
      toast.error('Failed to delete arc: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading growth data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">GROWTH ARCS</h2>
        <p className="text-muted-foreground">
          Track your journey with predictions, timelines, and bond integrations
        </p>
      </div>

      {/* Create New Arc */}
      {!showCreateForm ? (
        <Button
          onClick={() => setShowCreateForm(true)}
          className="w-full"
          variant="outline"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Create New Growth Arc
        </Button>
      ) : (
        <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-300/30">
          <CardHeader>
            <CardTitle>New Growth Arc</CardTitle>
            <CardDescription>
              What skill or area do you want to master?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="e.g., Chess, Leadership, Coding"
                value={newArcArea}
                onChange={(e) => setNewArcArea(e.target.value)}
                className="w-full p-3 border rounded-lg"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => generateGrowthArc(newArcArea)}
                  disabled={!newArcArea.trim()}
                  className="flex-1"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Arc
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewArcArea('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Arcs List */}
      {arcs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No growth arcs yet. Create your first arc to track your journey to mastery!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {arcs.map((arc) => {
            const daysRemaining = differenceInDays(new Date(arc.target_date), new Date());
            const completedMilestones = arc.milestones.filter(m => m.completed).length;
            const totalMilestones = arc.milestones.length;

            return (
              <Card key={arc.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-500" />
                        {arc.area}
                      </CardTitle>
                      <CardDescription>
                        {daysRemaining > 0
                          ? `${daysRemaining} days to mastery`
                          : 'Target date reached!'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteArc(arc.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-semibold">Progress</span>
                      <span className="text-muted-foreground">
                        {completedMilestones}/{totalMilestones} milestones
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${(completedMilestones / totalMilestones) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Timeline Milestones */}
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Timeline
                    </h4>
                    <div className="space-y-2">
                      {arc.milestones.map((milestone, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div
                            className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
                              milestone.completed
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {milestone.completed ? '✓' : idx + 1}
                          </div>
                          <div className="flex-1 text-sm">
                            <div className={milestone.completed ? 'line-through text-muted-foreground' : ''}>
                              {milestone.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(milestone.target_date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bond Suggestions */}
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Shared Growth Rituals
                    </h4>
                    <ul className="space-y-1">
                      {arc.bond_suggestions?.map((suggestion, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
