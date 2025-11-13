import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Heart, Users, Lock, Unlock, Sparkles, Calendar, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface MatcherProfile {
  id: string;
  mode: 'self' | 'friend' | 'lover';
  bio: string;
  seeking_modes: string[];
  trait_vector: any;
  values_vector: any;
  interest_vector: any;
  skill_vector: any;
  is_active: boolean;
  unlocked_at: string | null;
  unlock_requirements: {
    kpi_days: number;
    profile_complete: boolean;
    personality_test: boolean;
  };
}

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  compatibility_score: number;
  mode: string;
  status: string;
  mutual_revealed_at: string | null;
  bond_trust_metrics: any;
}

interface UnlockProgress {
  kpiDaysComplete: number;
  kpiDaysRequired: number;
  profileComplete: boolean;
  personalityTestComplete: boolean;
  isUnlocked: boolean;
}

export function MatcherPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MatcherProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [unlockProgress, setUnlockProgress] = useState<UnlockProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'friend' | 'lover'>('friend');
  const [bio, setBio] = useState('');
  const [seekingModes, setSeekingModes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadProfile();
      checkUnlockProgress();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_matcher_profile')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setBio(data.bio || '');
        setSeekingModes(data.seeking_modes || []);
        setSelectedMode(data.mode);
        if (data.is_active) {
          loadMatches();
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUnlockProgress = async () => {
    try {
      // Check KPI tracking days
      const { data: kpiData } = await supabase
        .from('kpi_metrics')
        .select('created_at, updated_at, history')
        .eq('user_id', user?.id);

      // Count unique days with KPI updates
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

      // Check profile completion
      const { data: profileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Check personality test completion
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      const progress: UnlockProgress = {
        kpiDaysComplete: kpiDays.size,
        kpiDaysRequired: 7,
        profileComplete: !!(profileData?.values && profileData.values.length > 0),
        personalityTestComplete: !!personalityData,
        isUnlocked: kpiDays.size >= 7 && !!(profileData?.values && profileData.values.length > 0) && !!personalityData
      };

      setUnlockProgress(progress);
    } catch (error) {
      console.error('Error checking unlock progress:', error);
    }
  };

  const calculateCosineSimilarity = (vector1: any, vector2: any): number => {
    const keys = new Set([...Object.keys(vector1), ...Object.keys(vector2)]);
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    keys.forEach(key => {
      const v1 = vector1[key] || 0;
      const v2 = vector2[key] || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    });

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : (dotProduct / magnitude) * 100;
  };

  const calculateWeightedCompatibility = (
    traitVector1: any,
    traitVector2: any,
    valueVector1: any,
    valueVector2: any,
    interestVector1: any,
    interestVector2: any,
    skillVector1: any,
    skillVector2: any
  ): { total: number; trait: number; value: number; interest: number; skill: number } => {
    const traitScore = calculateCosineSimilarity(traitVector1, traitVector2);
    const valueScore = calculateCosineSimilarity(valueVector1, valueVector2);
    const interestScore = calculateCosineSimilarity(interestVector1, interestVector2);
    const skillScore = calculateCosineSimilarity(skillVector1, skillVector2);

    // Weighted: 50% traits, 20% values, 30% interests/skills combined (15% each)
    const total = (traitScore * 0.5) + (valueScore * 0.2) + (interestScore * 0.15) + (skillScore * 0.15);

    return {
      total: Math.round(total),
      trait: Math.round(traitScore),
      value: Math.round(valueScore),
      interest: Math.round(interestScore),
      skill: Math.round(skillScore)
    };
  };

  const createOrUpdateProfile = async () => {
    if (!unlockProgress?.isUnlocked) {
      toast.error('Complete unlock requirements first');
      return;
    }

    try {
      // Get user traits and values for vectors
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      const { data: profileData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      const traitVector = {
        extraversion: personalityData?.extraversion || 3,
        conscientiousness: personalityData?.conscientiousness || 3,
        openness: personalityData?.openness || 3,
        agreeableness: personalityData?.agreeableness || 3,
        neuroticism: personalityData?.neuroticism || 3,
      };

      const valuesVector = {};
      profileData?.values?.forEach((value: string, index: number) => {
        valuesVector[value.toLowerCase()] = 5 - (index * 0.5);
      });

      // Build interest and skill vectors from user_profile
      const interestVector = {};
      profileData?.interests?.forEach((interest: string, index: number) => {
        interestVector[interest.toLowerCase()] = 5 - (index * 0.3);
      });

      const skillVector = {};
      [...(profileData?.skills_to_learn || []), ...(profileData?.skills_to_teach || [])].forEach((skill: string, index: number) => {
        skillVector[skill.toLowerCase()] = 5 - (index * 0.3);
      });

      const profilePayload = {
        user_id: user?.id,
        mode: selectedMode,
        bio,
        seeking_modes: seekingModes,
        trait_vector: traitVector,
        values_vector: valuesVector,
        interest_vector: interestVector,
        skill_vector: skillVector,
        is_active: true,
        unlocked_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_matcher_profile')
        .upsert(profilePayload)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast.success('Matcher profile activated');
      findMatches();
    } catch (error: any) {
      toast.error('Failed to create profile: ' + error.message);
    }
  };

  const findMatches = async () => {
    try {
      // Get all active profiles in matching modes
      const { data: otherProfiles, error } = await supabase
        .from('user_matcher_profile')
        .select('*')
        .eq('is_active', true)
        .neq('user_id', user?.id)
        .contains('seeking_modes', [selectedMode]);

      if (error) throw error;

      // Calculate compatibility scores with weighted algorithm
      const matchesWithScores = otherProfiles.map(otherProfile => {
        const compatibility = calculateWeightedCompatibility(
          profile?.trait_vector || {},
          otherProfile.trait_vector || {},
          profile?.values_vector || {},
          otherProfile.values_vector || {},
          profile?.interest_vector || {},
          otherProfile.interest_vector || {},
          profile?.skill_vector || {},
          otherProfile.skill_vector || {}
        );

        // Find shared interests and skills
        const myInterests = Object.keys(profile?.interest_vector || {});
        const theirInterests = Object.keys(otherProfile.interest_vector || {});
        const sharedInterests = myInterests.filter(i => theirInterests.includes(i));

        const mySkills = Object.keys(profile?.skill_vector || {});
        const theirSkills = Object.keys(otherProfile.skill_vector || {});
        const sharedSkills = mySkills.filter(s => theirSkills.includes(s));

        return {
          user2_id: otherProfile.user_id,
          compatibility_score: compatibility.total,
          skill_compatibility_score: compatibility.skill,
          interest_compatibility_score: compatibility.interest,
          shared_interests: sharedInterests,
          shared_skills: sharedSkills,
          mode: selectedMode,
        };
      }).filter(m => m.compatibility_score > 60); // Only show high compatibility

      // Save matches (only if mutual)
      for (const match of matchesWithScores) {
        await supabase
          .from('matcher_matches')
          .upsert({
            user1_id: user?.id,
            user2_id: match.user2_id,
            compatibility_score: match.compatibility_score,
            skill_compatibility_score: match.skill_compatibility_score,
            interest_compatibility_score: match.interest_compatibility_score,
            shared_interests: match.shared_interests,
            shared_skills: match.shared_skills,
            mode: match.mode,
            status: 'pending',
          }, {
            onConflict: 'user1_id,user2_id'
          });
      }

      toast.success(`Found ${matchesWithScores.length} potential matches`);
      loadMatches();
    } catch (error: any) {
      toast.error('Failed to find matches: ' + error.message);
    }
  };

  const loadMatches = async () => {
    try {
      // Load mutual matches only
      const { data, error } = await supabase
        .from('matcher_matches')
        .select('*')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .eq('status', 'mutual')
        .order('compatibility_score', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>MATCHER</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Find sacred bonds through self-reliance and deep connection
          </p>
        </div>

      {!unlockProgress?.isUnlocked ? (
        <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Lock className="h-5 w-5" />
              Unlock Matcher
            </CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
              Complete these requirements to unlock sacred connections
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Track KPIs for 7 days</span>
                <Badge variant={unlockProgress?.kpiDaysComplete >= 7 ? 'default' : 'secondary'}>
                  {unlockProgress?.kpiDaysComplete || 0} / 7 days
                </Badge>
              </div>
              <Progress
                value={(unlockProgress?.kpiDaysComplete || 0) / 7 * 100}
                className="h-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Complete YOUR profile</span>
              <Badge variant={unlockProgress?.profileComplete ? 'default' : 'secondary'}>
                {unlockProgress?.profileComplete ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Complete personality test</span>
              <Badge variant={unlockProgress?.personalityTestComplete ? 'default' : 'secondary'}>
                {unlockProgress?.personalityTestComplete ? 'Complete' : 'Incomplete'}
              </Badge>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Build self-reliance first. Complete your inner work before forming sacred bonds.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={profile?.is_active ? 'matches' : 'setup'} className="space-y-4">
          <TabsList>
            <TabsTrigger value="setup">Setup Profile</TabsTrigger>
            <TabsTrigger value="matches" disabled={!profile?.is_active}>
              Matches
            </TabsTrigger>
            <TabsTrigger value="rituals" disabled={!profile?.is_active || matches.length === 0}>
              Bond Rituals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Unlock className="h-5 w-5" />
                  Matcher Profile Setup
                </CardTitle>
                <CardDescription style={{ color: 'var(--text-secondary)' }}>
                  Create your profile for finding sacred connections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Primary Mode</label>
                  <Select value={selectedMode} onValueChange={(v: any) => setSelectedMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friend">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Friend Mode - Platonic Bonds
                        </div>
                      </SelectItem>
                      <SelectItem value="lover">
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4" />
                          Lover Mode - Sacred Commitment
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Share your journey, values, and what you seek in sacred bonds..."
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Seeking (select modes you're open to connecting with)
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={seekingModes.includes('friend') ? 'default' : 'outline'}
                      onClick={() => {
                        if (seekingModes.includes('friend')) {
                          setSeekingModes(seekingModes.filter(m => m !== 'friend'));
                        } else {
                          setSeekingModes([...seekingModes, 'friend']);
                        }
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Friends
                    </Button>
                    <Button
                      variant={seekingModes.includes('lover') ? 'default' : 'outline'}
                      onClick={() => {
                        if (seekingModes.includes('lover')) {
                          setSeekingModes(seekingModes.filter(m => m !== 'lover'));
                        } else {
                          setSeekingModes([...seekingModes, 'lover']);
                        }
                      }}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Lovers
                    </Button>
                  </div>
                </div>

                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertDescription>
                    Matches are revealed only when mutual. Your traits and values create compatibility through cosine similarity.
                  </AlertDescription>
                </Alert>

                <Button onClick={createOrUpdateProfile} className="w-full">
                  {profile?.is_active ? 'Update Profile & Find Matches' : 'Activate Profile & Find Matches'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="matches" className="space-y-4">
            {matches.length === 0 ? (
              <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
                <CardContent className="p-6 text-center">
                  <p style={{ color: 'var(--text-secondary)' }}>
                    No mutual matches yet. Keep building your practice and check back soon.
                  </p>
                </CardContent>
              </Card>
            ) : (
              matches.map(match => (
                <Card key={match.id} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        {match.mode === 'lover' ? <Heart className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                        Sacred Bond
                      </CardTitle>
                      <Badge variant="default">
                        {match.compatibility_score}% Compatible
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Bond Trust Metrics</p>
                        <Progress
                          value={match.bond_trust_metrics?.shared_goals_progress || 0}
                          className="h-2 mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Shared goal progress
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Ritual Completion</p>
                        <Progress
                          value={match.bond_trust_metrics?.ritual_completion || 0}
                          className="h-2 mt-2"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Weekly rituals
                        </p>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      <Calendar className="h-4 w-4 mr-2" />
                      View Bond Rituals
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rituals">
            <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
              <CardHeader>
                <CardTitle style={{ color: 'var(--text-primary)' }}>Bond Rituals</CardTitle>
                <CardDescription style={{ color: 'var(--text-secondary)' }}>
                  Strengthen your connections through commitment prompts and loyalty templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>
                  Bond rituals coming soon. Select a match to begin.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      </div>
    </div>
  );
}
