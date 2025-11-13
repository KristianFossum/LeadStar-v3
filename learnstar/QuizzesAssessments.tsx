import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Brain, Play, CheckCircle, TrendingUp, AlertCircle, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  user_id: string;
  skill_name: string;
  difficulty_level: number;
  questions: QuizQuestion[];
  completed: boolean;
  score?: number;
  created_at: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  empathic_feedback?: string;
  grokipedia_sourced?: boolean;
}

interface Assessment {
  id: string;
  quiz_id: string;
  skill_name: string;
  score: number;
  difficulty_level: number;
  completed_at: string;
  insights: string[];
}

export function QuizzesAssessments() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadQuizzes();
      loadAssessments();
    }
  }, [user]);

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_quizzes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('skill_assessments')
        .select('*')
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  const generateAdaptiveQuiz = async (skillName: string, currentLevel: number = 1) => {
    try {
      // Get personality data for empathic feedback
      const { data: personalityData } = await supabase
        .from('personality_results')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // In production, call Grok AI to fetch Grokipedia-sourced simulations and generate adaptive questions
      // For now, create sample quiz with Grokipedia-based questions
      const sampleQuestions: QuizQuestion[] = [
        {
          question: `Scenario: Your trait is tested in ${skillName}. What approach aligns with strategic mastery?`,
          options: ['Reactive response', 'Proactive planning', 'Avoidance', 'Delegation only'],
          correct_answer: 1,
          explanation: 'Proactive planning demonstrates foresight and strategic thinking—core to mastery.',
          empathic_feedback: personalityData ? 'I get your thoughtful nature—this aligns with your analytical strengths.' : 'I get your goal—build strategic resilience.',
          grokipedia_sourced: true
        },
        {
          question: `How would your personality handle a challenge in ${skillName}?`,
          options: ['Solo deep work', 'Collaborative problem-solving', 'Trial and error', 'Research first'],
          correct_answer: 3,
          explanation: 'Research-driven approaches balance intuition with evidence—a hallmark of mastery.',
          empathic_feedback: 'I grok your block—trust your process, refine with knowledge.',
          grokipedia_sourced: true
        },
        {
          question: `What advanced principle from Grokipedia defines ${skillName} excellence?`,
          options: ['Speed over accuracy', 'Balance and adaptation', 'Rigid adherence to rules', 'Pure intuition'],
          correct_answer: 1,
          explanation: 'Balance and adaptation—Grokipedia wisdom—are keys to evolving mastery.',
          empathic_feedback: 'I grok your commitment—your growth mindset will serve you well.',
          grokipedia_sourced: true
        }
      ];

      const { data, error } = await supabase
        .from('skill_quizzes')
        .insert({
          user_id: user?.id,
          skill_name: skillName,
          difficulty_level: currentLevel,
          questions: sampleQuestions,
          completed: false
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Empathic quiz generated from Grokipedia! I get your level.');
      setActiveQuiz(data);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setUserAnswers([]);
      loadQuizzes();
    } catch (error: any) {
      toast.error('Failed to generate quiz: ' + error.message);
    }
  };

  const submitAnswer = () => {
    if (selectedAnswer === null || !activeQuiz) return;

    const currentQuestion = activeQuiz.questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correct_answer;

    // Track answer
    setUserAnswers([...userAnswers, selectedAnswer]);
    setShowExplanation(true);

    if (isCorrect) {
      toast.success(currentQuestion.empathic_feedback || 'Correct!');
    } else {
      toast.error('Not quite right—I grok your block; build resilience.');
    }
  };

  const nextQuestion = () => {
    if (!activeQuiz) return;

    if (currentQuestionIndex < activeQuiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      completeQuiz();
    }
  };

  const completeQuiz = async () => {
    if (!activeQuiz) return;

    try {
      // Calculate score using tracked answers
      const correctAnswers = activeQuiz.questions.filter((q, idx) => {
        return userAnswers[idx] === q.correct_answer;
      }).length;
      const score = (correctAnswers / activeQuiz.questions.length) * 100;

      // Generate empathic insights based on performance (Grokipedia-sourced)
      const insights = score >= 80
        ? [
            'I grok your excellence—your strategic mastery shines',
            'Your analytical strengths serve you well—continue this commitment',
            'Grokipedia wisdom aligns with your path—teach others'
          ]
        : score >= 60
        ? [
            'I grok your effort—solid foundation, refine with practice',
            'Your gaps reveal growth areas—focus here for mastery',
            'Grok your blocks—build resilience through daily rituals'
          ]
        : [
            'I grok your struggle—return to fundamentals with compassion',
            'Your journey begins here—embrace the learning process',
            'Grokipedia offers deeper resources—explore your path'
          ];

      // Save assessment
      const { error } = await supabase
        .from('skill_assessments')
        .insert({
          user_id: user?.id,
          quiz_id: activeQuiz.id,
          skill_name: activeQuiz.skill_name,
          score: score,
          difficulty_level: activeQuiz.difficulty_level,
          insights: insights
        });

      if (error) throw error;

      // Update quiz as completed
      await supabase
        .from('skill_quizzes')
        .update({ completed: true, score: score })
        .eq('id', activeQuiz.id);

      toast.success(`Quiz completed! Score: ${score.toFixed(0)}%`);
      setActiveQuiz(null);
      loadQuizzes();
      loadAssessments();
    } catch (error: any) {
      toast.error('Failed to save assessment: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading quizzes...</p>
      </div>
    );
  }

  // Active quiz view
  if (activeQuiz) {
    const currentQuestion = activeQuiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{activeQuiz.skill_name} Quiz</CardTitle>
                <CardDescription>
                  Question {currentQuestionIndex + 1} of {activeQuiz.questions.length}
                </CardDescription>
              </div>
              <Badge>Level {activeQuiz.difficulty_level}</Badge>
            </div>
            <Progress value={progress} className="h-2 mt-2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-lg font-medium">{currentQuestion.question}</p>
            </div>

            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => !showExplanation && setSelectedAnswer(idx)}
                  disabled={showExplanation}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    selectedAnswer === idx
                      ? 'border-primary bg-primary/10'
                      : 'hover:border-primary/50'
                  } ${
                    showExplanation && idx === currentQuestion.correct_answer
                      ? 'border-green-500 bg-green-50'
                      : ''
                  } ${
                    showExplanation && selectedAnswer === idx && idx !== currentQuestion.correct_answer
                      ? 'border-red-500 bg-red-50'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {showExplanation && idx === currentQuestion.correct_answer && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {showExplanation && selectedAnswer === idx && idx !== currentQuestion.correct_answer && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span>{option}</span>
                  </div>
                </button>
              ))}
            </div>

            {showExplanation && (
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">Explanation:</p>
                  <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                </div>
                {currentQuestion.empathic_feedback && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium mb-2 text-purple-800">Empathic Feedback:</p>
                    <p className="text-sm text-purple-700 italic">{currentQuestion.empathic_feedback}</p>
                    {currentQuestion.grokipedia_sourced && (
                      <Badge variant="outline" className="mt-2 text-xs">
                        Sourced from Grokipedia
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!showExplanation ? (
                <Button
                  onClick={submitAnswer}
                  disabled={selectedAnswer === null}
                  className="flex-1"
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={nextQuestion} className="flex-1">
                  {currentQuestionIndex < activeQuiz.questions.length - 1 ? 'Next Question' : 'Complete Quiz'}
                </Button>
              )}
              <Button variant="outline" onClick={() => setActiveQuiz(null)}>
                Exit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Quiz list view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">EMPATHIC QUERY SIMULATOR</h2>
        <p className="text-muted-foreground">
          Test your knowledge with Grokipedia-sourced scenarios and empathetic feedback
        </p>
      </div>

      <Card className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-300/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Generate Empathic Quiz
          </CardTitle>
          <CardDescription>Create Grokipedia-based assessments tailored to your traits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter skill name (e.g., Chess Strategy)"
              className="flex-1 border rounded px-3 py-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  generateAdaptiveQuiz(e.currentTarget.value.trim());
                  e.currentTarget.value = '';
                }
              }}
            />
            <Button onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input?.value.trim()) {
                generateAdaptiveQuiz(input.value.trim());
                input.value = '';
              }
            }}>
              <Brain className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
        </CardContent>
      </Card>

      {assessments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Recent Assessments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{assessment.skill_name}</CardTitle>
                    <Badge variant={assessment.score >= 80 ? 'default' : 'secondary'}>
                      {assessment.score.toFixed(0)}%
                    </Badge>
                  </div>
                  <CardDescription>
                    Level {assessment.difficulty_level} • {new Date(assessment.completed_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Progress value={assessment.score} className="h-2" />
                    {assessment.insights && assessment.insights.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-medium mb-1">AI Insights:</p>
                        <ul className="space-y-1">
                          {assessment.insights.slice(0, 2).map((insight, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                              <TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {quizzes.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Available Quizzes</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.filter(q => !q.completed).map((quiz) => (
              <Card key={quiz.id}>
                <CardHeader>
                  <CardTitle className="text-base">{quiz.skill_name}</CardTitle>
                  <CardDescription>
                    {quiz.questions.length} questions • Level {quiz.difficulty_level}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setActiveQuiz(quiz)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {quizzes.length === 0 && assessments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              No quizzes yet. Generate your first adaptive assessment!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
