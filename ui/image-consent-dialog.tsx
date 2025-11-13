import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ImageIcon, DollarSign, Lock } from 'lucide-react';

interface ImageConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  promptDescription?: string;
  estimatedCost?: string;
}

export function ImageConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = 'Confirm Image Generation',
  description = 'Generate a personalized visualization based on your data?',
  promptDescription,
  estimatedCost = '$0.07',
}: ImageConsentDialogProps) {
  const [rememberConsent, setRememberConsent] = useState(false);

  const handleConfirm = () => {
    if (rememberConsent) {
      // Store consent preference in localStorage
      localStorage.setItem('leadstar_image_consent', 'true');
    }
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-blue-500" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3 pt-2">
            <p>{description}</p>

            {promptDescription && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium text-foreground mb-1">What we'll generate:</p>
                <p className="text-muted-foreground">{promptDescription}</p>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Privacy: Images are temporary and user-downloadable only</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>Cost: Approximately {estimatedCost} per image (1-3 max)</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="remember-consent"
                checked={rememberConsent}
                onCheckedChange={(checked) => setRememberConsent(checked as boolean)}
              />
              <Label
                htmlFor="remember-consent"
                className="text-xs font-normal cursor-pointer"
              >
                Don't ask again (remember my preference)
              </Label>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Generate Image
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to check if user has given blanket consent for image generation
 */
export function useImageConsent() {
  const hasConsent = () => {
    return localStorage.getItem('leadstar_image_consent') === 'true';
  };

  const clearConsent = () => {
    localStorage.removeItem('leadstar_image_consent');
  };

  return { hasConsent, clearConsent };
}
