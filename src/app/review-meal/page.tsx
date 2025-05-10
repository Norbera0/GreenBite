
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle, PlusCircle, Trash2, Utensils } from 'lucide-react';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { estimateMealCarbonFootprint } from '@/ai/flows/estimate-carbon-footprint'; 
// import { generateMealSuggestion } from '@/ai/flows/generate-meal-suggestion'; // Replaced by generateMealFeedback
import { generateCarbonEquivalency } from '@/ai/flows/generate-carbon-equivalency';
import { generateMealFeedback } from '@/ai/flows/generate-meal-feedback';
import type { FoodItem, AIIdentifiedFoodItem, FinalMealResult } from '@/context/app-context';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

// const SUGGESTION_THRESHOLD_KG_CO2E = 2.0; // This logic is now handled by generateMealFeedback

interface EditableFoodItem extends FoodItem {
  id: string; // For React key and local manipulation
}

const ReviewMealPage: NextPage = () => {
  const router = useRouter();
  const { 
    mealPhoto, 
    detectedMealItems, 
    setMealResult, 
    addMealLog, 
    user, 
    isLoading: isAppContextLoading,
    setDetectedMealItems, 
    setMealPhoto 
  } = useAppContext();
  
  const [editableItems, setEditableItems] = useState<EditableFoodItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(''); 
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
    } else if (detectedMealItems) {
      setEditableItems(
        detectedMealItems.map((item, index) => ({
          id: `item-${Date.now()}-${index}`,
          name: item.name === "Unable to identify items" ? "" : item.name, 
          quantity: item.estimatedQuantity === "N/A" ? "" : item.estimatedQuantity,
        }))
      );
    } else {
        setEditableItems([{ id: `item-${Date.now()}-0`, name: '', quantity: '' }]);
    }
  }, [user, mealPhoto, detectedMealItems, isAppContextLoading, router, toast]);

  const handleItemChange = (id: string, field: 'name' | 'quantity', value: string) => {
    setEditableItems(prevItems =>
      prevItems.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddItem = () => {
    setEditableItems(prevItems => [
      ...prevItems,
      { id: `item-${Date.now()}-${prevItems.length}`, name: '', quantity: '' },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setEditableItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleConfirmMeal = async () => {
    if (!mealPhoto) {
      setError('No meal photo found. Please go back and take a photo.');
      toast({ title: "Missing Photo", description: "Please re-upload your meal photo.", variant: "destructive" });
      return;
    }
    
    const validItems = editableItems.filter(item => item.name.trim() && item.quantity.trim());
    if (validItems.length === 0) {
      setError('Please add at least one food item with its quantity.');
      toast({ title: "Missing Items", description: "Add food items and quantities before confirming.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    const foodItemsForAI: FoodItem[] = validItems.map(({ id, ...rest }) => rest);
    let finalResultForContext: FinalMealResult | null = null;

    try {
      setProcessingStep('Estimating footprint...'); 
      const footprintResult = await estimateMealCarbonFootprint({
        photoDataUri: mealPhoto,
        foodItems: foodItemsForAI,
      });

      if (!user?.email) {
          throw new Error("User session not found. Please log in again.");
      }

      // Add meal log to context (and localStorage)
      // This addMealLog now returns the basic FinalMealResult without AI extras yet
      const loggedMealBasicResult = await addMealLog({ 
           photoDataUri: mealPhoto,
           foodItems: foodItemsForAI,
           totalCarbonFootprint: footprintResult.carbonFootprintKgCO2e,
      });

      if (!loggedMealBasicResult) {
        throw new Error("Failed to log meal before fetching additional AI details.");
      }

      finalResultForContext = { ...loggedMealBasicResult }; // Start with basic result

      setProcessingStep('Generating equivalency...');
      const equivalencyResult = await generateCarbonEquivalency({
        carbonFootprintKgCO2e: footprintResult.carbonFootprintKgCO2e,
      });
      finalResultForContext.carbonEquivalency = equivalencyResult.equivalency;

      setProcessingStep('Generating feedback...');
      const feedbackResult = await generateMealFeedback({
        foodItems: foodItemsForAI,
        carbonFootprintKgCO2e: footprintResult.carbonFootprintKgCO2e,
      });
      finalResultForContext.mealFeedbackMessage = feedbackResult.feedbackMessage;
      finalResultForContext.impactLevel = feedbackResult.impactLevel;
      
      setMealResult(finalResultForContext); // Update context with all info
      setDetectedMealItems(null); 

      toast({
        title: "Meal Processed!",
        description: `CO₂e: ${footprintResult.carbonFootprintKgCO2e.toFixed(2)} kg. View details now.`,
        // Action removed as navigation is immediate
      });
      router.push('/meal-result');

    } catch (err) {
      console.error('Error processing meal:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to process meal: ${errorMessage}`);
      toast({ title: "Processing Failed", description: `Could not process your meal. ${errorMessage}`, variant: "destructive" });
      if (finalResultForContext && finalResultForContext.carbonFootprintKgCO2e) {
        // If footprint was calculated but other AI calls failed, still show basic result
        setMealResult(finalResultForContext);
        router.push('/meal-result');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep(''); 
    }
  };
  
  const handleGoBack = () => {
    setMealPhoto(null);
    setDetectedMealItems(null);
    router.push('/log-meal');
  };


  if (isAppContextLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  if (!mealPhoto && !isAppContextLoading) { 
     return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header title="Review Meal" showBackButton={false}/>
            <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
                <p className="text-destructive text-center">No meal photo data. Please start by logging a meal.</p>
                <Button onClick={() => router.push('/log-meal')} className="mt-4">Log Meal</Button>
            </main>
        </div>
     );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Review & Confirm Meal" showBackButton={true} onBackClick={handleGoBack}/>
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center">
        <Card className="w-full max-w-lg shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-primary">Confirm Your Meal Items</CardTitle>
            <CardDescription className="text-center">
              AI may have detected items from your photo. Review, edit, add, or remove items as needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mealPhoto && (
              <div className="w-full h-48 sm:h-64 border rounded-md overflow-hidden flex items-center justify-center bg-muted mb-4">
                <img src={mealPhoto} alt="Your Meal" className="object-cover w-full h-full" />
              </div>
            )}

            <Label className="text-md font-semibold text-primary">Food Items & Quantities</Label>
            <ScrollArea className="h-[200px] w-full border p-3 rounded-md bg-card">
              {editableItems.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">No items detected or added yet. Click "Add Item" below.</p>
              )}
              {editableItems.map((item, index) => (
                <div key={item.id} className="flex items-end space-x-2 mb-3 p-2 border-b border-border last:border-b-0">
                  <div className="flex-grow space-y-1">
                    <Label htmlFor={`item-name-${index}`} className="text-xs">Item Name</Label>
                    <Input
                      id={`item-name-${index}`}
                      placeholder="e.g., Chicken Breast"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                      className="text-sm h-9"
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex-grow space-y-1">
                    <Label htmlFor={`item-quantity-${index}`} className="text-xs">Quantity</Label>
                    <Input
                      id={`item-quantity-${index}`}
                      placeholder="e.g., 150g or 1 piece"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                      className="text-sm h-9"
                      disabled={isProcessing}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isProcessing || editableItems.length <= 1 && !item.name && !item.quantity} 
                    className="text-destructive hover:bg-destructive/10 h-9 w-9"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
            <Button variant="outline" onClick={handleAddItem} disabled={isProcessing} className="w-full border-primary text-primary hover:bg-primary/10">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>

            {error && (
              <div className="flex items-center p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center text-sm text-primary p-2 bg-primary-light/30 rounded-md">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {processingStep || 'Processing...'}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleConfirmMeal}
              className="w-full h-12 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isProcessing || editableItems.every(item => !item.name.trim() || !item.quantity.trim())}
              aria-label="Confirm meal and estimate carbon footprint"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {isProcessing ? processingStep || 'Estimating...' : 'Confirm & View Impact'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default ReviewMealPage;
```