import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { SkillGroups } from '../components/learnstar/SkillGroups';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface LearningPath {
  id: string;
  topic: string;
  modules: Module[];
  progress: number;
}

interface Module {
  id: string;
  title: string;
  type: 'lesson' | 'quiz' | 'task' | 'video';
  content?: string;
  url?: string;
  completed: boolean;
  xp: number;
}

export default function LearnStar() {
  const { colors } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'What do you want to learn? 🌟' }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadLearningPaths();
  }, []);

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          toast.error('Allow mic in settings — type for now');
        } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
          toast.error('Voice failed — type instead');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const loadLearningPaths = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('learn_paths')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setLearningPath({
        id: data.id,
        topic: data.topic,
        modules: data.path_json?.modules || [],
        progress: data.progress || 0
      });
    }
  };

  const toggleVoiceInput = async () => {
    if (!recognitionRef.current) {
      toast.error('Voice not supported — type instead');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        // Request microphone permission first
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch (permissionError: any) {
            console.error('Microphone permission denied:', permissionError);
            if (permissionError.name === 'NotAllowedError' || permissionError.name === 'PermissionDeniedError') {
              toast.error('Allow mic in browser settings — type for now');
            } else {
              toast.error('Microphone not available — type instead');
            }
            return;
          }
        }

        setIsListening(true);
        toast('Listening...', { duration: 2000 });
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice input:', error);
        setIsListening(false);
        alert('Voice not supported — type instead');
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Get user data for personalization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🌟 LearnStar Request:', {
        hasApiKey: !!import.meta.env.VITE_XAI_API_KEY,
        inputLength: userMessage.length
      });

      const [personalityData, journalData, goalsData, gamificationData] = await Promise.all([
        supabase.from('personality_results').select('*').eq('user_id', user.id).order('update_date', { ascending: false }).limit(1).single(),
        supabase.from('journal_entries').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('gamification').select('*').eq('user_id', user.id).single()
      ]);

      // Call Grok API
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-beta',
          messages: [
            {
              role: 'system',
              content: `You are LearnStar, an AI learning coach. Create personalized learning paths based on user data.
User personality: ${JSON.stringify(personalityData.data?.trait_scores || {})}
Recent journal entries: ${JSON.stringify(journalData.data?.slice(0, 2) || [])}
Current goals: ${JSON.stringify(goalsData.data || [])}
Gamification level: ${gamificationData.data?.current_level || 1}

When user says what they want to learn:
1. Ask clarifying questions (time per day, link to goals, preferred format)
2. Once you have enough info, generate a structured learning path with modules
3. Format response as JSON: { "type": "question" | "path", "content": "...", "modules": [...] }
4. Personalize based on personality (e.g., introverts = solo tasks, high openness = creative exercises)
5. Include lessons, quizzes, tasks, video resources (YouTube, Khan Academy)
6. Each module should have: title, type, content/url, xp (30-100)`
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ]
        })
      });

      console.log('🌟 LearnStar Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🌟 LearnStar Error Response:', errorText);
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🌟 LearnStar Success:', {
        hasChoices: !!data.choices,
        contentPreview: data.choices?.[0]?.message?.content?.substring(0, 100)
      });

      const assistantMessage = data.choices[0].message.content;

      // Parse response
      try {
        const parsed = JSON.parse(assistantMessage);

        if (parsed.type === 'path' && parsed.modules) {
          // Save learning path
          const { data: pathData } = await supabase
            .from('learn_paths')
            .insert({
              user_id: user.id,
              topic: userMessage,
              path_json: { modules: parsed.modules },
              progress: 0
            })
            .select()
            .single();

          if (pathData) {
            setLearningPath({
              id: pathData.id,
              topic: pathData.topic,
              modules: parsed.modules,
              progress: 0
            });
          }

          setMessages(prev => [...prev, { role: 'assistant', content: parsed.content }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: parsed.content || assistantMessage }]);
        }
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('🌟 LearnStar Error:', error);

      // Fallback: Generate a generic 3-day learning path
      const genericModules: Module[] = [
        {
          id: '1',
          title: `Introduction to ${userMessage}`,
          type: 'lesson',
          content: `Start with the basics of ${userMessage}. Research key concepts and terminology.`,
          completed: false,
          xp: 50
        },
        {
          id: '2',
          title: `Practice ${userMessage}`,
          type: 'task',
          content: `Apply what you learned. Complete a simple project or exercise related to ${userMessage}.`,
          completed: false,
          xp: 75
        },
        {
          id: '3',
          title: `${userMessage} Quiz`,
          type: 'quiz',
          content: `Test your knowledge with key questions about ${userMessage}.`,
          completed: false,
          xp: 50
        }
      ];

      // Save fallback path
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: pathData } = await supabase
          .from('learn_paths')
          .insert({
            user_id: user.id,
            topic: userMessage,
            path_json: { modules: genericModules },
            progress: 0
          })
          .select()
          .single();

        if (pathData) {
          setLearningPath({
            id: pathData.id,
            topic: pathData.topic,
            modules: genericModules,
            progress: 0
          });
        }
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Great! I've created a 3-day starter path for ${userMessage}. Let's begin! 🌟`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleModuleComplete = async (moduleId: string) => {
    if (!learningPath) return;

    const updatedModules = learningPath.modules.map(m =>
      m.id === moduleId ? { ...m, completed: true } : m
    );
    const completedCount = updatedModules.filter(m => m.completed).length;
    const progress = Math.round((completedCount / updatedModules.length) * 100);
    const module = updatedModules.find(m => m.id === moduleId);

    setLearningPath({ ...learningPath, modules: updatedModules, progress });

    // Update in Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('learn_paths')
      .update({
        path_json: { modules: updatedModules },
        progress
      })
      .eq('id', learningPath.id);

    // Award XP
    if (module) {
      const { data: gamData } = await supabase
        .from('gamification')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (gamData) {
        const newXp = gamData.total_xp + module.xp;
        const newLevel = Math.floor(newXp / 500) + 1;

        await supabase
          .from('gamification')
          .update({ total_xp: newXp, current_level: newLevel })
          .eq('user_id', user.id);

        // Update journal
        await supabase
          .from('journal_entries')
          .insert({
            user_id: user.id,
            wins: `Completed ${module.title} in LearnStar`,
            mood: 'motivated',
            reflections: `Earned ${module.xp} XP from learning`
          });
      }
    }
  };

  const getModuleIcon = (type: string) => {
    switch (type) {
      case 'lesson': return '📚';
      case 'quiz': return '❓';
      case 'task': return '✅';
      case 'video': return '🎥';
      default: return '📖';
    }
  };

  const [activeTab, setActiveTab] = useState<'learning' | 'groups'>('learning');

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
            LEARNSTAR 🌟
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('learning')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'learning'
                  ? 'font-semibold'
                  : 'opacity-70'
              }`}
              style={{
                backgroundColor: activeTab === 'learning' ? colors.accent : 'var(--bg-secondary)',
                color: activeTab === 'learning' ? '#fff' : 'var(--text-primary)'
              }}
            >
              My Learning
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'groups'
                  ? 'font-semibold'
                  : 'opacity-70'
              }`}
              style={{
                backgroundColor: activeTab === 'groups' ? colors.accent : 'var(--bg-secondary)',
                color: activeTab === 'groups' ? '#fff' : 'var(--text-primary)'
              }}
            >
              Skill Groups
            </button>
          </div>
        </div>

        {activeTab === 'groups' ? (
          <SkillGroups />
        ) : learningPath ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Learning Path */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                {learningPath.topic}
              </h2>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between mb-2">
                  <span style={{ color: 'var(--text-secondary)' }}>Progress</span>
                  <span style={{ color: colors.accent }}>{learningPath.progress}%</span>
                </div>
                <div className="h-3 rounded-full" style={{ backgroundColor: 'var(--bg-primary)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${learningPath.progress}%`, backgroundColor: colors.accent }}
                  />
                </div>
              </div>

              {/* Modules */}
              <div className="space-y-3">
                {learningPath.modules.map((module) => (
                  <div
                    key={module.id}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'var(--bg-primary)' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{getModuleIcon(module.type)}</span>
                        <div className="flex-1">
                          <h3
                            className="font-semibold mb-1"
                            style={{ color: module.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}
                          >
                            {module.title}
                          </h3>
                          {module.content && (
                            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                              {module.content}
                            </p>
                          )}
                          {module.url && (
                            <a
                              href={module.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm underline"
                              style={{ color: colors.accent }}
                            >
                              Open resource
                            </a>
                          )}
                        </div>
                      </div>
                      <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: colors.accent }}>
                        +{module.xp} XP
                      </span>
                    </div>
                    {!module.completed && (
                      <button
                        onClick={() => handleModuleComplete(module.id)}
                        className="w-full mt-3 px-4 py-2 rounded-lg font-semibold transition-opacity hover:opacity-80"
                        style={{ backgroundColor: colors.accent, color: '#fff' }}
                      >
                        Mark Complete
                      </button>
                    )}
                    {module.completed && (
                      <div className="text-center py-2 text-sm font-semibold" style={{ color: colors.accent }}>
                        ✓ Completed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="rounded-2xl p-6 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', height: 'calc(100vh - 200px)' }}>
              <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Ask Coach
              </h2>

              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}
                    style={{
                      backgroundColor: msg.role === 'user' ? colors.accent : 'var(--bg-primary)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)'
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                {loading && (
                  <div className="mr-8 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    Thinking...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={toggleVoiceInput}
                  className="px-4 py-3 rounded-xl transition-opacity hover:opacity-80"
                  style={{ backgroundColor: isListening ? colors.accent : 'var(--bg-primary)', color: isListening ? '#fff' : 'var(--text-primary)' }}
                >
                  {isListening ? '⏸️' : '🎤'}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: colors.accent, color: '#fff' }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 max-w-2xl mx-auto" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: 'var(--text-primary)' }}>
              What do you want to learn? 🌟
            </h2>

            <div className="space-y-3 mb-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl ${msg.role === 'user' ? 'ml-8' : 'mr-8'}`}
                  style={{
                    backgroundColor: msg.role === 'user' ? colors.accent : 'var(--bg-primary)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)'
                  }}
                >
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="mr-8 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  Thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex gap-2">
              <button
                onClick={toggleVoiceInput}
                className="px-4 py-3 rounded-xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: isListening ? colors.accent : 'var(--bg-primary)', color: isListening ? '#fff' : 'var(--text-primary)' }}
              >
                {isListening ? '⏸️' : '🎤'}
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type what you want to learn..."
                className="flex-1 px-4 py-3 rounded-xl outline-none text-lg"
                style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-6 py-3 rounded-xl font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: colors.accent, color: '#fff' }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
