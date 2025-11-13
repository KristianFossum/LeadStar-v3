/**
 * Centralized modern AI language utility
 * Converts archaic language to conversational, relatable tone
 * while keeping "grok" for empathy
 */

export interface LanguageContext {
  userName?: string;
  skillName?: string;
  progress?: number;
  personality?: any;
  value?: string;
}

/**
 * Modernize AI responses - replace archaic phrasing with conversational tone
 */
export function modernizeAIText(text: string, context?: LanguageContext): string {
  let modernized = text;

  // Replace archaic pronouns and verbs
  const replacements: Record<string, string> = {
    // Pronouns
    'thy': 'your',
    'thee': 'you',
    'thou': 'you',
    'thine': 'yours',

    // Verbs
    'art': 'are',
    'hath': 'has',
    'doth': 'does',

    // Phrases
    'kin': context?.skillName ? 'peers' : 'team',
    'quest': 'goal',
    'devotion': 'commitment',
    'mastery': 'mastery', // keep this one
    'stride': 'progress',
    'build on thy': 'build on your',
    'I grok thy': 'I get your',
    'grok thy': 'get your',
  };

  // Apply replacements (case-insensitive)
  Object.entries(replacements).forEach(([old, newText]) => {
    const regex = new RegExp(`\\b${old}\\b`, 'gi');
    modernized = modernized.replace(regex, newText);
  });

  return modernized;
}

/**
 * Generate modern, empathetic AI responses
 */
export const ModernAIResponses = {
  // Skill progress comments
  skillProgress: {
    excellent: (skillName: string) =>
      `Excellent progress in ${skillName}! Consider pairing with a peer to reach mastery faster.`,
    steady: (skillName: string) =>
      `Steady progress in ${skillName}. Keep building momentum!`,
    starting: (skillName: string) =>
      `I get your ${skillName} goal—consistent practice builds excellence.`,
    struggling: (skillName: string) =>
      `I see you're working on ${skillName}. Small steps lead to breakthroughs—keep at it!`,
  },

  // Learning path insights
  learningPath: {
    created: (skillName: string) =>
      `Learning path created! I get your quest—let's begin this journey with Grokipedia wisdom.`,
    adapted: (personalityTrait: string) =>
      `Your ${personalityTrait} style is a strength—this path adapts to work with you.`,
    prediction: (days: number, style: string) =>
      `I get your commitment—with daily practice, you're looking at ${days} days to mastery. Your ${style} approach will serve you well.`,
  },

  // Values and growth
  values: {
    amplifier: (value: string) =>
      `To amplify ${value}: Infuse your workspace with symbols that represent this value.`,
    ritual: (value: string, ritual: string) =>
      `Daily ritual for ${value}: ${ritual}`,
    collaboration: (value: string) =>
      `Want to deepen ${value}? Connect with peers who share this—building together strengthens both.`,
  },

  // Coach insights
  coach: {
    dailyMission: (mission: string, reason: string) =>
      `Today's mission: ${mission}. Why? ${reason}`,
    scenarioFeedback: (outcome: string) =>
      `${outcome} I get how this challenge felt—you handled it with your natural strengths.`,
    encouragement: (context: string) =>
      `I see where you're at with ${context}. You're building something real—keep going.`,
  },

  // KPI and metrics
  kpi: {
    prediction: (metric: string, trend: string) =>
      `Based on your ${metric} trend (${trend}), you're on track to hit your goals.`,
    insight: (metric: string, value: number) =>
      `Your ${metric} shows ${value}—this tells me you're making consistent progress.`,
    suggestion: (area: string) =>
      `To boost ${area}, try focusing on the fundamentals for the next few days.`,
  },

  // Matcher and bonds
  matcher: {
    suggestion: (commonality: string) =>
      `You both share ${commonality}—this creates natural synergy for learning together.`,
    ritual: (activity: string) =>
      `Bond ritual: ${activity}. Shared practice builds lasting connections.`,
  },

  // General empathy
  general: {
    understanding: (situation: string) =>
      `I get ${situation}—you're not alone in this.`,
    celebration: (achievement: string) =>
      `${achievement}—that's real progress! Celebrate this win.`,
    support: (challenge: string) =>
      `${challenge} is tough. Here's how to build through it.`,
  },
};

/**
 * Get modern AI comment based on progress
 */
export function getModernProgressComment(
  skillName: string,
  current: number,
  target: number,
  hasPartner: boolean = false
): string {
  const percent = (current / target) * 100;

  if (percent >= 80) {
    const base = ModernAIResponses.skillProgress.excellent(skillName);
    return hasPartner ? base : base.replace('Consider pairing', 'Want to level up? Pair');
  } else if (percent >= 50) {
    return ModernAIResponses.skillProgress.steady(skillName);
  } else if (percent >= 20) {
    return ModernAIResponses.skillProgress.starting(skillName);
  } else {
    return ModernAIResponses.skillProgress.struggling(skillName);
  }
}

/**
 * Get modern daily mission based on user context
 */
export function getModernDailyMission(userData: {
  personality?: any;
  recentMood?: string;
  journalStreak?: number;
  kpiData?: any;
}): { mission: string; reason: string } {
  const { personality, recentMood, journalStreak = 0, kpiData } = userData;

  // Analyze context and provide tailored mission
  if (journalStreak === 0) {
    return {
      mission: 'Write 3 sentences in your journal',
      reason: 'Reflection builds self-awareness—start your growth habit today.',
    };
  }

  if (recentMood === 'tired' || recentMood === 'stressed') {
    return {
      mission: 'Take a 10-minute walk outside',
      reason: 'Your energy needs a reset—movement restores clarity.',
    };
  }

  if (personality?.traits?.includes('introverted')) {
    return {
      mission: 'Solo deep work session: 30 min focused practice',
      reason: 'Your focused nature thrives in uninterrupted time—use it.',
    };
  }

  if (personality?.traits?.includes('extroverted')) {
    return {
      mission: 'Connect with your learning group or mentor',
      reason: 'Your collaborative energy grows through interaction—share your progress.',
    };
  }

  return {
    mission: 'Review your top 3 goals and update progress',
    reason: 'Awareness drives action—knowing where you are shows you where to go.',
  };
}

/**
 * Modernize Grokipedia predictions
 */
export function getModernPrediction(
  skillName: string,
  daysToMastery: number,
  personalityStyle: string
): string {
  return ModernAIResponses.learningPath.prediction(daysToMastery, personalityStyle);
}

/**
 * Get modern scenario feedback
 */
export function getModernScenarioFeedback(
  outcome: string,
  selectedTrait: string
): string {
  return `${outcome} I get how this played to your ${selectedTrait}—you used your natural strengths here.`;
}
