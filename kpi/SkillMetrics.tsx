import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Plus, TrendingUp, Users, Target, X, Sparkles, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackSkillProgress } from '../../lib/unlockSystem';
import { generateKPITrendImage } from '../../lib/ai/image-generation';
import { ImageConsentDialog, useImageConsent } from '../ui/image-consent-dialog';

interface SkillMetric {
  id: string;
  skill_name: string;
  current_value: number;
  target_value: number;
  unit: string;
  history: { date: string; value: number }[];
  bond_id: string | null;
  created_at: string;
  updated_at: string;
}

export function SkillMetrics() {
  const { user } = useAuth();
  const { hasConsent } = useImageConsent();
  const [skills, setSkills] = useState<SkillMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newSkill, setNewSkill] = useState({
    name: '',
    current: 0,
    target: 100,
    unit: 'percent'
  });
  const [aiComment, setAIComment] = useState<Record<string, string>>({});
  const [generatingImage, setGeneratingImage] = useState<string | null>(null);
  const [trendImages, setTrendImages] = useState<Record<string, string>>({});
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [selectedSkillForImage, setSelectedSkillForImage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSkills();
    }
  }, [user]);

  const loadSkills = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_metrics')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSkills(data || []);

      // Generate AI comments for each skill
      if (data && data.length > 0) {
        generateAIComments(data);
      }
    } catch (error) {
      console.error('Error loading skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIComments = async (skillData: SkillMetric[]) => {
    const apiKey = import.meta.env.VITE_XAI_API_KEY;
    if (!apiKey) {
      // Fallback comments with modern language
      const fallback: Record<string, string> = {};
      skillData.forEach(skill => {
        if (skill.current_value >= skill.target_value * 0.8) {
          fallback[skill.id] = `Excellent progress in ${skill.skill_name}! Consider pairing with a peer to reach mastery faster.`;
        } else if (skill.current_value >= skill.target_value * 0.5) {
          fallback[skill.id] = `Steady progress in ${skill.skill_name}. Keep building momentum!`;
        } else {
          fallback[skill.id] = `I get your ${skill.skill_name} goal—consistent practice builds excellence.`;
        }
      });
      setAIComment(fallback);
      return;
    }

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: 'You are an empathetic skill coach. Give brief (1 sentence), encouraging comments on skill progress. Use modern, conversational language (say "I get your..." not "I grok thy..."). Keep "grok" for empathy but make it approachable. Suggest pairing with peers for collaborative learning when relevant.'
            },
            {
              role: 'user',
              content: `Skill metrics: ${JSON.stringify(skillData.map(s => ({
                skill: s.skill_name,
                progress: s.current_value,
                target: s.target_value,
                is_shared: !!s.bond_id
              })))}. Provide one encouraging comment per skill.`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const comment = data.choices[0]?.message?.content || '';
        // Parse comments (simple approach: assume one comment per line)
        const lines = comment.split('\n').filter(l => l.trim());
        const comments: Record<string, string> = {};
        skillData.forEach((skill, idx) => {
          if (lines[idx]) {
            comments[skill.id] = lines[idx].replace(/^\d+\.\s*/, '').trim();
          }
        });
        setAIComment(comments);
      }
    } catch (error) {
      console.error('Error generating AI comments:', error);
    }
  };

  const addSkill = async () => {
    if (!newSkill.name.trim()) {
      toast.error('Skill name required');
      return;
    }

    try {
      await trackSkillProgress(
        user!.id,
        newSkill.name,
        newSkill.current
      );

      // Also create the metric record
      const { error } = await supabase
        .from('skill_metrics')
        .insert({
          user_id: user?.id,
          skill_name: newSkill.name,
          current_value: newSkill.current,
          target_value: newSkill.target,
          unit: newSkill.unit,
          history: [{ date: new Date().toISOString(), value: newSkill.current }]
        });

      if (error) throw error;
      toast.success('Skill metric added!');
      setShowAdd(false);
      setNewSkill({ name: '', current: 0, target: 100, unit: 'percent' });
      loadSkills();
    } catch (error: any) {
      toast.error('Failed to add skill: ' + error.message);
    }
  };

  const updateSkill = async (skillId: string, newValue: number) => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill) return;

    try {
      await trackSkillProgress(
        user!.id,
        skill.skill_name,
        newValue,
        skill.bond_id || undefined
      );

      toast.success('Progress updated!');
      loadSkills();
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    }
  };

  const deleteSkill = async (skillId: string) => {
    try {
      const { error } = await supabase
        .from('skill_metrics')
        .delete()
        .eq('id', skillId);

      if (error) throw error;
      toast.success('Skill metric removed');
      loadSkills();
    } catch (error: any) {
      toast.error('Failed to delete: ' + error.message);
    }
  };

  const getProgressColor = (current: number, target: number): string => {
    const percent = (current / target) * 100;
    if (percent >= 80) return 'bg-green-500';
    if (percent >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const handleGenerateTrendImage = (skillId: string) => {
    setSelectedSkillForImage(skillId);
    if (hasConsent()) {
      generateTrendImage(skillId);
    } else {
      setShowConsentDialog(true);
    }
  };

  const generateTrendImage = async (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill || !user) return;

    setGeneratingImage(skillId);
    try {
      // Build KPI description
      const progressPercent = (skill.current_value / skill.target_value) * 100;
      const trend = skill.history.length >= 2
        ? skill.history[skill.history.length - 1].value > skill.history[skill.history.length - 2].value
          ? 'rising'
          : 'declining'
        : 'stable';

      const kpiDescription = `${skill.skill_name}: ${Math.round(progressPercent)}% complete, ${trend} trend from ${skill.current_value} to target ${skill.target_value} ${skill.unit}`;

      const result = await generateKPITrendImage(user.id, kpiDescription);

      if (result.success && result.images.length > 0) {
        setTrendImages(prev => ({ ...prev, [skillId]: result.images[0] }));
        toast.success('Artistic trend view generated!');
      } else {
        toast.error(result.error || 'Failed to generate visualization');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate trend visualization');
    } finally {
      setGeneratingImage(null);
    }
  };

  const downloadTrendImage = (skillId: string) => {
    const imageUrl = trendImages[skillId];
    if (!imageUrl) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `leadstar-kpi-trend-${skillId}.png`;
    link.click();
    toast.success('Image download started!');
  };

  if (loading) {
    return <div>Loading skill metrics...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Skill Mastery Tracker
              </CardTitle>
              <CardDescription>
                Track progress on skills you're learning and teaching
              </CardDescription>
            </div>
            <Button onClick={() => setShowAdd(!showAdd)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    placeholder="Skill name (e.g., Chess strategy)"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Current"
                    value={newSkill.current}
                    onChange={(e) => setNewSkill({ ...newSkill, current: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Target"
                    value={newSkill.target}
                    onChange={(e) => setNewSkill({ ...newSkill, target: parseFloat(e.target.value) || 100 })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addSkill} className="flex-1">Add Skill</Button>
                <Button onClick={() => setShowAdd(false)} variant="ghost">Cancel</Button>
              </div>
            </div>
          )}

          {skills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No skills tracked yet. Add your first skill to start!</p>
              <p className="text-sm mt-2">💡 Tracking skills unlocks LearnStar groups and skill-based matching</p>
            </div>
          ) : (
            <div className="space-y-4">
              {skills.map((skill) => {
                const progressPercent = (skill.current_value / skill.target_value) * 100;
                const trend = skill.history.length >= 2
                  ? skill.history[skill.history.length - 1].value > skill.history[skill.history.length - 2].value
                    ? 'up'
                    : 'down'
                  : 'stable';

                return (
                  <Card key={skill.id} className="relative">
                    <button
                      onClick={() => deleteSkill(skill.id)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/20 transition-colors"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between pr-6">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            {skill.skill_name}
                            {skill.bond_id && (
                              <Badge variant="outline" className="text-xs">
                                <Users className="h-3 w-3 mr-1" />
                                Shared
                              </Badge>
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {skill.current_value} / {skill.target_value} {skill.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                          {trend === 'down' && <TrendingUp className="h-5 w-5 text-red-500 rotate-180" />}
                          <Badge variant={progressPercent >= 80 ? 'default' : 'secondary'}>
                            {Math.round(progressPercent)}%
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <Progress
                          value={progressPercent}
                          className="h-2"
                        />
                      </div>

                      {aiComment[skill.id] && (
                        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded italic">
                          💬 {aiComment[skill.id]}
                        </div>
                      )}

                      {trendImages[skill.id] && (
                        <div className="relative rounded-lg overflow-hidden border">
                          <img
                            src={trendImages[skill.id]}
                            alt={`${skill.skill_name} trend visualization`}
                            className="w-full h-auto"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => downloadTrendImage(skill.id)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Update value"
                          className="h-8 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (!isNaN(value)) {
                                updateSkill(skill.id, value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const input = document.querySelector(`input[placeholder="Update value"]`) as HTMLInputElement;
                            if (input && input.value) {
                              const value = parseFloat(input.value);
                              if (!isNaN(value)) {
                                updateSkill(skill.id, value);
                                input.value = '';
                              }
                            }
                          }}
                        >
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGenerateTrendImage(skill.id)}
                          disabled={generatingImage === skill.id}
                          title="Generate artistic trend visualization"
                        >
                          {generatingImage === skill.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ImageConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConfirm={() => {
          if (selectedSkillForImage) {
            generateTrendImage(selectedSkillForImage);
          }
          setShowConsentDialog(false);
        }}
        onCancel={() => {
          setShowConsentDialog(false);
          setSelectedSkillForImage(null);
        }}
        title="Generate Artistic Trend View"
        description="Create a motivational visualization of your skill progress?"
        promptDescription="An artistic graph showing your KPI trend with inspirational elements"
        estimatedCost="$0.07"
      />
    </div>
  );
}
