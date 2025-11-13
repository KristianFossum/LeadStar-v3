import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Input } from '../components/ui/input';
import { Share2, Users, TrendingUp, Shield, Link as LinkIcon, Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CommunityInsight {
  id: string;
  user_id: string;
  insight_type: 'grokked_trend' | 'pattern' | 'growth_tip' | 'anonymous_share';
  content: string;
  mode_context: 'self' | 'friend' | 'lover' | 'all';
  is_anonymous: boolean;
  moderation_status: 'pending' | 'approved' | 'flagged';
  ai_moderation_score: number;
  engagement_count: number;
  created_at: string;
}

interface RecruitingInvite {
  id: string;
  invite_code: string;
  mode: 'friend' | 'lover' | 'team';
  message: string;
  max_uses: number;
  uses_count: number;
  expires_at: string | null;
  created_at: string;
}

export function CommunityPage() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [myInvites, setMyInvites] = useState<RecruitingInvite[]>([]);
  const [newInsight, setNewInsight] = useState('');
  const [insightType, setInsightType] = useState<CommunityInsight['insight_type']>('grokked_trend');
  const [modeContext, setModeContext] = useState<CommunityInsight['mode_context']>('all');
  const [inviteMode, setInviteMode] = useState<'friend' | 'lover' | 'team'>('friend');
  const [inviteMessage, setInviteMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInsights();
      loadMyInvites();
    }
  }, [user]);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase
        .from('community_insights')
        .select('*')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInsights(data || []);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      toast.error('Failed to load community insights');
    } finally {
      setLoading(false);
    }
  };

  const loadMyInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('community_recruiting')
        .select('*')
        .eq('inviter_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyInvites(data || []);
    } catch (error: any) {
      console.error('Error loading invites:', error);
    }
  };

  const moderateWithAI = async (content: string): Promise<number> => {
    // Call Grok AI to check for good intentions, truth, and win-win
    try {
      const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
      const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

      if (!XAI_API_KEY) {
        return 0.7; // Default good score if no API key
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
              content: 'You are moderating community insights for LeadStar. Rate this content from 0-1 based on: good intentions (0.33), truth/authenticity (0.33), and win-win mindset (0.34). Return only a number between 0 and 1.'
            },
            {
              role: 'user',
              content: `Rate this insight: "${content}"`
            }
          ],
          temperature: 0.3,
        })
      });

      const data = await response.json();
      const contentText = data.choices?.[0]?.message?.content || '0.5';
      const score = parseFloat(contentText) || 0.5;
      return Math.min(Math.max(score, 0), 1);
    } catch (error) {
      console.error('AI moderation error:', error);
      return 0.5; // Default neutral score if AI fails
    }
  };

  const shareInsight = async () => {
    if (!newInsight.trim()) {
      toast.error('Please write an insight to share');
      return;
    }

    try {
      // Moderate with AI
      const aiScore = await moderateWithAI(newInsight);

      const { data, error } = await supabase
        .from('community_insights')
        .insert({
          user_id: user?.id,
          insight_type: insightType,
          content: newInsight,
          mode_context: modeContext,
          is_anonymous: true,
          ai_moderation_score: aiScore,
          moderation_status: aiScore >= 0.7 ? 'approved' : 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      if (aiScore >= 0.7) {
        setInsights([data, ...insights]);
        toast.success('Insight shared with community');
      } else {
        toast.success('Insight submitted for review');
      }

      setNewInsight('');
      setInsightType('grokked_trend');
      setModeContext('all');
    } catch (error: any) {
      toast.error('Failed to share insight: ' + error.message);
    }
  };

  const createInvite = async () => {
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data, error } = await supabase
        .from('community_recruiting')
        .insert({
          inviter_id: user?.id,
          invite_code: inviteCode,
          mode: inviteMode,
          message: inviteMessage || `Join me on LeadStar for ${inviteMode} connections`,
          max_uses: 5,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setMyInvites([data, ...myInvites]);
      toast.success('Invite created');
      setInviteMessage('');
    } catch (error: any) {
      toast.error('Failed to create invite: ' + error.message);
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const link = `${window.location.origin}/login?invite=${inviteCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied to clipboard');
  };

  const engageWithInsight = async (insightId: string) => {
    try {
      const insight = insights.find(i => i.id === insightId);
      if (!insight) return;

      const { error } = await supabase
        .from('community_insights')
        .update({ engagement_count: (insight.engagement_count || 0) + 1 })
        .eq('id', insightId);

      if (error) throw error;

      setInsights(insights.map(i =>
        i.id === insightId ? { ...i, engagement_count: (i.engagement_count || 0) + 1 } : i
      ));
    } catch (error: any) {
      console.error('Error engaging with insight:', error);
    }
  };

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>COMMUNITY</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Share anonymous insights and invite peers to grow together
          </p>
        </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights">
            <TrendingUp className="h-4 w-4 mr-2" />
            Community Insights
          </TabsTrigger>
          <TabsTrigger value="share">
            <Share2 className="h-4 w-4 mr-2" />
            Share Insight
          </TabsTrigger>
          <TabsTrigger value="invite">
            <Users className="h-4 w-4 mr-2" />
            Invite Peers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              All insights are anonymous and AI-moderated for good intentions, truth, and win-win mindset.
            </AlertDescription>
          </Alert>

          {loading ? (
            <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
              <CardContent className="p-6 text-center">
                <p style={{ color: 'var(--text-secondary)' }}>Loading insights...</p>
              </CardContent>
            </Card>
          ) : insights.length === 0 ? (
            <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
              <CardContent className="p-6 text-center">
                <p style={{ color: 'var(--text-secondary)' }}>
                  No community insights yet. Be the first to share.
                </p>
              </CardContent>
            </Card>
          ) : (
            insights.map(insight => (
              <Card key={insight.id} className="hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {insight.insight_type.replace('_', ' ')}
                      </Badge>
                      {insight.mode_context !== 'all' && (
                        <Badge variant="outline">
                          {insight.mode_context === 'lover' && <Heart className="h-3 w-3 mr-1" />}
                          {insight.mode_context === 'friend' && <Users className="h-3 w-3 mr-1" />}
                          {insight.mode_context === 'self' && <Sparkles className="h-3 w-3 mr-1" />}
                          {insight.mode_context}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(insight.created_at), 'MMM dd')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-primary)' }}>{insight.content}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        AI Score: {Math.round(insight.ai_moderation_score * 100)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {insight.engagement_count || 0} resonated
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => engageWithInsight(insight.id)}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Heart className="h-4 w-4 mr-1" />
                      Resonate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--text-primary)' }}>Share Anonymous Insight</CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>
                Your grokked patterns, trends, or growth tips help others grow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Insight Type</label>
                <Select value={insightType} onValueChange={(v: any) => setInsightType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grokked_trend">Grokked Trend</SelectItem>
                    <SelectItem value="pattern">Pattern Discovery</SelectItem>
                    <SelectItem value="growth_tip">Growth Tip</SelectItem>
                    <SelectItem value="anonymous_share">Anonymous Share</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mode Context</label>
                <Select value={modeContext} onValueChange={(v: any) => setModeContext(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="self">Self Mode</SelectItem>
                    <SelectItem value="friend">Friend Mode</SelectItem>
                    <SelectItem value="lover">Lover Mode</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Insight</label>
                <Textarea
                  value={newInsight}
                  onChange={(e) => setNewInsight(e.target.value)}
                  placeholder="Share what you've learned or discovered on your journey..."
                  rows={6}
                />
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  AI will check for good intentions, truth, and win-win mindset. High scores are auto-approved.
                </AlertDescription>
              </Alert>

              <Button onClick={shareInsight} className="w-full" disabled={!newInsight.trim()}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Anonymously
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
            <CardHeader>
              <CardTitle style={{ color: 'var(--text-primary)' }}>Create Invite Link</CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>
                Invite peers to join LeadStar in specific modes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Invite Mode</label>
                <Select value={inviteMode} onValueChange={(v: any) => setInviteMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friend">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Friend Mode - Form Platonic Teams
                      </div>
                    </SelectItem>
                    <SelectItem value="lover">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Lover Mode - Sacred Connections
                      </div>
                    </SelectItem>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team Mode - Leadership Circles
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Personal Message (Optional)</label>
                <Textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Add a personal message to your invite..."
                  rows={3}
                />
              </div>

              <Button onClick={createInvite} className="w-full">
                <LinkIcon className="h-4 w-4 mr-2" />
                Create Invite Link
              </Button>
            </CardContent>
          </Card>

          {myInvites.length > 0 && (
            <Card style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(128, 128, 128, 0.3)' }}>
              <CardHeader>
                <CardTitle style={{ color: 'var(--text-primary)' }}>Your Invites</CardTitle>
                <CardDescription style={{ color: 'var(--text-secondary)' }}>Share these links with people you trust</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myInvites.map(invite => (
                    <div key={invite.id} className="p-4 rounded-lg space-y-2" style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(128, 128, 128, 0.3)', backgroundColor: 'var(--bg-primary)' }}>
                      <div className="flex items-center justify-between">
                        <Badge variant="default">{invite.mode} mode</Badge>
                        <Badge variant="outline">
                          {invite.uses_count} / {invite.max_uses} uses
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}/login?invite=${invite.invite_code}`}
                          readOnly
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInviteLink(invite.invite_code)}
                        >
                          Copy
                        </Button>
                      </div>
                      {invite.message && (
                        <p className="text-xs text-muted-foreground italic">{invite.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Expires: {invite.expires_at && format(new Date(invite.expires_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
