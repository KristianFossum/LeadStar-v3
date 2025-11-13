import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { X, Heart, GraduationCap, Users, Lock } from 'lucide-react';
import type { PersonalProfile } from '../../types/you-view';

interface ProfileWizardProps {
  profile: PersonalProfile;
  onComplete: (profile: PersonalProfile, template?: string) => void;
  onSkip?: () => void;
}

interface PersonalizationTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  suggestedValues: string[];
  focusArea: string;
}

const templates: PersonalizationTemplate[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Just beginning your growth journey',
    emoji: '🌱',
    suggestedValues: ['Curiosity', 'Learning', 'Growth', 'Authenticity'],
    focusArea: 'Building small wins daily'
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Leading teams and driving results',
    emoji: '👔',
    suggestedValues: ['Collaboration', 'Accountability', 'Empathy', 'Innovation'],
    focusArea: 'Team impact and KPIs'
  },
  {
    id: 'entrepreneur',
    name: 'Entrepreneur',
    description: 'Building ventures and chasing big goals',
    emoji: '🚀',
    suggestedValues: ['Innovation', 'Resilience', 'Vision', 'Impact'],
    focusArea: 'Big goals and rapid iteration'
  }
];

export function ProfileWizard({ profile, onComplete, onSkip }: ProfileWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: profile.name || '',
    role: profile.role || '',
    template: '',
    values: profile.values || [],
    personalityType: profile.personalityType || '',
    currentValue: '',
    interests: [] as string[],
    skillsToLearn: [] as string[],
    skillsToTeach: [] as string[],
    currentInterest: '',
    currentSkillLearn: '',
    currentSkillTeach: '',
    addOnPreferences: {
      matcher: false,
      learnstar: false,
      community: false,
    },
  });

  const totalSteps = 8;
  const progress = (step / totalSteps) * 100;

  const handleAddValue = () => {
    if (formData.currentValue.trim() && formData.values.length < 6) {
      setFormData({
        ...formData,
        values: [...formData.values, formData.currentValue.trim()],
        currentValue: '',
      });
    }
  };

  const handleRemoveValue = (valueToRemove: string) => {
    setFormData({
      ...formData,
      values: formData.values.filter((v) => v !== valueToRemove),
    });
  };

  const handleAddInterest = () => {
    if (formData.currentInterest.trim() && formData.interests.length < 10) {
      setFormData({
        ...formData,
        interests: [...formData.interests, formData.currentInterest.trim()],
        currentInterest: '',
      });
    }
  };

  const handleRemoveInterest = (interest: string) => {
    setFormData({
      ...formData,
      interests: formData.interests.filter((i) => i !== interest),
    });
  };

  const handleAddSkillLearn = () => {
    if (formData.currentSkillLearn.trim() && formData.skillsToLearn.length < 10) {
      setFormData({
        ...formData,
        skillsToLearn: [...formData.skillsToLearn, formData.currentSkillLearn.trim()],
        currentSkillLearn: '',
      });
    }
  };

  const handleRemoveSkillLearn = (skill: string) => {
    setFormData({
      ...formData,
      skillsToLearn: formData.skillsToLearn.filter((s) => s !== skill),
    });
  };

  const handleAddSkillTeach = () => {
    if (formData.currentSkillTeach.trim() && formData.skillsToTeach.length < 10) {
      setFormData({
        ...formData,
        skillsToTeach: [...formData.skillsToTeach, formData.currentSkillTeach.trim()],
        currentSkillTeach: '',
      });
    }
  };

  const handleRemoveSkillTeach = (skill: string) => {
    setFormData({
      ...formData,
      skillsToTeach: formData.skillsToTeach.filter((s) => s !== skill),
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        template: templateId,
        values: template.suggestedValues,
      });
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete({
        ...profile,
        name: formData.name,
        role: formData.role,
        values: formData.values,
        personalityType: formData.personalityType,
        onboardingCompleted: true,
      }, formData.template);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.role.trim().length > 0;
      case 3:
        return formData.template.length > 0;
      case 4:
        return formData.values.length > 0;
      case 5:
        return true; // Interests optional
      case 6:
        return true; // Skills optional
      case 7:
        return true; // Add-on preferences optional
      case 8:
        return true;
      default:
        return false;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Welcome to Your Personal Growth Hub 🌟</CardTitle>
        <CardDescription>
          Let's set up your profile to personalize your experience
        </CardDescription>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Step {step} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">What's your name?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This helps us personalize your experience
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                autoFocus
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">What's your role?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help us understand your professional context
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Current Role</Label>
              <Input
                id="role"
                placeholder="e.g., Engineering Team Lead, Product Manager"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                autoFocus
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose your template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select the template that best describes your current stage
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all hover:scale-105 ${
                    formData.template === template.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-4xl mb-2">{template.emoji}</div>
                  <h4 className="font-semibold mb-1">{template.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{template.description}</p>
                  <p className="text-xs font-medium">Focus: {template.focusArea}</p>
                </button>
              ))}
            </div>
            {formData.template && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Your suggested values:</p>
                <div className="flex flex-wrap gap-2">
                  {templates.find(t => t.id === formData.template)?.suggestedValues.map((value) => (
                    <Badge key={value} variant="secondary">{value}</Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You can customize these in the next step
                </p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Customize your values</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Edit, add, or remove values to make them your own
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Add a Value</Label>
              <div className="flex gap-2">
                <Input
                  id="value"
                  placeholder="Enter a core value"
                  value={formData.currentValue}
                  onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddValue();
                    }
                  }}
                  autoFocus
                />
                <Button onClick={handleAddValue} disabled={formData.values.length >= 6}>
                  Add
                </Button>
              </div>
            </div>
            {formData.values.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.values.map((value) => (
                  <Badge key={value} variant="secondary" className="text-sm">
                    {value}
                    <button
                      onClick={() => handleRemoveValue(value)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">What are your interests & hobbies? 🎯</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share your passions to find like-minded souls for sacred bonds
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest">Add Interests (e.g., chess, hiking, coding)</Label>
              <div className="flex gap-2">
                <Input
                  id="interest"
                  placeholder="Enter an interest or hobby"
                  value={formData.currentInterest}
                  onChange={(e) => setFormData({ ...formData, currentInterest: e.target.value })}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddInterest();
                    }
                  }}
                  autoFocus
                />
                <Button onClick={handleAddInterest} disabled={formData.interests.length >= 10}>
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Optional but helps with matching</p>
            </div>
            {formData.interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="text-sm">
                    {interest}
                    <button
                      onClick={() => handleRemoveInterest(interest)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Skills: Learn & Teach 📚</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Share what you want to learn and what you can teach others
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="skillLearn">Skills to Learn</Label>
                <div className="flex gap-2">
                  <Input
                    id="skillLearn"
                    placeholder="e.g., chess strategy, public speaking"
                    value={formData.currentSkillLearn}
                    onChange={(e) => setFormData({ ...formData, currentSkillLearn: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkillLearn();
                      }
                    }}
                    autoFocus
                  />
                  <Button onClick={handleAddSkillLearn} disabled={formData.skillsToLearn.length >= 10}>
                    Add
                  </Button>
                </div>
                {formData.skillsToLearn.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skillsToLearn.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-sm">
                        🎯 {skill}
                        <button
                          onClick={() => handleRemoveSkillLearn(skill)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="skillTeach">Skills to Teach/Mentor</Label>
                <div className="flex gap-2">
                  <Input
                    id="skillTeach"
                    placeholder="e.g., guitar, programming, leadership"
                    value={formData.currentSkillTeach}
                    onChange={(e) => setFormData({ ...formData, currentSkillTeach: e.target.value })}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkillTeach();
                      }
                    }}
                  />
                  <Button onClick={handleAddSkillTeach} disabled={formData.skillsToTeach.length >= 10}>
                    Add
                  </Button>
                </div>
                {formData.skillsToTeach.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.skillsToTeach.map((skill) => (
                      <Badge key={skill} variant="default" className="text-sm">
                        ⭐ {skill}
                        <button
                          onClick={() => handleRemoveSkillTeach(skill)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
              💡 These unlock skill-based matching in Matcher and LearnStar groups
            </p>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Your Add-Ons ⭐</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select features you'd like to explore. You can always change these later in StarForge.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg hover:border-pink-500/50 transition-colors">
                <Checkbox
                  id="matcher"
                  checked={formData.addOnPreferences.matcher}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      addOnPreferences: {
                        ...formData.addOnPreferences,
                        matcher: checked as boolean,
                      },
                    })
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <Label htmlFor="matcher" className="font-semibold cursor-pointer">
                      💕 Matcher
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Find like-minded souls for sacred bonds (Friend/Lover modes). Unlock with completed profile & 3 journal entries.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg hover:border-blue-500/50 transition-colors">
                <Checkbox
                  id="learnstar"
                  checked={formData.addOnPreferences.learnstar}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      addOnPreferences: {
                        ...formData.addOnPreferences,
                        learnstar: checked as boolean,
                      },
                    })
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <GraduationCap className="h-4 w-4 text-blue-400" />
                    <Label htmlFor="learnstar" className="font-semibold cursor-pointer">
                      ⭐ LearnStar
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Skill-based matching and collaborative learning groups. Unlock with 3 journal entries.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg hover:border-purple-500/50 transition-colors">
                <Checkbox
                  id="community"
                  checked={formData.addOnPreferences.community}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      addOnPreferences: {
                        ...formData.addOnPreferences,
                        community: checked as boolean,
                      },
                    })
                  }
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-purple-400" />
                    <Label htmlFor="community" className="font-semibold cursor-pointer">
                      🌐 Community
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anonymous insights sharing and recruiting tools. Unlock with 1 KPI metric & 3 journal entries.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-muted p-3 rounded text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Good intentions:</strong> By selecting these, I choose to explore deeper connections with full consent. I can activate/deactivate them anytime in StarForge.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Almost done! 🎉</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You can take a personality test later to get personalized insights
              </p>
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div>
                <span className="font-medium">Name:</span> {formData.name}
              </div>
              <div>
                <span className="font-medium">Role:</span> {formData.role}
              </div>
              <div>
                <span className="font-medium">Template:</span>{' '}
                {templates.find(t => t.id === formData.template)?.emoji}{' '}
                {templates.find(t => t.id === formData.template)?.name}
              </div>
              <div>
                <span className="font-medium">Values:</span>{' '}
                {formData.values.join(', ')}
              </div>
              {formData.interests.length > 0 && (
                <div>
                  <span className="font-medium">Interests:</span>{' '}
                  {formData.interests.join(', ')}
                </div>
              )}
              {formData.skillsToLearn.length > 0 && (
                <div>
                  <span className="font-medium">Learning:</span>{' '}
                  {formData.skillsToLearn.join(', ')}
                </div>
              )}
              {formData.skillsToTeach.length > 0 && (
                <div>
                  <span className="font-medium">Teaching:</span>{' '}
                  {formData.skillsToTeach.join(', ')}
                </div>
              )}
              {(formData.addOnPreferences.matcher || formData.addOnPreferences.learnstar || formData.addOnPreferences.community) && (
                <div>
                  <span className="font-medium">Selected Add-Ons:</span>{' '}
                  {[
                    formData.addOnPreferences.matcher && '💕 Matcher',
                    formData.addOnPreferences.learnstar && '⭐ LearnStar',
                    formData.addOnPreferences.community && '🌐 Community',
                  ].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {onSkip && step === 1 && (
              <Button variant="ghost" onClick={onSkip}>
                Skip Setup
              </Button>
            )}
            <Button onClick={handleNext} disabled={!canProceed()}>
              {step === totalSteps ? 'Complete' : 'Next'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
