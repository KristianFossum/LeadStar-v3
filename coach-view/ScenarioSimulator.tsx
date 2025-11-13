import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lightbulb, Calendar, Zap, CheckCircle, Sparkles, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateScenarioResolutionImage } from '@/lib/ai/image-generation';
import { ImageConsentDialog, useImageConsent } from '@/components/ui/image-consent-dialog';

interface ScenarioOption {
  label: string;
  trait: string;
  outcome: string;
  xp: number;
}

export function ScenarioSimulator() {
  const { user } = useAuth();
  const { hasConsent } = useImageConsent();
  const [scenario, setScenario] = useState<any>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [resolutionImage, setResolutionImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  useEffect(() => {
    loadScenario();
  }, [user]);

  const loadScenario = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('coach_insights')
        .select('scenario_json')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (data?.scenario_json) {
        setScenario(data.scenario_json);
      } else {
        // Default scenario if none exists
        setScenario({
          title: 'Leadership Challenge',
          description: 'Tomorrow: Tough client call. Pick your style:',
          options: [
            {
              label: 'A) Direct',
              trait: 'Extraversion',
              outcome:
                'You handle the call with confidence and clarity. The client appreciates your straightforward approach.',
              xp: 100,
            },
            {
              label: 'B) Reflective',
              trait: 'Introversion',
              outcome:
                'You take time to listen deeply and understand their concerns. This builds trust and rapport.',
              xp: 100,
            },
            {
              label: 'C) Data-driven',
              trait: 'Conscientiousness',
              outcome:
                'You come prepared with facts and figures. The client is impressed by your thoroughness.',
              xp: 100,
            },
          ],
        });
      }
    } catch (error) {
      console.error('Error loading scenario:', error);
    }
  };

  const handleOptionSelect = async (index: number) => {
    setSelectedOption(index);
    setShowOutcome(true);

    if (!user || !scenario) return;

    const option = scenario.options[index];

    // Award XP
    try {
      const { data: gamification } = await supabase
        .from('gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gamification) {
        const newXP = gamification.total_xp + option.xp;
        const newLevel = Math.floor(newXP / 500) + 1;

        await supabase
          .from('gamification')
          .update({
            total_xp: newXP,
            current_level: newLevel,
          })
          .eq('user_id', user.id);

        toast.success(`+${option.xp} XP earned! Great choice!`);
      }
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  };

  const schedulePrep = async () => {
    if (!user || !scenario || selectedOption === null) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDateString = tomorrow.toISOString().split('T')[0];

      const { error } = await supabase.from('tasks').insert([
        {
          user_id: user.id,
          title: `Prep: ${scenario.title}`,
          desc: `Prepare for scenario using ${scenario.options[selectedOption].trait} approach`,
          date: tomorrowDateString,
          repeat_type: 'none',
          repeat_interval: 0,
          reminder: true,
          completed: false,
        },
      ]);

      if (error) {
        console.error('Error creating prep task:', error);
        toast.error('Failed to schedule prep task');
        return;
      }

      // Award XP for scheduling
      const { data: gamification } = await supabase
        .from('gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gamification) {
        const newXP = gamification.total_xp + 50;
        const newLevel = Math.floor(newXP / 500) + 1;

        await supabase
          .from('gamification')
          .update({
            total_xp: newXP,
            current_level: newLevel,
          })
          .eq('user_id', user.id);
      }

      toast.success('Prep task added to calendar! +50 XP');
    } catch (error) {
      console.error('Error scheduling prep:', error);
      toast.error('Failed to schedule prep task');
    }
  };

  const resetScenario = () => {
    setSelectedOption(null);
    setShowOutcome(false);
    setResolutionImage(null);
  };

  const handleVisualizeResolution = () => {
    if (hasConsent()) {
      generateResolutionVisualization();
    } else {
      setShowConsentDialog(true);
    }
  };

  const generateResolutionVisualization = async () => {
    if (!user || !scenario || selectedOption === null) return;

    setGeneratingImage(true);
    try {
      const option = scenario.options[selectedOption];
      const scenarioDescription = `${scenario.title}: Choosing a ${option.trait} approach leads to: ${option.outcome}`;

      const result = await generateScenarioResolutionImage(user.id, scenarioDescription);

      if (result.success && result.images.length > 0) {
        setResolutionImage(result.images[0]);
        toast.success('Resolution visualization generated!');
      } else {
        toast.error(result.error || 'Failed to generate visualization');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate scenario visualization');
    } finally {
      setGeneratingImage(false);
    }
  };

  const downloadResolutionImage = () => {
    if (!resolutionImage) return;

    const link = document.createElement('a');
    link.href = resolutionImage;
    link.download = 'leadstar-scenario-resolution.png';
    link.click();
    toast.success('Image download started!');
  };

  if (!scenario) {
    return (
      <Card className="bg-[#1e1e1e] border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-800 rounded w-3/4"></div>
          <div className="h-4 bg-gray-800 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-[#1e1e1e] border-gray-800 p-6 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-yellow-400" />
        <h3 className="text-xl font-bold text-white">Scenario Simulator</h3>
      </div>

      <div className="flex-1">
        <h4 className="text-lg font-semibold text-white mb-2">{scenario.title}</h4>
        <p className="text-gray-400 mb-6">{scenario.description}</p>

        <div className="space-y-3">
          {scenario.options.map((option: ScenarioOption, index: number) => (
            <div key={index}>
              <Button
                onClick={() => handleOptionSelect(index)}
                disabled={selectedOption !== null}
                variant={selectedOption === index ? 'default' : 'outline'}
                className={`w-full justify-start text-left h-auto py-4 px-4 ${
                  selectedOption === index
                    ? 'bg-purple-600 hover:bg-purple-700 border-purple-500'
                    : 'bg-[#121212] hover:bg-[#2a2a2a] border-gray-700'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium mb-1">{option.label}</div>
                  <div className="text-xs text-gray-400">Uses: {option.trait}</div>
                </div>
                {selectedOption === index && (
                  <CheckCircle className="h-5 w-5 text-white ml-2" />
                )}
              </Button>

              {showOutcome && selectedOption === index && (
                <div className="mt-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-green-400 text-sm mb-3">{option.outcome}</p>
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <Zap className="h-4 w-4" />
                    <span>+{option.xp} XP earned!</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {resolutionImage && (
        <div className="mt-4 relative rounded-lg overflow-hidden border border-gray-700">
          <img
            src={resolutionImage}
            alt="Scenario resolution visualization"
            className="w-full h-auto"
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2"
            onClick={downloadResolutionImage}
          >
            <Download className="h-3 w-3" />
          </Button>
        </div>
      )}

      {showOutcome && (
        <div className="flex gap-2 mt-6">
          <Button
            onClick={schedulePrep}
            variant="outline"
            className="flex-1 gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
          >
            <Calendar className="h-4 w-4" />
            Schedule Prep
          </Button>
          <Button
            onClick={handleVisualizeResolution}
            variant="outline"
            disabled={generatingImage}
            className="gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
          >
            {generatingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
          <Button
            onClick={resetScenario}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            New Scenario
          </Button>
        </div>
      )}

      <ImageConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConfirm={generateResolutionVisualization}
        onCancel={() => setShowConsentDialog(false)}
        title="Visualize Scenario Resolution"
        description="Generate a harmonious visualization of this scenario's outcome?"
        promptDescription="An empathetic scene depicting the balanced resolution of your chosen approach"
        estimatedCost="$0.07"
      />
    </Card>
  );
}
