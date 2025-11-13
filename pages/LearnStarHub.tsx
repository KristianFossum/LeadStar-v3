import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription } from '../components/ui/alert';
import { BookOpen, Library, Brain, Users, Heart, Lock, TrendingUp, Star, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { MyPaths } from '../components/learnstar/MyPaths';
import { ResourcesLibrary } from '../components/learnstar/ResourcesLibrary';
import { QuizzesAssessments } from '../components/learnstar/QuizzesAssessments';
import { SkillGroups } from '../components/learnstar/SkillGroups';
import { SkillBasedMatcher } from '../components/learnstar/SkillBasedMatcher';

interface UnlockProgress {
  hasPersonalityTest: boolean;
  journalEntries: number;
  kpiDays: number;
  advancedUnlocked: boolean;
  skillTrackingDays: number;
}

export default function LearnStarHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('paths');
  const [unlockProgress, setUnlockProgress] = useState<UnlockProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [gamificationEnabled, setGamificationEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      checkUnlockProgress();
      checkGamificationSetting();
    }
  }, [user]);

  const checkGamificationSetting = async () => {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('learnstar_gamification')
        .eq('user_id', user?.id)
        .single();

      setGamificationEnabled(data?.learnstar_gamification ?? false);
    } catch (error) {
      console.error('Error checking gamification:', error);
    }
  };

  const checkUnlockProgress = async () => {
    try {
      // Check personality test
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Check journal entries
      const { data: journalData } = await supabase
        .from('journal_entries')
        .select('id')
        .eq('user_id', user?.id);

      // Check KPI tracking days
      const { data: kpiData } = await supabase
        .from('kpi_metrics')
        .select('history')
        .eq('user_id', user?.id);

      const kpiDays = new Set<string>();
      kpiData?.forEach(metric => {
        if (metric.history && Array.isArray(metric.history)) {
          metric.history.forEach((entry: any) => {
            if (entry.date) {
              kpiDays.add(new Date(entry.date).toDateString());
            }
          });
        }
      });

      // Check skill tracking days
      const { data: skillData } = await supabase
        .from('skill_metrics')
        .select('history')
        .eq('user_id', user?.id);

      const skillDays = new Set<string>();
      skillData?.forEach(skill => {
        if (skill.history && Array.isArray(skill.history)) {
          skill.history.forEach((entry: any) => {
            if (entry.date) {
              skillDays.add(new Date(entry.date).toDateString());
            }
          });
        }
      });

      const progress: UnlockProgress = {
        hasPersonalityTest: !!personalityData,
        journalEntries: journalData?.length || 0,
        kpiDays: kpiDays.size,
        skillTrackingDays: skillDays.size,
        advancedUnlocked: kpiDays.size >= 7 && skillDays.size >= 7
      };

      setUnlockProgress(progress);
    } catch (error) {
      console.error('Error checking unlock progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGamification = async () => {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          learnstar_gamification: !gamificationEnabled
        });

      if (error) throw error;
      setGamificationEnabled(!gamificationEnabled);
      toast.success(gamificationEnabled ? 'Gamification disabled' : 'Gamification enabled');
    } catch (error: any) {
      toast.error('Failed to update settings: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Star className="h-12 w-12 mx-auto mb-4 animate-pulse text-yellow-500" />
            <p className="text-muted-foreground">Loading LearnStar...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Star className="h-8 w-8 text-yellow-500" />
            LEARNSTAR
          </h1>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleGamification}
            className="flex items-center gap-2"
          >
            <Trophy className="h-4 w-4" />
            {gamificationEnabled ? 'Disable' : 'Enable'} Gamification
          </Button>
        </div>
        <p className="text-muted-foreground">
          Personalized skill mastery hub — adapt learning to your unique traits and goals
        </p>
      </div>

      {/* Unlock Progress Alert */}
      {!unlockProgress?.advancedUnlocked && (
        <Alert className="mb-6">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Unlock Advanced Features (Quizzes, Bonds)</p>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Track KPIs for 7+ days</span>
                    <Badge variant={unlockProgress?.kpiDays >= 7 ? 'default' : 'secondary'}>
                      {unlockProgress?.kpiDays || 0}/7
                    </Badge>
                  </div>
                  <Progress value={(unlockProgress?.kpiDays || 0) / 7 * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Track skills for 7+ days</span>
                    <Badge variant={unlockProgress?.skillTrackingDays >= 7 ? 'default' : 'secondary'}>
                      {unlockProgress?.skillTrackingDays || 0}/7
                    </Badge>
                  </div>
                  <Progress value={(unlockProgress?.skillTrackingDays || 0) / 7 * 100} className="h-2" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Build consistent practice first — mastery through personalized goals, earn your wisdom.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            My Paths
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Library className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger
            value="quizzes"
            disabled={!unlockProgress?.advancedUnlocked}
            className="flex items-center gap-2"
          >
            <Brain className="h-4 w-4" />
            Quizzes
            {!unlockProgress?.advancedUnlocked && <Lock className="h-3 w-3" />}
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger
            value="bonds"
            disabled={!unlockProgress?.advancedUnlocked}
            className="flex items-center gap-2"
          >
            <Heart className="h-4 w-4" />
            Bonds
            {!unlockProgress?.advancedUnlocked && <Lock className="h-3 w-3" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="paths" className="space-y-4">
          <MyPaths gamificationEnabled={gamificationEnabled} />
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <ResourcesLibrary personalityData={unlockProgress} />
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-4">
          <QuizzesAssessments />
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          <SkillGroups />
        </TabsContent>

        <TabsContent value="bonds" className="space-y-4">
          <SkillBasedMatcher />
        </TabsContent>
      </Tabs>
    </div>
  );
}
