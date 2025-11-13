import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Heart, CheckCircle2, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BondRitual {
  id: string;
  bond_id: string;
  ritual_type: 'devotion_prompt' | 'loyalty_oath' | 'shared_vow' | 'trust_check';
  mode: 'friend' | 'lover';
  prompt: string;
  response_user1: string | null;
  response_user2: string | null;
  completed_at: string | null;
  next_ritual_date: string | null;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
}

interface BondRitualsProps {
  bondId: string;
  mode: 'friend' | 'lover';
}

const RITUAL_TEMPLATES = {
  lover: {
    devotion_prompt: [
      "What does sacred commitment mean to you in this bond?",
      "Share one way your partner has helped you grow this week.",
      "What vow can you renew together today?",
      "How has our connection deepened your self-understanding?",
      "What does monogamous longevity mean to you?"
    ],
    shared_vow: [
      "We commit to truth, growth, and sacred presence.",
      "We honor each other's journey while walking together.",
      "We choose commitment daily, not just once.",
      "We build trust through consistent presence and care.",
      "We celebrate our bond as a path to deeper self-knowing."
    ]
  },
  friend: {
    loyalty_oath: [
      "What does platonic loyalty mean in our bond?",
      "How can we support each other's growth this week?",
      "What shared goal can we work toward together?",
      "How has our friendship strengthened your leadership?",
      "What team synergy can we create together?"
    ],
    shared_vow: [
      "We commit to honest communication and mutual growth.",
      "We support each other without expectation.",
      "We celebrate wins and navigate struggles together.",
      "We build trust through consistent showing up.",
      "We form a platonic team with shared purpose."
    ]
  }
};

export function BondRituals({ bondId, mode }: BondRitualsProps) {
  const { user } = useAuth();
  const [rituals, setRituals] = useState<BondRitual[]>([]);
  const [activeRitual, setActiveRitual] = useState<BondRitual | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRituals();
  }, [bondId]);

  const loadRituals = async () => {
    try {
      const { data, error } = await supabase
        .from('bond_rituals')
        .select('*')
        .eq('bond_id', bondId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRituals(data || []);

      // Find active ritual (not completed or due)
      const active = data?.find(r => !r.completed_at) || null;
      setActiveRitual(active);
    } catch (error: any) {
      console.error('Error loading rituals:', error);
      toast.error('Failed to load rituals');
    } finally {
      setLoading(false);
    }
  };

  const createDailyRitual = async () => {
    try {
      const templates = mode === 'lover'
        ? RITUAL_TEMPLATES.lover.devotion_prompt
        : RITUAL_TEMPLATES.friend.loyalty_oath;

      const randomPrompt = templates[Math.floor(Math.random() * templates.length)];

      const { data, error } = await supabase
        .from('bond_rituals')
        .insert({
          bond_id: bondId,
          ritual_type: mode === 'lover' ? 'devotion_prompt' : 'loyalty_oath',
          mode,
          prompt: randomPrompt,
          frequency: 'daily',
          next_ritual_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setActiveRitual(data);
      setRituals([data, ...rituals]);
      toast.success('New ritual created');
    } catch (error: any) {
      toast.error('Failed to create ritual: ' + error.message);
    }
  };

  const submitResponse = async () => {
    if (!activeRitual || !response.trim()) return;

    try {
      // Get match to determine which user field to update
      const { data: match } = await supabase
        .from('matcher_matches')
        .select('user1_id, user2_id')
        .eq('id', bondId)
        .single();

      const isUser1 = match?.user1_id === user?.id;
      const updateField = isUser1 ? 'response_user1' : 'response_user2';

      // Get current ritual to check if both responded
      const { data: currentRitual } = await supabase
        .from('bond_rituals')
        .select('*')
        .eq('id', activeRitual.id)
        .single();

      const otherResponse = isUser1 ? currentRitual?.response_user2 : currentRitual?.response_user1;
      const bothCompleted = !!otherResponse && !!response.trim();

      const { error } = await supabase
        .from('bond_rituals')
        .update({
          [updateField]: response,
          ...(bothCompleted && { completed_at: new Date().toISOString() })
        })
        .eq('id', activeRitual.id);

      if (error) throw error;

      if (bothCompleted) {
        // Update bond trust metrics
        await updateBondTrustMetrics(bondId);
        toast.success('Ritual completed by both! Bond strengthened.');
        setActiveRitual(null);
      } else {
        toast.success('Response saved. Waiting for your bond partner.');
      }

      setResponse('');
      loadRituals();
    } catch (error: any) {
      toast.error('Failed to submit response: ' + error.message);
    }
  };

  const updateBondTrustMetrics = async (bondId: string) => {
    try {
      const { data: match } = await supabase
        .from('matcher_matches')
        .select('bond_trust_metrics')
        .eq('id', bondId)
        .single();

      const currentMetrics = match?.bond_trust_metrics || {};
      const ritualCompletion = (currentMetrics.ritual_completion || 0) + 10;

      await supabase
        .from('matcher_matches')
        .update({
          bond_trust_metrics: {
            ...currentMetrics,
            ritual_completion: Math.min(ritualCompletion, 100)
          }
        })
        .eq('id', bondId);
    } catch (error) {
      console.error('Error updating trust metrics:', error);
    }
  };

  if (loading) {
    return <div>Loading rituals...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {mode === 'lover' ? 'Commitment Rituals' : 'Loyalty Rituals'}
          </CardTitle>
          <CardDescription>
            {mode === 'lover'
              ? 'Daily prompts to deepen your sacred commitment and monogamous longevity'
              : 'Regular check-ins to strengthen your platonic bond and team synergy'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!activeRitual ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                No active ritual. Create a new one to strengthen your bond.
              </p>
              <Button onClick={createDailyRitual}>
                <Heart className="h-4 w-4 mr-2" />
                Start Today's Ritual
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="default">
                    {activeRitual.ritual_type.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">
                    {activeRitual.frequency}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2">{activeRitual.prompt}</h3>
                <p className="text-sm text-muted-foreground">
                  {mode === 'lover'
                    ? 'Share from your heart. Your partner will see this and respond.'
                    : 'Share honestly. Your friend will see this and respond.'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Response</label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={mode === 'lover'
                    ? "Express your commitment authentically..."
                    : "Share your thoughts openly..."}
                  rows={4}
                />
              </div>

              <Button onClick={submitResponse} className="w-full" disabled={!response.trim()}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Response
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {rituals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ritual History</CardTitle>
            <CardDescription>Past rituals that strengthened your bond</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rituals.filter(r => r.completed_at).slice(0, 5).map(ritual => (
                <div key={ritual.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{ritual.ritual_type.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {ritual.completed_at && format(new Date(ritual.completed_at), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm font-medium mb-1">{ritual.prompt}</p>
                  {ritual.response_user1 && (
                    <p className="text-xs text-muted-foreground">✓ Both partners completed</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shared Vows</CardTitle>
          <CardDescription>
            {mode === 'lover'
              ? 'Sacred commitments for monogamous longevity'
              : 'Platonic oaths for enduring friendship'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(mode === 'lover'
              ? RITUAL_TEMPLATES.lover.shared_vow
              : RITUAL_TEMPLATES.friend.shared_vow
            ).map((vow, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 border rounded">
                <Heart className="h-4 w-4 mt-1 text-primary flex-shrink-0" />
                <p className="text-sm">{vow}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
