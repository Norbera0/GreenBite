
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2 } from 'lucide-react';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { identifyFoodItemsAndQuantities } from '@/ai/flows/identify-food-items-and-quantities-from-photo';
import { useToast } from '@/hooks/use-toast';

const LogMealPage: NextPage = () => {
  const router = useRouter();
  const { setMealPhoto, setDetectedMealItems, isLoading: isAppContextLoading, user } = useAppContext();
  const { toast } = useToast();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAppContextLoading && !user) {
      router.push('/login');
    }
  }, [user, isAppContextLoading, router]);

  const handlePhotoProcessed = useCallback(async (dataUri: string) => {
    setPhotoPreview(dataUri);
    setMealPhoto(dataUri); 
    setError(null);

    try {
      setIsProcessing(true); 
      const detectionResult = await identifyFoodItemsAndQuantities({ photoDataUri: dataUri });
      
      if (detectionResult.identifiedItems && detectionResult.identifiedItems.length > 0 && detectionResult.identifiedItems[0].name !== "Unable to identify items") {
        setDetectedMealItems(detectionResult.identifiedItems);
        toast({
          title: "Meal Items Spotted!",
          description: "Let's review the items and quantities next.",
        });
      } else {
        setDetectedMealItems([]); 
         toast({
          title: "Hmm, Can't Quite See...",
          description: "No worries! Please add items manually on the next screen.",
          variant: "default"
        });
      }
      router.push('/review-meal');
    } catch (aiError) {
      console.error("AI food item detection error:", aiError);
      setError('Oops! Failed to detect food items. Please try again or add manually.');
      setDetectedMealItems([]); 
       toast({
          title: "AI Hiccup!",
          description: "Couldn't auto-detect items. You can add them manually!",
          variant: "destructive",
        });
      router.push('/review-meal'); 
    } finally {
      setIsProcessing(false);
    }
  }, [router, setMealPhoto, setDetectedMealItems, toast]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true); 
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        handlePhotoProcessed(dataUri); 
      };
      reader.onerror = () => {
        setError('Oops! Failed to read the image file.');
        setIsProcessing(false);
        toast({
          title: "Image Read Error",
          description: "Could not process the selected image file. Please try another!",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  }, [handlePhotoProcessed, toast]);

  const handleTakePhotoClick = () => {
    fileInputRef.current?.click();
  };

  if (isAppContextLoading || !user) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header title="GreenBite" />
            <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                 <Loader2 className="h-12 w-12 animate-spin text-primary" />
                 <p className="text-muted-foreground mt-4">Loading your GreenBite experience...</p>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Snap Your Meal!" /> {/* Updated header title */}
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Capture Your Delicious Meal</CardTitle> {/* Updated card title */}
            <CardDescription className="text-center">
              Snap a photo! GreenBite AI will work its magic to identify items for you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload meal photo"
            />

            {photoPreview ? (
              <div className="w-full aspect-[4/3] border rounded-md overflow-hidden flex items-center justify-center bg-muted"> {/* Changed to aspect ratio */}
                <img src={photoPreview} alt="Meal preview" className="object-contain w-full h-full" /> {/* Changed to object-contain */}
              </div>
            ) : (
              <div className="w-full aspect-[4/3] border-2 border-dashed border-border rounded-md flex items-center justify-center bg-secondary/50 text-muted-foreground"> {/* Changed to aspect ratio */}
                {isProcessing ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <Camera className="h-12 w-12" />}
              </div>
            )}

            {error && <p className="text-destructive text-sm text-center px-2">{error}</p>}

            <Button
              onClick={handleTakePhotoClick}
              className="w-full h-14 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isProcessing}
              aria-label="Take or Upload Photo"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                photoPreview ? <Upload className="mr-2 h-5 w-5" /> : <Camera className="mr-2 h-5 w-5" />
              )}
              {isProcessing ? 'Analyzing...' : (photoPreview ? 'Change Photo' : '📷 Snap Your Meal!')} {/* Updated button text */}
            </Button>
            <p className="text-xs text-muted-foreground text-center px-4">
              Clear, well-lit photos help our AI see your meal best!
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LogMealPage;
