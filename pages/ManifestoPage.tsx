import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Heart, Users, Sparkles, TrendingUp, Shield, Link as LinkIcon, Star, GraduationCap, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ManifestoPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            LeadStar Manifesto
          </h1>
          <p className="text-xl text-gray-400">
            Self-grokking leadership through truth, empathy, and sacred bonds
          </p>
        </div>

        <div className="space-y-6">
          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Sparkles className="h-8 w-8 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">100% Good Intentions • 100% Truth • 100% Win-Win</h2>
                  <p className="text-gray-300 mb-4 text-lg">
                    Every interaction, insight, and connection is guided by empathy, authenticity, and mutual growth.
                    LeadStar is a sanctuary for those who seek to lead themselves first, then form sacred bonds with others.
                  </p>
                  <p className="text-gray-400 italic">
                    This manifesto evolves with your feedback — we grow together.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="h-8 w-8 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Self-Reliance First</h2>
                  <p className="text-gray-300 mb-2">
                    Before we connect with others, we must deeply understand ourselves. LeadStar guides you through:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Scenario-based personality discovery (not sliders, but instinct)</li>
                    <li>Daily journaling with mood-based Grok empathy</li>
                    <li>KPI tracking to measure what matters</li>
                    <li>Pattern recognition across your journey</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    "You must build your inner foundation before forming enduring connections."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Heart className="h-8 w-8 text-pink-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Three Sacred Modes</h2>
                  <div className="space-y-3">
                    <div className="border-l-4 border-purple-500 pl-4 bg-purple-500/5 py-2 rounded-r">
                      <h3 className="font-semibold flex items-center gap-2 text-purple-300">
                        <Sparkles className="h-4 w-4" />
                        Self Mode
                      </h3>
                      <p className="text-sm text-gray-300">
                        Your personal growth sanctuary. Journal, track goals, build habits, and grok yourself deeply.
                      </p>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-4 bg-blue-500/5 py-2 rounded-r">
                      <h3 className="font-semibold flex items-center gap-2 text-blue-300">
                        <Users className="h-4 w-4" />
                        Friend Mode
                      </h3>
                      <p className="text-sm text-gray-300">
                        Platonic bonds for team synergy. Form loyal connections through compatibility matching and loyalty oaths.
                      </p>
                    </div>
                    <div className="border-l-4 border-pink-500 pl-4 bg-pink-500/5 py-2 rounded-r">
                      <h3 className="font-semibold flex items-center gap-2 text-pink-300">
                        <Heart className="h-4 w-4" />
                        Lover Mode
                      </h3>
                      <p className="text-sm text-gray-300">
                        Sacred commitment for monogamous longevity. Daily vows, compatibility quizzes, and bond trust tracking.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Star className="h-8 w-8 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Modular Add-Ons via StarForge</h2>
                  <p className="text-gray-300 mb-2">
                    Choose your stars — no burden unbidden. Activate only what serves your path:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-300 ml-4">
                    <li className="flex items-start gap-2">
                      <Heart className="h-4 w-4 text-pink-400 mt-1" />
                      <div>
                        <span className="font-semibold text-pink-300">Matcher:</span> Find like-minded souls for sacred bonds (Friend/Lover modes)
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <GraduationCap className="h-4 w-4 text-blue-400 mt-1" />
                      <div>
                        <span className="font-semibold text-blue-300">LearnStar:</span> Skill-based matching and collaborative learning groups
                      </div>
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-purple-400 mt-1" />
                      <div>
                        <span className="font-semibold text-purple-300">Community:</span> Anonymous insights sharing and recruiting tools
                      </div>
                    </li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    Core features (YOU, KPI, COACH, TEAM) are always active. Add-ons require effort to unlock.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Shield className="h-8 w-8 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Effort-Based Unlocks</h2>
                  <p className="text-gray-300 mb-2">
                    Sacred connections require self-reliance. Unlock add-ons by demonstrating commitment:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Complete your personality test in YOU</li>
                    <li>Write at least 3 journal entries</li>
                    <li>Track at least 1 KPI metric (for Community)</li>
                    <li>Daily tasks feature unlocks after 7+ days of journaling</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    "Only those who've built inner strength can form enduring outer bonds."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Calendar className="h-8 w-8 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Daily Rituals for Enduring Growth</h2>
                  <p className="text-gray-300 mb-2">
                    Earn your day with personalized daily tasks that adapt to your mode, personality, and active features:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Mode-specific rituals (Self reflection, Friend check-ins, Lover commitment)</li>
                    <li>Adaptive tasks based on your personality traits (introverted vs. extroverted)</li>
                    <li>Feature-linked practices (LearnStar skill sessions, Matcher bond strengthening)</li>
                    <li>AI empathy comments: "I get your goal today — build with these steps"</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    "Small daily rituals compound into lasting transformation — earn your day, every day."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <TrendingUp className="h-8 w-8 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">AI-Powered Matching</h2>
                  <p className="text-gray-300 mb-2">
                    When you're ready, our matching algorithm connects you with compatible souls based on:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Personality trait vectors (50% weight)</li>
                    <li>Values alignment (20% weight)</li>
                    <li>Shared interests & skills (30% weight — boosted for mentorship)</li>
                    <li>Compatibility quizzes for longevity or synergy</li>
                    <li>Mutual reveal only (no one-sided exposure)</li>
                  </ul>
                  <p className="text-sm mt-3 text-gray-300">
                    Bond trust is tracked through shared goal progress, ritual completion, and skill development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <LinkIcon className="h-8 w-8 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Community & Rituals</h2>
                  <p className="text-gray-300 mb-2">
                    Share anonymous insights, invite peers, and strengthen bonds through rituals:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Daily commitment prompts for Lover Mode</li>
                    <li>Weekly loyalty check-ins for Friend Mode</li>
                    <li>Skill-sharing groups and forums (LearnStar)</li>
                    <li>AI-moderated community insights (good intentions, truth, win-win)</li>
                    <li>Invite links for forming platonic teams or sacred pairs</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    "Growth accelerates when shared with those who grok your journey."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <GraduationCap className="h-8 w-8 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Grokipedia for Truthful Mastery — Earn Your Bonds</h2>
                  <p className="text-gray-300 mb-2">
                    LearnStar (⭐ add-on in Friend Mode) integrates Grokipedia — curated wisdom for personalized skill mastery. Adapt learning to your unique traits with AI-powered insights:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Grokipedia Search: AI fetches/summarizes articles, flashcards, and resources tailored to your learning style (e.g., 'For your introverted style: deep solo tactics')</li>
                    <li>Evolving Wisdom Paths: Dynamic learning trees predict outcomes based on personality & KPIs (e.g., '90 days to mastery if devoted daily')</li>
                    <li>Empathic Query Simulator: Adaptive quizzes from Grokipedia with empathetic feedback ('I get your block; build resilience')</li>
                    <li>Legacy Knowledge Vaults: User-curated archives in Groups, moderated by Grok for win-win collaboration trends</li>
                    <li>Devotional Study Rituals: Grokipedia-based prompts for mode-specific bonds ('Daily oath: explore one entry together for mutual mastery')</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    "Grokipedia for truthful mastery—earn your bonds through personalized goals. Mastery through knowledge, commitment through shared wisdom."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#1e1e1e] border-gray-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Sparkles className="h-8 w-8 text-yellow-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Unified Design for Seamless Grokking</h2>
                  <p className="text-gray-300 mb-2">
                    Your mirror shines true — every section of LeadStar now reflects a consistent, harmonious design:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Dark mode optimized with global theme variables for backgrounds, text, and borders</li>
                    <li>Seamless light/dark toggle without visual glitches across TEAM, MATCHER, COMMUNITY</li>
                    <li>Consistent typography, spacing, and iconography matching the core dashboard</li>
                    <li>Mobile-responsive UI that adapts gracefully to all screen sizes</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-purple-300">
                    "A unified design mirrors inner clarity — your path flows without friction."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Heart className="h-8 w-8 text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-bold mb-3 text-white">Modern, Relatable Guidance</h2>
                  <p className="text-gray-300 mb-2">
                    We get you, and help you grow. Our AI speaks your language — conversational, empowering, and authentic:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-400 ml-4">
                    <li>Modern, relatable tone: "I get your challenge; here's how to build on it"</li>
                    <li>Empathetic insights tailored to your personality and progress</li>
                    <li>Keep "grok" for empathy, but make it approachable and conversational</li>
                    <li>No archaic language — just real support from AI that understands you</li>
                  </ul>
                  <p className="text-sm mt-3 italic text-green-300">
                    "Modern, relatable guidance — we get you, and help you grow."
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4 text-white">Your Journey Awaits</h2>
              <p className="text-lg mb-6 text-gray-300">
                LeadStar grows with you. Choose your path, unlock your potential, and form sacred bonds on your terms.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Button
                  onClick={() => navigate('/you')}
                  className="bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Your Journey
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="border-gray-600 text-white hover:bg-gray-800"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-gray-500 py-4">
            <p>Built with empathy for leaders who grok themselves and others.</p>
            <p className="mt-1">© 2025 LeadStar. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
