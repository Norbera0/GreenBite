"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2 } from 'lucide-react';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';

const LogMealPage: NextPage = () => {
  const router = useRouter();
  const { setMealPhoto, isLoading: isAppContextLoading, user } = useAppContext();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAppContextLoading && !user) {
      router.push('/login');
    }
  }, [user, isAppContextLoading, router]);


  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUri = reader.result as string;
        setPhotoPreview(dataUri);
        setMealPhoto(dataUri); // Store in context
        setIsProcessing(false);
        router.push('/review-meal'); // Navigate after setting photo
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  }, [router, setMealPhoto]);


  const handleTakePhotoClick = () => {
    fileInputRef.current?.click();
  };

   if (isAppContextLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Log Meal" />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Capture Your Meal</CardTitle>
            <CardDescription className="text-center">
              Take or upload a photo of your meal to begin the carbon footprint estimation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
             <input
                type="file"
                accept="image/*"
                capture="environment" // Prioritize back camera
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload meal photo"
             />

            {photoPreview ? (
               <div className="w-full h-64 border rounded-md overflow-hidden flex items-center justify-center bg-muted">
                <img src={photoPreview} alt="Meal preview" className="object-cover w-full h-full" />
              </div>
             ) : (
                 <div className="w-full h-64 border-2 border-dashed border-border rounded-md flex items-center justify-center bg-secondary/50 text-muted-foreground">
                    {isProcessing ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : <Camera className="h-12 w-12" />}
                 </div>
             )}

             {error && <p className="text-destructive text-sm">{error}</p>}

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
              {isProcessing ? 'Processing...' : (photoPreview ? 'Upload New Photo' : 'Take / Upload Photo')}
            </Button>
             <p className="text-xs text-muted-foreground text-center px-4">
               Clear photos work best for AI identification. Ensure good lighting.
             </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LogMealPage;
