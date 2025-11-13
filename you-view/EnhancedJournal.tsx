import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { BookOpen, Plus, X, Save, Clock, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { awardXP, updateStreak, XP_REWARDS } from '../../lib/gamification';
import { triggerLevelUpConfetti, triggerBadgeUnlockConfetti, triggerStreakConfetti } from '../../lib/confetti';
import type { EnhancedJournalEntry } from '../../types/you-view';

interface EnhancedJournalProps {
  entries: EnhancedJournalEntry[];
  onAddEntry: (entry: Omit<EnhancedJournalEntry, 'id'>) => void;
  onFeedToAnalyzer?: (entry: EnhancedJournalEntry) => void;
}

const moodOptions = [
  { value: 'excellent', emoji: '🌟', label: 'Excellent' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'challenging', emoji: '😕', label: 'Challenging' },
  { value: 'difficult', emoji: '😔', label: 'Difficult' },
] as const;

export function EnhancedJournal({ entries, onAddEntry, onFeedToAnalyzer }: EnhancedJournalProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [currentWin, setCurrentWin] = useState('');
  const [currentStruggle, setCurrentStruggle] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadedEntries, setLoadedEntries] = useState<EnhancedJournalEntry[]>([]);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    wins: [] as string[],
    struggles: [] as string[],
    mood: 'good' as EnhancedJournalEntry['mood'],
    moodEmoji: '😊',
    reflections: '',
    skillNotes: '',
  });
  const [grokEmpathy, setGrokEmpathy] = useState<string>('');
  const [loadingEmpathy, setLoadingEmpathy] = useState(false);

  useEffect(() => {
    if (user) {
      loadEntries();
    }
  }, [user]);

  useEffect(() => {
    if (isAdding) {
      const timer = setTimeout(() => {
        setLastSaved(new Date());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, isAdding]);

  const loadEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const entries: EnhancedJournalEntry[] = data.map((entry) => ({
        id: entry.id,
        date: new Date(entry.date),
        wins: entry.wins || [],
        struggles: entry.struggles || [],
        mood: entry.mood as EnhancedJournalEntry['mood'],
        moodEmoji: entry.mood_emoji,
        reflections: entry.reflections || '',
        autoSaved: entry.auto_saved || false,
        lastSaved: entry.last_saved ? new Date(entry.last_saved) : undefined,
      }));

      setLoadedEntries(entries);
    } catch (error) {
      console.error('Error loading entries:', error);
      toast.error('Failed to load journal entries');
    }
  };

  const handleAddWin = () => {
    if (currentWin.trim()) {
      setFormData({ ...formData, wins: [...formData.wins, currentWin.trim()] });
      setCurrentWin('');
    }
  };

  const handleAddStruggle = () => {
    if (currentStruggle.trim()) {
      setFormData({ ...formData, struggles: [...formData.struggles, currentStruggle.trim()] });
      setCurrentStruggle('');
    }
  };

  const handleRemoveWin = (index: number) => {
    setFormData({ ...formData, wins: formData.wins.filter((_, i) => i !== index) });
  };

  const handleRemoveStruggle = (index: number) => {
    setFormData({ ...formData, struggles: formData.struggles.filter((_, i) => i !== index) });
  };

  const handleMoodSelect = (mood: EnhancedJournalEntry['mood'], emoji: string) => {
    setFormData({ ...formData, mood, moodEmoji: emoji });
  };

  const handleSubmit = () => {
    if (formData.wins.length > 0 || formData.struggles.length > 0 || formData.reflections) {
      onAddEntry({
        date: new Date(),
        wins: formData.wins,
        struggles: formData.struggles,
        mood: formData.mood,
        moodEmoji: formData.moodEmoji,
        reflections: formData.reflections,
        autoSaved: true,
        lastSaved: new Date(),
      });
      setFormData({
        wins: [],
        struggles: [],
        mood: 'good',
        moodEmoji: '😊',
        reflections: '',
        skillNotes: '',
      });
      setIsAdding(false);
      setLastSaved(null);
    }
  };

  const getGrokEmpathy = async () => {
    if (!formData.mood || formData.mood === 'good' || formData.mood === 'excellent') {
      return; // Only provide empathy for challenging/difficult/neutral moods
    }

    setLoadingEmpathy(true);
    try {
      const moodContext = {
        mood: formData.mood,
        struggles: formData.struggles,
        reflections: formData.reflections
      };

      const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
      const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

      if (!XAI_API_KEY) {
        setGrokEmpathy('I hear your struggle. Remember, challenges are growth opportunities. Take it one step at a time.');
        return;
      }

      const response = await fetch(XAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: `You are a deeply empathetic AI coach for LeadStar. When a user shares struggles or challenging emotions, respond with genuine empathy and actionable resilience-building steps. Keep responses to 2-3 sentences. Focus on: "I grok your struggle; here's how to build resilience." Be warm, understanding, and actionable.`
            },
            {
              role: 'user',
              content: `My mood is ${moodContext.mood}. My struggles: ${moodContext.struggles.join(', ')}. My reflections: ${moodContext.reflections}`
            }
          ],
          temperature: 0.8,
        })
      });

      const data = await response.json();
      setGrokEmpathy(data.choices?.[0]?.message?.content || 'I grok your struggle. Keep building resilience.');
    } catch (error) {
      console.error('Error getting Grok empathy:', error);
    } finally {
      setLoadingEmpathy(false);
    }
  };

  const handleSaveToSupabase = async () => {
    if (!user) {
      toast.error('You must be logged in to save entries');
      return;
    }

    if (!formData.wins.length && !formData.struggles.length && !formData.reflections) {
      toast.error('Please add some content before saving');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: user.id,
          date: new Date().toISOString(),
          wins: formData.wins,
          struggles: formData.struggles,
          mood: formData.mood,
          mood_emoji: formData.moodEmoji,
          reflections: formData.reflections,
          skill_notes: formData.skillNotes,
          auto_saved: false,
          last_saved: new Date().toISOString(),
        })
        .select();

      if (error) throw error;

      // Award XP and update streak
      const xpResult = await awardXP(user.id, XP_REWARDS.JOURNAL_SUBMIT, 'journal');
      const streakResult = await updateStreak(user.id);

      // Show toast with XP earned
      if (xpResult.success) {
        if (xpResult.leveledUp) {
          triggerLevelUpConfetti();
          toast.success(`Level ${xpResult.newLevel} Unlocked! Keep shining! 🎉`, {
            duration: 4000,
          });
        } else {
          toast.success(`Journal saved! +${XP_REWARDS.JOURNAL_SUBMIT} XP earned! 🌟`);
        }

        // Show badge unlock toast if earned
        if (xpResult.unlockedBadge) {
          setTimeout(() => {
            triggerBadgeUnlockConfetti();
            toast.success(`🎖️ Badge Unlocked: ${xpResult.unlockedBadge!.emoji} ${xpResult.unlockedBadge!.name}`, {
              duration: 4000,
            });
          }, 500);
        }
      }

      // Show streak badge if unlocked
      if (streakResult.unlockedBadge) {
        setTimeout(() => {
          triggerStreakConfetti();
          toast.success(`🔥 Badge Unlocked: ${streakResult.unlockedBadge!.emoji} ${streakResult.unlockedBadge!.name}`, {
            duration: 4000,
          });
        }, 1000);
      }

      // Reset form
      setFormData({
        wins: [],
        struggles: [],
        mood: 'good',
        moodEmoji: '😊',
        reflections: '',
        skillNotes: '',
      });
      setIsAdding(false);
      setLastSaved(null);

      // Get Grok empathy based on mood
      await getGrokEmpathy();

      // Reload entries
      await loadEntries();
    } catch (error: any) {
      console.error('Error saving to Supabase:', error);
      toast.error(error.message || 'Failed to save journal entry');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEntryExpanded = (entryId: string) => {
    setExpandedEntries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Daily Journal
            </CardTitle>
            <CardDescription>
              Track your wins, struggles, and reflections
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Entry
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isAdding ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>How are you feeling today?</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {moodOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={formData.mood === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleMoodSelect(option.value, option.emoji)}
                      className="gap-2"
                    >
                      <span className="text-lg">{option.emoji}</span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="wins">Today's Wins 🎉</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="wins"
                    placeholder="What went well today?"
                    value={currentWin}
                    onChange={(e) => setCurrentWin(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddWin();
                      }
                    }}
                  />
                  <Button onClick={handleAddWin} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.wins.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.wins.map((win, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between bg-green-50 dark:bg-green-950 p-2 rounded"
                      >
                        <span className="text-sm flex-1">{win}</span>
                        <button onClick={() => handleRemoveWin(index)}>
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="struggles">Today's Challenges 💪</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="struggles"
                    placeholder="What was challenging?"
                    value={currentStruggle}
                    onChange={(e) => setCurrentStruggle(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddStruggle();
                      }
                    }}
                  />
                  <Button onClick={handleAddStruggle} size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.struggles.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.struggles.map((struggle, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between bg-orange-50 dark:bg-orange-950 p-2 rounded"
                      >
                        <span className="text-sm flex-1">{struggle}</span>
                        <button onClick={() => handleRemoveStruggle(index)}>
                          <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="reflections">Reflections & Thoughts</Label>
                <Textarea
                  id="reflections"
                  placeholder="What are you thinking about? How do these connect to your goals?"
                  value={formData.reflections}
                  onChange={(e) => setFormData({ ...formData, reflections: e.target.value })}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="skillNotes">Skills Practiced Today 🎯</Label>
                <Textarea
                  id="skillNotes"
                  placeholder="What skills did you work on? (e.g., practiced chess openings, gave team presentation)"
                  value={formData.skillNotes}
                  onChange={(e) => setFormData({ ...formData, skillNotes: e.target.value })}
                  rows={2}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Track skills here to unlock LearnStar groups and skill-based matching
                </p>
              </div>

              {(formData.mood === 'challenging' || formData.mood === 'difficult' || formData.mood === 'neutral') && formData.struggles.length > 0 && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={getGrokEmpathy}
                    disabled={loadingEmpathy}
                    className="w-full"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {loadingEmpathy ? 'Grokking your feelings...' : 'Get Empathetic Support'}
                  </Button>
                </div>
              )}

              {grokEmpathy && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Brain className="h-4 w-4" />
                    Grok's Empathetic Response
                  </p>
                  <p className="text-sm text-muted-foreground">{grokEmpathy}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {lastSaved && (
                  <>
                    <Clock className="h-4 w-4" />
                    Auto-saved {format(lastSaved, 'h:mm a')}
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveToSupabase} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Journal'}
                </Button>
                {onFeedToAnalyzer && (formData.wins.length > 0 || formData.struggles.length > 0 || formData.reflections) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const tempEntry: EnhancedJournalEntry = {
                        id: 'temp',
                        date: new Date(),
                        wins: formData.wins,
                        struggles: formData.struggles,
                        mood: formData.mood,
                        moodEmoji: formData.moodEmoji,
                        reflections: formData.reflections,
                        autoSaved: false,
                        lastSaved: new Date(),
                      };
                      onFeedToAnalyzer(tempEntry);
                    }}
                    className="border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Feed to Analyzer
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {loadedEntries.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No journal entries yet. Start your first entry today!</p>
                </div>
              ) : (
                loadedEntries.map((entry) => {
                  const isExpanded = expandedEntries.has(entry.id);
                  const hasContent = entry.wins.length > 0 || entry.struggles.length > 0 || entry.reflections;

                  return (
                    <Card key={entry.id} className="transition-all hover:shadow-md">
                      <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleEntryExpanded(entry.id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xl">
                              {entry.moodEmoji}
                            </Badge>
                            <div>
                              <CardTitle className="text-base">
                                {format(entry.date, 'EEEE, MMMM d, yyyy')}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {entry.wins.length} wins • {entry.struggles.length} challenges
                              </CardDescription>
                            </div>
                          </div>
                          {hasContent && (
                            isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </CardHeader>
                      {isExpanded && (
                        <CardContent className="space-y-3">
                          {entry.wins.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                                Wins 🎉
                              </h4>
                              <div className="space-y-1.5">
                                {entry.wins.map((win, i) => (
                                  <div key={i} className="flex items-start gap-2 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                                    <span className="text-green-600 mt-0.5">✓</span>
                                    <span className="text-sm">{win}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {entry.struggles.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                                Challenges 💪
                              </h4>
                              <div className="space-y-1.5">
                                {entry.struggles.map((struggle, i) => (
                                  <div key={i} className="flex items-start gap-2 bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                                    <span className="text-orange-600 mt-0.5">→</span>
                                    <span className="text-sm">{struggle}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {entry.reflections && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Reflections</h4>
                              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded">
                                {entry.reflections}
                              </p>
                            </div>
                          )}
                          {onFeedToAnalyzer && (
                            <div className="pt-3 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onFeedToAnalyzer(entry)}
                                className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                              >
                                <Brain className="h-4 w-4 mr-2" />
                                Analyze with AI
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
