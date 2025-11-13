import { supabase } from '@/lib/supabase';

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const XAI_IMAGE_API_URL = 'https://api.x.ai/v1/images/generations';

export interface ImageGenerationOptions {
  prompt: string;
  userId: string;
  context?: {
    personality?: any;
    kpiData?: any;
    journalData?: any;
    goalData?: any;
  };
  maxImages?: number; // Default 1, max 3 to control costs
}

export interface ImageGenerationResult {
  success: boolean;
  images: string[];
  prompt: string;
  error?: string;
}

/**
 * Generate images using xAI Grok image generation API (grok-2-image-1212)
 * Cost: $0.07 per image
 */
export async function generateImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const { prompt, userId, maxImages = 1 } = options;

  // Limit to 3 images max to respect costs
  const numImages = Math.min(maxImages, 3);

  if (!XAI_API_KEY) {
    console.warn('xAI API key not configured');
    return {
      success: false,
      images: [],
      prompt,
      error: 'API key not configured',
    };
  }

  try {
    console.log('🎨 Generating image with Grok:', { promptLength: prompt.length, numImages });

    const response = await fetch(XAI_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-image-1212',
        prompt,
        n: numImages,
      }),
    });

    console.log('🎨 Image generation response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🎨 Image generation error:', errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('🎨 Image generation response:', data);

    // Extract image URLs from response
    const images = data.data?.map((item: any) => item.url) || [];

    // Log the generation event (optional - for analytics)
    try {
      await supabase.from('image_generations').insert({
        user_id: userId,
        prompt,
        num_images: images.length,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn('Failed to log image generation:', logError);
    }

    return {
      success: true,
      images,
      prompt,
    };
  } catch (error: any) {
    console.error('🎨 Image generation error:', error);
    return {
      success: false,
      images: [],
      prompt,
      error: error.message || 'Failed to generate image',
    };
  }
}

/**
 * Generate personality archetype visualization
 */
export async function generateArchetypeImage(
  userId: string,
  personality: any
): Promise<ImageGenerationResult> {
  // Determine dominant trait
  const traits = {
    extraversion: personality.extraversion || 3,
    conscientiousness: personality.conscientiousness || 3,
    openness: personality.openness || 3,
    agreeableness: personality.agreeableness || 3,
    neuroticism: personality.neuroticism || 3,
  };

  const dominant = Object.entries(traits).reduce((a, b) => (a[1] > b[1] ? a : b));

  const archetypes: Record<string, string> = {
    extraversion: 'energetic charismatic leader inspiring a vibrant team',
    conscientiousness: 'focused organized strategist with detailed plans and systems',
    openness: 'creative visionary explorer discovering new possibilities',
    agreeableness: 'empathetic harmonious connector building bridges between people',
    neuroticism: 'resilient mindful guardian protecting and supporting others',
  };

  const scene = archetypes[dominant[0]] || 'balanced leader with multiple strengths';

  const prompt = `Generate a symbolic image of a ${scene}, in a motivational and empowering style with warm lighting and inspirational atmosphere`;

  return generateImage({
    prompt,
    userId,
    context: { personality },
    maxImages: 1,
  });
}

/**
 * Generate compatibility visualization for matching
 */
export async function generateCompatibilityImage(
  userId: string,
  trait1: string,
  trait2: string,
  mode: 'friend' | 'lover'
): Promise<ImageGenerationResult> {
  const modeText = mode === 'lover' ? 'building a legacy fortress together' : 'supporting each other in growth';
  const prompt = `Generate a harmonious artistic scene of ${trait1} and ${trait2} ${modeText}, symbolic and motivational style with complementary colors`;

  return generateImage({
    prompt,
    userId,
    maxImages: 1,
  });
}

/**
 * Generate KPI artistic trend visualization
 */
export async function generateKPITrendImage(
  userId: string,
  kpiDescription: string,
  personalityType?: string
): Promise<ImageGenerationResult> {
  const styleHint = personalityType === 'intuitive' ? 'abstract and conceptual' : 'clear and structured';
  const prompt = `Illustrate this KPI progress: ${kpiDescription}, as an artistic graph with motivational elements like a phoenix rising from metrics, ${styleHint} style`;

  return generateImage({
    prompt,
    userId,
    maxImages: 1,
  });
}

/**
 * Generate coaching goal visualization
 */
export async function generateCoachingGoalImage(
  userId: string,
  goal: string,
  journalContext: string
): Promise<ImageGenerationResult> {
  const prompt = `Create a motivational mood board for this goal: ${goal}, based on recent progress: ${journalContext}, emphasizing self-growth and achievement with uplifting imagery`;

  return generateImage({
    prompt,
    userId,
    maxImages: 1,
  });
}

/**
 * Generate scenario resolution visualization
 */
export async function generateScenarioResolutionImage(
  userId: string,
  scenarioDescription: string
): Promise<ImageGenerationResult> {
  const prompt = `Depict a balanced resolution to this situation: ${scenarioDescription}, as an empathetic scene of harmony and understanding with warm tones`;

  return generateImage({
    prompt,
    userId,
    maxImages: 1,
  });
}

/**
 * Generate custom image from /imagine command
 */
export async function generateCustomImage(
  userId: string,
  description: string,
  userContext?: {
    mood?: string;
    recentJournal?: string;
  }
): Promise<ImageGenerationResult> {
  let enhancedPrompt = description;

  // Enhance with context if available
  if (userContext?.mood) {
    enhancedPrompt += `, reflecting a ${userContext.mood} mood`;
  }

  return generateImage({
    prompt: enhancedPrompt,
    userId,
    maxImages: 1,
  });
}
