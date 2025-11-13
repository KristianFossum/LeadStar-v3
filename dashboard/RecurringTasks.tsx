import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Heart, Users, Sparkles } from 'lucide-react';
import type { RecurringTask } from '../../types/dashboard';
import { differenceInDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface RecurringTasksProps {
  tasks: RecurringTask[];
  onToggleTask: (taskId: string) => void;
  onResetWeeklyTasks: () => void;
}

export function RecurringTasks({
  tasks,
  onToggleTask,
  onResetWeeklyTasks,
}: RecurringTasksProps) {
  const { user } = useAuth();
  const [enabledModules, setEnabledModules] = useState<any>({});

  useEffect(() => {
    if (user) {
      loadEnabledModules();
    }
  }, [user]);

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

  // Filter tasks based on enabled modules
  const filteredTasks = tasks.filter((task) => {
    if (!task.requiredModule) return true;
    return enabledModules[task.requiredModule] === true;
  });

  const weeklyTasks = filteredTasks.filter((t) => t.frequency === 'weekly');
  const completedCount = weeklyTasks.filter((t) => t.completed).length;
  const totalCount = weeklyTasks.length;

  const shouldShowReset = () => {
    const lastReset = weeklyTasks[0]?.lastReset;
    if (!lastReset) return false;
    return differenceInDays(new Date(), new Date(lastReset)) >= 7;
  };

  const getFrequencyColor = (frequency: RecurringTask['frequency']) => {
    switch (frequency) {
      case 'daily':
        return 'bg-blue-500';
      case 'weekly':
        return 'bg-green-500';
      case 'monthly':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getModeIcon = (description: string) => {
    if (description.toLowerCase().includes('lover') || description.toLowerCase().includes('commitment') || description.toLowerCase().includes('bond check')) {
      return <Heart className="h-4 w-4 text-pink-500" />;
    }
    if (description.toLowerCase().includes('friend') || description.toLowerCase().includes('team') || description.toLowerCase().includes('platonic')) {
      return <Users className="h-4 w-4 text-blue-500" />;
    }
    if (description.toLowerCase().includes('self') || description.toLowerCase().includes('reflection')) {
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>RECURRING TASKS</CardTitle>
            <CardDescription>
              {completedCount} of {totalCount} weekly tasks completed
            </CardDescription>
          </div>
          {shouldShowReset() && (
            <Button onClick={onResetWeeklyTasks} variant="outline" size="sm">
              Reset Weekly Tasks
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <Checkbox
                id={task.id}
                checked={task.completed}
                onCheckedChange={() => onToggleTask(task.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <label
                    htmlFor={task.id}
                    className={`text-sm font-medium cursor-pointer ${
                      task.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {task.title}
                  </label>
                  <Badge className={getFrequencyColor(task.frequency)}>
                    {task.frequency}
                  </Badge>
                  {task.isOptional && (
                    <Badge variant="outline" className="text-xs">
                      optional
                    </Badge>
                  )}
                  {getModeIcon(task.description)}
                </div>
                <p
                  className={`text-sm text-muted-foreground ${
                    task.completed ? 'line-through' : ''
                  }`}
                >
                  {task.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
