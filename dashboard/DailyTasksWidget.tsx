import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Heart, Users, Sparkles, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { format, isToday } from 'date-fns';
import { toast } from 'sonner';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  emoji: string;
  completed: boolean;
  mode?: 'self' | 'friend' | 'lover';
  linkedModule?: 'matcher' | 'learnstar' | 'community';
  linkedGoalId?: string;
  linkedSkill?: string;
}

export function DailyTasksWidget() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiComment, setAiComment] = useState<string>('');
  const [enabledModules, setEnabledModules] = useState<any>({});
  const [unlocked, setUnlocked] = useState(false);
  const [journalCount, setJournalCount] = useState(0);

  useEffect(() => {
    if (user) {
      checkUnlockStatus();
      loadEnabledModules();
      loadDailyTasks();
    }
  }, [user]);

  const checkUnlockStatus = async () => {
    if (!user) return;

    try {
      // Check journal entries count (need 7+ for unlock)
      const { data: journals } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user.id);

      const count = journals?.length || 0;
      setJournalCount(count);
      setUnlocked(count >= 7);
    } catch (error) {
      console.error('Error checking unlock status:', error);
    }
  };

  const loadEnabledModules = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('user_settings')
        .select('modules_enabled')
        .eq('user_id', user.id)
        .single();

      if (data?.modules_enabled) {
        setEnabledModules(data.modules_enabled);
      }
    } catch (error) {
      console.error('Error loading enabled modules:', error);
    }
  };

  const loadDailyTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get tasks from YOU section (tasks table)
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: youTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('task_date', today);

      // Get personality for mode-specific filtering
      const { data: personality } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Generate mode-specific tasks based on personality
      const dailyTasks: DailyTask[] = [];

      // Add tasks from YOU section
      if (youTasks) {
        youTasks.forEach((task) => {
          dailyTasks.push({
            id: task.id,
            title: task.title,
            description: task.description || '',
            emoji: task.emoji || '📝',
            completed: task.completed,
            linkedGoalId: task.linked_goal_id,
          });
        });
      }

      // Add mode-specific recurring tasks
      const recurringTasks = generateRecurringTasks(personality);
      dailyTasks.push(...recurringTasks);

      setTasks(dailyTasks);

      // Generate AI comment
      if (dailyTasks.length > 0) {
        await generateAIComment(dailyTasks, personality);
      }
    } catch (error) {
      console.error('Error loading daily tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateRecurringTasks = (personality: any): DailyTask[] => {
    const recurringTasks: DailyTask[] = [];
    const isIntroverted = personality?.trait_extraversion < 50;

    // Self mode tasks (always available)
    recurringTasks.push({
      id: 'self-reflection',
      title: 'Daily Self-Reflection',
      description: isIntroverted
        ? 'Solo journaling session - capture your inner thoughts'
        : 'Express yourself - log wins and struggles',
      emoji: '✨',
      completed: false,
      mode: 'self',
    });

    // Friend mode tasks (if enabled)
    if (enabledModules.matcher || enabledModules.community) {
      recurringTasks.push({
        id: 'friend-checkin',
        title: 'Team Check-In',
        description: 'Connect with your platonic bonds - loyalty check',
        emoji: '👥',
        completed: false,
        mode: 'friend',
        linkedModule: 'matcher',
      });
    }

    // Lover mode tasks (if enabled)
    if (enabledModules.matcher) {
      recurringTasks.push({
        id: 'lover-commitment',
        title: 'Daily Commitment Ritual',
        description: 'Strengthen sacred bond - share gratitude',
        emoji: '💖',
        completed: false,
        mode: 'lover',
        linkedModule: 'matcher',
      });
    }

    // LearnStar tasks (if enabled)
    if (enabledModules.learnstar) {
      recurringTasks.push({
        id: 'skill-practice',
        title: 'Skill Practice Session',
        description: isIntroverted
          ? 'Focused solo practice - deepen mastery'
          : 'Engage with learning community - share progress',
        emoji: '🎯',
        completed: false,
        mode: 'friend',
        linkedModule: 'learnstar',
      });
    }

    return recurringTasks;
  };

  const generateAIComment = async (tasks: DailyTask[], personality: any) => {
    const apiKey = import.meta.env.VITE_XAI_API_KEY;
    if (!apiKey) {
      setAiComment('I get your goal today — build with these steps.');
      return;
    }

    const activeTasks = tasks.filter(t => !t.completed);
    const activeModules = Object.keys(enabledModules).filter(k => enabledModules[k]);

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are Grok, an empathetic AI coach. Provide brief, motivating comments on daily tasks using "I get your..." phrasing. Be encouraging and reference only active features.',
            },
            {
              role: 'user',
              content: `Active modules: ${activeModules.join(', ') || 'core only'}. Today's tasks: ${activeTasks.map(t => t.title).join(', ')}. Personality: ${personality?.trait_extraversion < 50 ? 'introverted' : 'extroverted'}. Give 1 sentence encouragement.`,
            },
          ],
          model: 'grok-beta',
          temperature: 0.8,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        setAiComment(content || 'I get your goal today — build with these steps.');
      } else {
        setAiComment('I get your goal today — build with these steps.');
      }
    } catch (error) {
      console.error('Error generating AI comment:', error);
      setAiComment('I get your goal today — build with these steps.');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    if (!user) return;

    // Update local state immediately
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));

    // Update in database if it's a real task (not recurring template)
    if (taskId.startsWith('self-') || taskId.startsWith('friend-') || taskId.startsWith('lover-') || taskId.startsWith('skill-')) {
      // These are recurring templates, just update local state
      toast.success('Task updated! 🎯');
      return;
    }

    try {
      const task = tasks.find(t => t.id === taskId);
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task?.completed })
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success(task?.completed ? 'Task reopened!' : 'Task completed! 🎯');
    } catch (error: any) {
      console.error('Error toggling task:', error);
      toast.error('Failed to update task');
      // Revert on error
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ));
    }
  };

  const getModeIcon = (mode?: string) => {
    switch (mode) {
      case 'lover':
        return <Heart className="h-4 w-4 text-pink-400" />;
      case 'friend':
        return <Users className="h-4 w-4 text-blue-400" />;
      case 'self':
        return <Sparkles className="h-4 w-4 text-purple-400" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-400" />;
    }
  };

  if (!unlocked) {
    return (
      <Card className="bg-[#1e1e1e] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-purple-400" />
            DAILY TASKS
          </CardTitle>
          <CardDescription className="text-gray-400">
            Unlock by journaling 7+ days ({journalCount}/7 complete)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-gray-400 mb-2">Daily rituals for enduring growth — earn your day.</p>
            <p className="text-sm text-gray-500">Complete {7 - journalCount} more journal entries to unlock.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-[#1e1e1e] border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-purple-400" />
            DAILY TASKS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-400">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;

  return (
    <Card className="bg-[#1e1e1e] border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="h-5 w-5 text-purple-400" />
              DAILY TASKS
            </CardTitle>
            <CardDescription className="text-gray-400">
              {completedCount} of {totalCount} completed today
            </CardDescription>
          </div>
          {completedCount === totalCount && totalCount > 0 && (
            <Badge className="bg-gradient-to-r from-green-600 to-blue-600">
              All Done! 🎉
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Empathy Comment */}
        {aiComment && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-purple-400 mt-0.5" />
              <p className="text-sm text-gray-300 italic">{aiComment}</p>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No tasks for today. Check back tomorrow! 🌟</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                  task.completed
                    ? 'bg-green-500/5 border-green-500/30'
                    : 'bg-[#121212] border-gray-700 hover:border-purple-500/50'
                }`}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => handleToggleTask(task.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xl">{task.emoji}</span>
                    <span
                      className={`font-semibold text-sm ${
                        task.completed ? 'line-through text-gray-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </span>
                    {getModeIcon(task.mode)}
                    {task.linkedModule && (
                      <Badge variant="outline" className="text-xs">
                        {task.linkedModule}
                      </Badge>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      task.completed ? 'text-gray-600' : 'text-gray-400'
                    }`}
                  >
                    {task.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {tasks.length > 0 && (
          <div className="pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Daily Progress
              </span>
              <span className="text-sm font-semibold text-purple-400">
                {Math.round((completedCount / totalCount) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[#121212] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
