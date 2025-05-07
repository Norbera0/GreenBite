"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input'; // Not used
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'; // Removed Sparkles as it's not used directly here
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { estimateCarbonFootprintFromMealPhoto } from '@/ai/flows/estimate-carbon-footprint'; 
import { generateMealSuggestion } from '@/ai/flows/generate-meal-suggestion'; 
import type { EstimateCarbonFootprintFromMealPhotoOutput } from '@/ai/schemas'; 
import { useToast } from "@/hooks/use-toast";

const SUGGESTION_THRESHOLD_KG_CO2E = 2.0;

const ReviewMealPage: NextPage = () => {
  const router = useRouter();
  const { mealPhoto, setMealResult, addMealLog, user, isLoading: isAppContextLoading } = useAppContext();
  const [quantityAndUnits, setQuantityAndUnits] = useState('');
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimatingStep, setEstimatingStep] = useState(''); 
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

   useEffect(() => {
    if (!isAppContextLoading && !user) {
      router.push('/login');
    } else if (!isAppContextLoading && !mealPhoto) {
      toast({
        title: "No Meal Photo Found",
        description: "Please log a meal again.",
        variant: "destructive",
      });
      router.push('/log-meal');
    }
  }, [user, mealPhoto, isAppContextLoading, router, toast]);


  const handleConfirmMeal = async () => {
    if (!mealPhoto) {
      setError('No meal photo found. Please go back and take a photo.');
      return;
    }
     if (!quantityAndUnits.trim()) {
      setError('Please describe the quantity and units of your meal.');
      toast({
        title: "Missing Quantity",
        description: "Please enter the quantity and units for your meal.",
        variant: "destructive",
      });
      return;
    }

    setIsEstimating(true);
    setError(null);
    setEstimatingStep('Estimating footprint...'); 

    let suggestion: string | null = null;

    try {
      console.log("Sending to AI for footprint estimation:", { photoDataUri: mealPhoto, quantityAndUnits });
      const result: EstimateCarbonFootprintFromMealPhotoOutput = await estimateCarbonFootprintFromMealPhoto({
        photoDataUri: mealPhoto,
        quantityAndUnits: quantityAndUnits,
      });
      console.log("AI Footprint Result:", result);

      if(user?.email) {
         await addMealLog({ // Pass only necessary fields
           userEmail: user.email,
           // date and timestamp will be set in AppContext
           photoDataUri: mealPhoto,
           foodItems: result.foodItems,
           totalCarbonFootprint: result.carbonFootprintKgCO2e,
         });
      }

       if (result.carbonFootprintKgCO2e > SUGGESTION_THRESHOLD_KG_CO2E) {
         setEstimatingStep('Generating suggestion...'); 
         console.log("Footprint is high, generating suggestion...");
          try {
            const suggestionResult = await generateMealSuggestion({
              foodItems: result.foodItems,
              carbonFootprintKgCO2e: result.carbonFootprintKgCO2e,
            });
            suggestion = suggestionResult.suggestion;
            console.log("AI Suggestion Result:", suggestion);
          } catch (suggestionError) {
             console.error('Error generating suggestion:', suggestionError);
             toast({
               title: "Suggestion Generation Failed",
               description: "Could not generate a meal suggestion, but the footprint was calculated.",
               variant: "default", 
             });
          }
       }

      setMealResult(result, suggestion);

      toast({
        title: "Estimation Complete",
        description: `Carbon footprint calculated: ${result.carbonFootprintKgCO2e.toFixed(2)} kg CO₂e${suggestion ? '. Suggestion available!' : ''}`,
        action: (
           <Button variant="outline" size="sm" onClick={() => router.push('/meal-result')}>
            View Details
          </Button>
        ),
      });

      router.push('/meal-result');
    } catch (err) {
      console.error('Error estimating carbon footprint:', err);
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during estimation.';
      setError(`Failed to estimate carbon footprint: ${errorMessage}`);
      toast({
        title: "Estimation Failed",
        description: "Could not calculate the carbon footprint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
      setEstimatingStep(''); 
    }
  };

  if (isAppContextLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!mealPhoto) {
     return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header title="Review Meal" />
            <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                <p className="text-destructive">No meal photo data. Redirecting...</p>
            </main>
        </div>
     );
  }


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Review Meal" />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Review Your Meal</CardTitle>
            <CardDescription className="text-center">
              Confirm the details. AI will estimate the footprint and may offer suggestions for high-impact meals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="w-full h-64 border rounded-md overflow-hidden flex items-center justify-center bg-muted">
              {mealPhoto ? (
                <img src={mealPhoto} alt="Your Meal" className="object-cover w-full h-full" />
              ) : (
                <p className="text-muted-foreground">No photo loaded</p>
              )}
            </div>

             <div>
              <Label htmlFor="quantity">Quantity & Units</Label>
              <Textarea
                id="quantity"
                placeholder="e.g., 'Large bowl', '200g chicken, 1 cup rice', '3 slices pizza'"
                value={quantityAndUnits}
                onChange={(e) => setQuantityAndUnits(e.target.value)}
                className="mt-1 min-h-[80px] bg-card"
                required
                aria-label="Enter quantity and units for the meal"
              />
               <p className="text-xs text-muted-foreground mt-1">
                 Describe the amount of food. Be as specific as you can.
               </p>
            </div>

             {error && (
              <div className="flex items-center p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

             {isEstimating && (
               <div className="flex items-center justify-center text-sm text-primary">
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 {estimatingStep || 'Processing...'}
               </div>
            )}


          </CardContent>
          <CardFooter>
            <Button
              onClick={handleConfirmMeal}
              className="w-full h-12 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isEstimating || !quantityAndUnits.trim()}
              aria-label="Confirm meal and estimate carbon footprint"
            >
              {isEstimating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {isEstimating ? estimatingStep || 'Estimating...' : 'Confirm & Estimate'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default ReviewMealPage;
