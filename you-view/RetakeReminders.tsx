import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { RefreshCw, TrendingDown, Calendar, Bell, X } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

interface Reminder {
  id: string;
  reminder_type: 'personality_retake' | 'kpi_update' | 'ritual_prompt' | 'profile_refresh';
  message: string;
  trigger_condition: any;
  sent_at: string | null;
  dismissed_at: string | null;
}

export function RetakeReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showDismissed, setShowDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkReminders();
    }
  }, [user]);

  const checkReminders = async () => {
    try {
      // Check personality test age
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('updated_at, update_date')
        .eq('user_id', user?.id)
        .single();

      const lastUpdate = personalityData?.update_date || personalityData?.updated_at;
      if (lastUpdate) {
        const daysSince = differenceInDays(new Date(), new Date(lastUpdate));
        if (daysSince >= 30) {
          await createReminder(
            'personality_retake',
            `It's been ${daysSince} days since your last personality assessment. Retake to track your growth.`,
            { days_since_last: daysSince }
          );
        }
      }

      // Check KPI drops
      const { data: kpiData } = await supabase
        .from('kpi_metrics')
        .select('*')
        .eq('user_id', user?.id);

      kpiData?.forEach(async (kpi) => {
        if (kpi.trend === 'down' && kpi.history && kpi.history.length > 0) {
          const lastEntry = kpi.history[kpi.history.length - 1];
          const daysSinceUpdate = differenceInDays(new Date(), new Date(lastEntry.date));
          if (daysSinceUpdate >= 7) {
            await createReminder(
              'kpi_update',
              `Your "${kpi.name}" KPI is trending down. Time to update and refocus.`,
              { kpi_id: kpi.id, trend: 'down' }
            );
          }
        }
      });

      // Check profile freshness
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('updated_at')
        .eq('user_id', user?.id)
        .single();

      if (profileData?.updated_at) {
        const daysSince = differenceInDays(new Date(), new Date(profileData.updated_at));
        if (daysSince >= 60) {
          await createReminder(
            'profile_refresh',
            `Your profile hasn't been updated in ${daysSince} days. Refresh your values and vision.`,
            { days_since_last: daysSince }
          );
        }
      }

      // Load all reminders
      await loadReminders();
    } catch (error) {
      console.error('Error checking reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReminder = async (
    type: Reminder['reminder_type'],
    message: string,
    condition: any
  ) => {
    try {
      // Check if reminder already exists and not dismissed
      const { data: existing } = await supabase
        .from('notification_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .eq('reminder_type', type)
        .is('dismissed_at', null)
        .single();

      if (existing) return; // Already has active reminder

      await supabase
        .from('notification_reminders')
        .insert({
          user_id: user?.id,
          reminder_type: type,
          message,
          trigger_condition: condition,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error creating reminder:', error);
    }
  };

  const loadReminders = async () => {
    try {
      const query = supabase
        .from('notification_reminders')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (!showDismissed) {
        query.is('dismissed_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReminders(data || []);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const dismissReminder = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('notification_reminders')
        .update({ dismissed_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;

      toast.success('Reminder dismissed');
      await loadReminders();
    } catch (error: any) {
      toast.error('Failed to dismiss reminder');
    }
  };

  const getReminderIcon = (type: Reminder['reminder_type']) => {
    switch (type) {
      case 'personality_retake':
        return <RefreshCw className="h-4 w-4" />;
      case 'kpi_update':
        return <TrendingDown className="h-4 w-4" />;
      case 'profile_refresh':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getReminderColor = (type: Reminder['reminder_type']) => {
    switch (type) {
      case 'personality_retake':
        return 'border-blue-500';
      case 'kpi_update':
        return 'border-yellow-500';
      case 'profile_refresh':
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };

  if (loading) {
    return null;
  }

  const activeReminders = reminders.filter(r => !r.dismissed_at);

  if (activeReminders.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Growth Reminders
            </CardTitle>
            <CardDescription>
              Stay on track with your development journey
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDismissed(!showDismissed);
              loadReminders();
            }}
          >
            {showDismissed ? 'Hide Dismissed' : 'Show All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map(reminder => (
          <Alert
            key={reminder.id}
            className={`${getReminderColor(reminder.reminder_type)} ${
              reminder.dismissed_at ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getReminderIcon(reminder.reminder_type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      {reminder.reminder_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <AlertDescription>{reminder.message}</AlertDescription>
                </div>
              </div>
              {!reminder.dismissed_at && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => dismissReminder(reminder.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
