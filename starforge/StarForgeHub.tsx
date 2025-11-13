import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Heart,
  Users,
  GraduationCap,
  Star,
  Lock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ModuleStatus {
  matcher: boolean;
  learnstar: boolean;
  community: boolean;
}

interface UnlockProgress {
  journalEntries: number;
  kpiMetrics: number;
  profileCompleted: boolean;
}

export function StarForgeHub() {
  const { user } = useAuth();
  const [modules, setModules] = useState<ModuleStatus>({
    matcher: false,
    learnstar: false,
    community: false,
  });
  const [progress, setProgress] = useState<UnlockProgress>({
    journalEntries: 0,
    kpiMetrics: 0,
    profileCompleted: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadModuleStatus();
      loadProgress();
    }
  }, [user]);

  const loadModuleStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('modules_enabled')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.modules_enabled) {
        setModules(data.modules_enabled);
      }
    } catch (error) {
      console.error('Error loading module status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    if (!user) return;

    try {
      // Count journal entries
      const { count: journalCount } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count KPI metrics
      const { count: kpiCount } = await supabase
        .from('kpi_metrics')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Check personality test
      const { data: personality } = await supabase
        .from('personality_results')
        .select('id')
        .eq('user_id', user.id)
        .single();

      setProgress({
        journalEntries: journalCount || 0,
        kpiMetrics: kpiCount || 0,
        profileCompleted: !!personality,
      });
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const toggleModule = async (moduleName: keyof ModuleStatus) => {
    if (!user) return;

    // Check unlock requirements
    const requirements = getRequirements(moduleName);
    if (!requirements.unlocked) {
      toast.error(requirements.message);
      return;
    }

    const newStatus = !modules[moduleName];

    // Consent confirmation when activating
    if (newStatus) {
      const consent = window.confirm(
        `I choose to activate ${getModuleName(moduleName)} with 100% good intentions, truth, and win-win spirit. I can deactivate this anytime. Do you consent?`
      );
      if (!consent) return;
    }

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          modules_enabled: {
            ...modules,
            [moduleName]: newStatus,
          },
        });

      if (error) throw error;

      setModules({ ...modules, [moduleName]: newStatus });

      if (newStatus) {
        toast.success(`${getModuleName(moduleName)} activated! 🌟`);
      } else {
        toast.success(`${getModuleName(moduleName)} deactivated.`);
      }
    } catch (error: any) {
      console.error('Error toggling module:', error);
      toast.error(error.message || 'Failed to update module');
    }
  };

  const getRequirements = (moduleName: keyof ModuleStatus) => {
    switch (moduleName) {
      case 'matcher':
        return {
          unlocked: progress.profileCompleted && progress.journalEntries >= 3,
          message: 'Complete your YOU profile and write 3 journal entries to unlock Matcher',
        };
      case 'learnstar':
        return {
          unlocked: progress.journalEntries >= 3,
          message: 'Write 3 journal entries to unlock LearnStar',
        };
      case 'community':
        return {
          unlocked: progress.kpiMetrics >= 1 && progress.journalEntries >= 3,
          message: 'Track at least 1 KPI and write 3 journal entries to unlock Community',
        };
      default:
        return { unlocked: true, message: '' };
    }
  };

  const getModuleName = (key: keyof ModuleStatus) => {
    const names = {
      matcher: 'Matcher',
      learnstar: 'LearnStar',
      community: 'Community',
    };
    return names[key];
  };

  const moduleConfigs = [
    {
      key: 'matcher' as keyof ModuleStatus,
      icon: Heart,
      name: '💕 Matcher',
      description: 'Find like-minded souls for sacred bonds (Friend/Lover modes)',
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
    },
    {
      key: 'learnstar' as keyof ModuleStatus,
      icon: GraduationCap,
      name: '⭐ LearnStar',
      description: 'Skill-based matching and collaborative learning groups',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
    },
    {
      key: 'community' as keyof ModuleStatus,
      icon: Users,
      name: '🌐 Community',
      description: 'Anonymous insights sharing and recruiting tools',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="text-white">Loading StarForge...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="h-10 w-10 text-yellow-400" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              StarForge
            </h1>
            <Star className="h-10 w-10 text-yellow-400" />
          </div>
          <p className="text-gray-400 text-lg">
            Choose your stars — no burden unbidden
          </p>
        </div>

        {/* Progress Card */}
        <Card className="bg-[#1e1e1e] border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                {progress.profileCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <p className="text-sm text-gray-400">YOU Profile</p>
                  <p className="text-white font-semibold">
                    {progress.profileCompleted ? 'Complete' : 'Incomplete'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {progress.journalEntries >= 3 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <p className="text-sm text-gray-400">Journal Entries</p>
                  <p className="text-white font-semibold">{progress.journalEntries} / 3</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {progress.kpiMetrics >= 1 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Lock className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <p className="text-sm text-gray-400">KPI Metrics</p>
                  <p className="text-white font-semibold">{progress.kpiMetrics} / 1</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Available Modules</h2>
          {moduleConfigs.map((config) => {
            const requirements = getRequirements(config.key);
            const Icon = config.icon;

            return (
              <Card
                key={config.key}
                className={`bg-[#1e1e1e] border-2 transition-all ${
                  modules[config.key] ? config.borderColor : 'border-gray-800'
                } ${modules[config.key] ? config.bgColor : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}
                      >
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          {config.name}
                          {!requirements.unlocked && (
                            <Lock className="h-4 w-4 text-gray-500" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          {config.description}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label htmlFor={`toggle-${config.key}`} className="sr-only">
                        Toggle {config.name}
                      </Label>
                      <Switch
                        id={`toggle-${config.key}`}
                        checked={modules[config.key]}
                        onCheckedChange={() => toggleModule(config.key)}
                        disabled={!requirements.unlocked}
                      />
                    </div>
                  </div>
                </CardHeader>
                {!requirements.unlocked && (
                  <CardContent>
                    <div className="flex items-start gap-2 p-3 bg-[#121212] rounded-lg border border-gray-800">
                      <Lock className="h-4 w-4 text-gray-500 mt-0.5" />
                      <p className="text-sm text-gray-400">{requirements.message}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Core Features Info */}
        <Card className="bg-[#1e1e1e] border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Core Features (Always Active)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-gray-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>YOU — Personality profiles & journals</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>KPI — Custom metrics & goals tracking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>COACH — AI-powered 1-2-1 coaching</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>TEAM — Anonymous insights & feedback</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
