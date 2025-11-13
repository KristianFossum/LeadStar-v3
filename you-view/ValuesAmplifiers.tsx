import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Zap, Users, Sparkles, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ModernAIResponses } from '../../lib/ai/modernLanguage';

interface ValueAmplifier {
  id: string;
  user_id: string;
  value_name: string;
  rituals: string[];
  collaboration_suggestions: string[];
  grokipedia_branches: Array<{
    topic: string;
    outcome: string;
    link?: string;
  }>;
  created_at: string;
}

export function ValuesAmplifiers() {
  const { user } = useAuth();
  const [amplifiers, setAmplifiers] = useState<ValueAmplifier[]>([]);
  const [values, setValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedValue, setSelectedValue] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadValuesAndAmplifiers();
    }
  }, [user]);

  const loadValuesAndAmplifiers = async () => {
    try {
      // Load user's values
      const { data: valuesData } = await supabase
        .from('values')
        .select('*')
        .eq('user_id', user?.id)
        .order('rank', { ascending: true });

      setValues(valuesData || []);

      // Load existing amplifiers
      const { data: amplifiersData } = await supabase
        .from('value_amplifiers')
        .select('*')
        .eq('user_id', user?.id);

      setAmplifiers(amplifiersData || []);
    } catch (error) {
      console.error('Error loading values and amplifiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAmplifier = async (valueName: string) => {
    try {
      // Get personality data for tailored suggestions
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Generate rituals based on the value and personality
      const rituals = generateValueRituals(valueName, personalityData);

      // Generate collaboration suggestions (tie to Matcher)
      const collaborationSuggestions = generateCollaborationSuggestions(valueName);

      // Generate Grokipedia branches
      const grokipediaBranches = generateGrokipediaBranches(valueName);

      // Save amplifier
      const { data, error } = await supabase
        .from('value_amplifiers')
        .insert({
          user_id: user?.id,
          value_name: valueName,
          rituals,
          collaboration_suggestions: collaborationSuggestions,
          grokipedia_branches: grokipediaBranches
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(ModernAIResponses.values.amplifier(valueName));
      loadValuesAndAmplifiers();
    } catch (error: any) {
      toast.error('Failed to generate amplifier: ' + error.message);
    }
  };

  const generateValueRituals = (valueName: string, personalityData: any): string[] => {
    // In production, use Grok AI for personalized rituals
    const baseRituals: Record<string, string[]> = {
      'Integrity': [
        'Morning reflection: Review decisions through the lens of honesty',
        'Weekly audit: Identify one area where alignment can improve',
        'Infuse workspace with symbols: Display quotes or images representing truth'
      ],
      'Growth': [
        'Daily learning: Dedicate 15 minutes to skill development',
        'Monthly review: Assess progress and set new challenges',
        'Workspace symbols: Books, growth charts, or inspirational quotes'
      ],
      'Connection': [
        'Daily check-in: Reach out to one person meaningfully',
        'Weekly gathering: Schedule time with community or loved ones',
        'Environment: Display photos or mementos of important relationships'
      ]
    };

    const rituals = baseRituals[valueName] || [
      `Morning reflection on ${valueName}`,
      `Weekly review of ${valueName} alignment`,
      `Infuse workspace with ${valueName} symbols`
    ];

    // Adapt based on personality
    if (personalityData?.traits?.includes('introverted')) {
      rituals.push(`Solo contemplation: Journal about ${valueName} in quiet space`);
    } else {
      rituals.push(`Social practice: Discuss ${valueName} with your community`);
    }

    return rituals;
  };

  const generateCollaborationSuggestions = (valueName: string): string[] => {
    return [
      `Connect with peers who prioritize ${valueName} through Matcher`,
      `Form bonds with those who share this value for mutual growth`,
      `Join or create a LearnStar group focused on ${valueName}`
    ];
  };

  const generateGrokipediaBranches = (valueName: string) => {
    // In production, query Grokipedia API
    return [
      {
        topic: `Philosophy of ${valueName}`,
        outcome: `Deepen understanding of ${valueName} through historical perspectives`,
        link: `https://grokipedia.com/wiki/${encodeURIComponent(valueName)}`
      },
      {
        topic: `${valueName} in Leadership`,
        outcome: `Apply ${valueName} principles to leadership practices`,
        link: `https://grokipedia.com/wiki/${encodeURIComponent(valueName)}_leadership`
      },
      {
        topic: `Daily Practices for ${valueName}`,
        outcome: `Concrete actions to embody ${valueName} consistently`,
        link: `https://grokipedia.com/wiki/${encodeURIComponent(valueName)}_practices`
      }
    ];
  };

  const deleteAmplifier = async (amplifierId: string) => {
    try {
      const { error } = await supabase
        .from('value_amplifiers')
        .delete()
        .eq('id', amplifierId);

      if (error) throw error;
      toast.success('Amplifier removed');
      loadValuesAndAmplifiers();
    } catch (error: any) {
      toast.error('Failed to delete amplifier: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading your values...</p>
      </div>
    );
  }

  if (values.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No values defined yet. Visit the Values section to add your core values first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">VALUE AMPLIFIERS</h2>
        <p className="text-muted-foreground">
          Strengthen your core values with rituals, collaboration, and Grokipedia wisdom
        </p>
      </div>

      {/* Value Selection */}
      {values.length > 0 && amplifiers.length < values.length && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-300/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Generate Amplifier
            </CardTitle>
            <CardDescription>
              Choose a value to amplify with personalized rituals and resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {values
                .filter(v => !amplifiers.find(a => a.value_name === v.value_name))
                .map((value) => (
                  <Button
                    key={value.id}
                    onClick={() => generateAmplifier(value.value_name)}
                    variant="outline"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {value.value_name}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amplifiers List */}
      {amplifiers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No amplifiers yet. Generate your first value amplifier to strengthen your core values!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {amplifiers.map((amplifier) => (
            <Card key={amplifier.id} className="hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      {amplifier.value_name}
                    </CardTitle>
                    <CardDescription>Amplification rituals and resources</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAmplifier(amplifier.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rituals */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Daily Rituals
                  </h4>
                  <ul className="space-y-1">
                    {amplifier.rituals?.map((ritual, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{ritual}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Collaboration Suggestions */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Collaboration Preview
                  </h4>
                  <ul className="space-y-1">
                    {amplifier.collaboration_suggestions?.map((suggestion, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grokipedia Branches */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-semibold mb-2">Grokipedia Wisdom Tree</h4>
                  <div className="space-y-2">
                    {amplifier.grokipedia_branches?.map((branch, idx) => (
                      <div key={idx} className="text-xs bg-muted/50 p-2 rounded">
                        <div className="font-medium mb-1">{branch.topic}</div>
                        <div className="text-muted-foreground mb-1">{branch.outcome}</div>
                        {branch.link && (
                          <a
                            href={branch.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Explore on Grokipedia
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
