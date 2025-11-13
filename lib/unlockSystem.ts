import { supabase } from './supabase';

export interface UnlockRequirement {
  feature_name: string;
  requirement_type: 'kpi_days' | 'skill_tracked' | 'test_complete' | 'journal_entries';
  target_value: number;
}

export interface UnlockProgress {
  isUnlocked: boolean;
  progress: number;
  target: number;
  message: string;
}

export async function checkUnlock(
  userId: string,
  featureName: string
): Promise<UnlockProgress> {
  try {
    // Check if feature is already unlocked
    const { data: existingUnlock } = await supabase
      .from('unlock_requirements')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_name', featureName)
      .eq('is_unlocked', true)
      .single();

    if (existingUnlock) {
      return {
        isUnlocked: true,
        progress: existingUnlock.target_value,
        target: existingUnlock.target_value,
        message: 'Already unlocked!'
      };
    }

    // Define requirements for each feature
    const requirements: Record<string, UnlockRequirement[]> = {
      matcher: [
        { feature_name: 'matcher', requirement_type: 'kpi_days', target_value: 7 },
        { feature_name: 'matcher', requirement_type: 'test_complete', target_value: 1 }
      ],
      learnstar_groups: [
        { feature_name: 'learnstar_groups', requirement_type: 'kpi_days', target_value: 7 },
        { feature_name: 'learnstar_groups', requirement_type: 'skill_tracked', target_value: 1 }
      ],
      skill_matching: [
        { feature_name: 'skill_matching', requirement_type: 'skill_tracked', target_value: 3 },
        { feature_name: 'skill_matching', requirement_type: 'journal_entries', target_value: 5 }
      ]
    };

    const featureRequirements = requirements[featureName] || [];
    if (featureRequirements.length === 0) {
      // No requirements, unlock by default
      return {
        isUnlocked: true,
        progress: 1,
        target: 1,
        message: 'No requirements'
      };
    }

    // Check each requirement
    const progressChecks = await Promise.all(
      featureRequirements.map(req => checkRequirement(userId, req))
    );

    const allUnlocked = progressChecks.every(p => p.isUnlocked);

    if (allUnlocked) {
      // Mark as unlocked
      for (const req of featureRequirements) {
        await supabase
          .from('unlock_requirements')
          .upsert({
            user_id: userId,
            feature_name: req.feature_name,
            requirement_type: req.requirement_type,
            progress_value: req.target_value,
            target_value: req.target_value,
            is_unlocked: true,
            unlocked_at: new Date().toISOString()
          });
      }
    }

    return {
      isUnlocked: allUnlocked,
      progress: progressChecks.reduce((sum, p) => sum + p.progress, 0) / progressChecks.length,
      target: 100,
      message: allUnlocked
        ? 'Unlocked!'
        : `Complete ${progressChecks.filter(p => !p.isUnlocked).length} more requirement(s)`
    };
  } catch (error) {
    console.error('Error checking unlock:', error);
    return {
      isUnlocked: false,
      progress: 0,
      target: 100,
      message: 'Error checking requirements'
    };
  }
}

async function checkRequirement(
  userId: string,
  requirement: UnlockRequirement
): Promise<UnlockProgress> {
  switch (requirement.requirement_type) {
    case 'kpi_days':
      return await checkKPIDays(userId, requirement.target_value);
    case 'skill_tracked':
      return await checkSkillTracked(userId, requirement.target_value);
    case 'test_complete':
      return await checkTestComplete(userId);
    case 'journal_entries':
      return await checkJournalEntries(userId, requirement.target_value);
    default:
      return { isUnlocked: false, progress: 0, target: 100, message: 'Unknown requirement' };
  }
}

async function checkKPIDays(userId: string, targetDays: number): Promise<UnlockProgress> {
  const { data: kpiData } = await supabase
    .from('kpi_metrics')
    .select('created_at, updated_at, history')
    .eq('user_id', userId);

  const uniqueDays = new Set<string>();
  kpiData?.forEach(metric => {
    if (metric.history && Array.isArray(metric.history)) {
      metric.history.forEach((entry: any) => {
        if (entry.date) {
          uniqueDays.add(new Date(entry.date).toDateString());
        }
      });
    }
  });

  const progress = uniqueDays.size;
  return {
    isUnlocked: progress >= targetDays,
    progress,
    target: targetDays,
    message: `Track KPIs for ${targetDays} days (${progress}/${targetDays})`
  };
}

async function checkSkillTracked(userId: string, targetCount: number): Promise<UnlockProgress> {
  const { data: skillMetrics } = await supabase
    .from('skill_metrics')
    .select('skill_name')
    .eq('user_id', userId);

  const progress = skillMetrics?.length || 0;
  return {
    isUnlocked: progress >= targetCount,
    progress,
    target: targetCount,
    message: `Track ${targetCount} skills (${progress}/${targetCount})`
  };
}

async function checkTestComplete(userId: string): Promise<UnlockProgress> {
  const { data: personality } = await supabase
    .from('personality_results')
    .select('id')
    .eq('user_id', userId)
    .single();

  return {
    isUnlocked: !!personality,
    progress: personality ? 1 : 0,
    target: 1,
    message: personality ? 'Personality test complete' : 'Complete personality test'
  };
}

async function checkJournalEntries(userId: string, targetCount: number): Promise<UnlockProgress> {
  const { data: entries } = await supabase
    .from('journal_entries')
    .select('id')
    .eq('user_id', userId);

  const progress = entries?.length || 0;
  return {
    isUnlocked: progress >= targetCount,
    progress,
    target: targetCount,
    message: `Write ${targetCount} journal entries (${progress}/${targetCount})`
  };
}

export async function trackSkillProgress(
  userId: string,
  skillName: string,
  value: number,
  bondId?: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('skill_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_name', skillName)
      .eq('bond_id', bondId || null)
      .single();

    if (existing) {
      const newHistory = [
        ...(existing.history || []),
        { date: new Date().toISOString(), value }
      ];

      await supabase
        .from('skill_metrics')
        .update({
          current_value: value,
          history: newHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('skill_metrics')
        .insert({
          user_id: userId,
          skill_name: skillName,
          current_value: value,
          bond_id: bondId || null,
          history: [{ date: new Date().toISOString(), value }]
        });
    }
  } catch (error) {
    console.error('Error tracking skill progress:', error);
  }
}
