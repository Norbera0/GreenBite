
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
import { generateMealSuggestion } from '@/ai/flows/generate-meal-suggestion'; 
import type { FoodItem, AIIdentifiedFoodItem, FinalMealResult } from '@/context/app-context';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '@/components/ui/scroll-area';

const SUGGESTION_THRESHOLD_KG_CO2E = 2.0;

interface EditableFoodItem extends FoodItem {
  id: string; // For React key and local manipulation
}

const ReviewMealPage: NextPage = () => {
  const router = useRouter();
  const { 
    mealPhoto, 
    detectedMealItems, // Get AI detected items from context
    setMealResult, 
    addMealLog, 
    user, 
    isLoading: isAppContextLoading,
    setDetectedMealItems, // To clear after use
    setMealPhoto 
  } = useAppContext();
  
  const [editableItems, setEditableItems] = useState<EditableFoodItem[]>([]);
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
    } else if (detectedMealItems) {
      // Initialize editableItems from detectedMealItems
      setEditableItems(
        detectedMealItems.map((item, index) => ({
          id: `item-${Date.now()}-${index}`,
          name: item.name === "Unable to identify items" ? "" : item.name, // Clear placeholder if AI failed
          quantity: item.estimatedQuantity === "N/A" ? "" : item.estimatedQuantity,
        }))
      );
    } else {
        // If detectedMealItems is null (e.g. direct navigation or error in previous step)
        // Initialize with one empty item for manual entry
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

    setIsEstimating(true);
    setError(null);
    setEstimatingStep('Estimating footprint...'); 

    const foodItemsForAI: FoodItem[] = validItems.map(({ id, ...rest }) => rest);
    let suggestion: string | null = null;

    try {
      const footprintResult = await estimateMealCarbonFootprint({
        photoDataUri: mealPhoto, // Photo is still useful for context if AI uses it
        foodItems: foodItemsForAI,
      });

      const finalResultForContext: FinalMealResult = {
        foodItems: foodItemsForAI, // User-confirmed items
        carbonFootprintKgCO2e: footprintResult.carbonFootprintKgCO2e,
      };
      
      if(user?.email) {
         await addMealLog({ // Log the user-confirmed items
           photoDataUri: mealPhoto,
           foodItems: foodItemsForAI,
           totalCarbonFootprint: footprintResult.carbonFootprintKgCO2e,
         });
      }

      if (footprintResult.carbonFootprintKgCO2e > SUGGESTION_THRESHOLD_KG_CO2E) {
        setEstimatingStep('Generating suggestion...'); 
        try {
          const suggestionResult = await generateMealSuggestion({
            foodItems: foodItemsForAI,
            carbonFootprintKgCO2e: footprintResult.carbonFootprintKgCO2e,
          });
          suggestion = suggestionResult.suggestion;
        } catch (suggestionError) {
           console.error('Error generating suggestion:', suggestionError);
           toast({
             title: "Suggestion Failed",
             description: "Could not generate a meal suggestion, but footprint was calculated.",
             variant: "default", 
           });
        }
      }

      setMealResult(finalResultForContext, suggestion);
      setDetectedMealItems(null); // Clear detected items from context after processing

      toast({
        title: "Estimation Complete!",
        description: `CO₂e: ${footprintResult.carbonFootprintKgCO2e.toFixed(2)} kg. ${suggestion ? 'Suggestion available!' : ''}`,
        action: ( <Button variant="outline" size="sm" onClick={() => router.push('/meal-result')}>View</Button> ),
      });
      router.push('/meal-result');

    } catch (err) {
      console.error('Error processing meal:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to process meal: ${errorMessage}`);
      toast({ title: "Processing Failed", description: "Could not calculate footprint. Please try again.", variant: "destructive" });
    } finally {
      setIsEstimating(false);
      setEstimatingStep(''); 
    }
  };
  
  const handleGoBack = () => {
    // Clear context related to current meal logging attempt
    setMealPhoto(null);
    setDetectedMealItems(null);
    router.push('/log-meal');
  };


  if (isAppContextLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
  }

  if (!mealPhoto && !isAppContextLoading) { // Added !isAppContextLoading to prevent premature redirect
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
              AI has detected items from your photo. Review, edit, add, or remove items as needed.
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
                      disabled={isEstimating}
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
                      disabled={isEstimating}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={isEstimating || editableItems.length <= 1 && !item.name && !item.quantity} // Don't allow removing the last empty item easily
                    className="text-destructive hover:bg-destructive/10 h-9 w-9"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </ScrollArea>
            <Button variant="outline" onClick={handleAddItem} disabled={isEstimating} className="w-full border-primary text-primary hover:bg-primary/10">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>

            {error && (
              <div className="flex items-center p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            {isEstimating && (
              <div className="flex items-center justify-center text-sm text-primary p-2 bg-primary-light/30 rounded-md">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {estimatingStep || 'Processing...'}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleConfirmMeal}
              className="w-full h-12 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isEstimating || editableItems.every(item => !item.name.trim() || !item.quantity.trim())}
              aria-label="Confirm meal and estimate carbon footprint"
            >
              {isEstimating ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-5 w-5" />
              )}
              {isEstimating ? estimatingStep || 'Estimating...' : 'Confirm & Estimate CO₂e'}
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default ReviewMealPage;
