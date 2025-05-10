
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Leaf, Utensils, Home, Sparkles, Info, AlertTriangle, Loader2 } from 'lucide-react';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const MealResultPage: NextPage = () => {
  const router = useRouter();
  const { mealResult, mealPhoto, mealSuggestion, user, isLoading, setMealPhoto, setMealResult: clearMealResultAppContext } = useAppContext();
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && !mealResult) {
      router.push('/'); 
    }
  }, [user, mealResult, isLoading, router]);

  const handleGoBackHome = () => {
    setMealPhoto(null); // Clear photo from context
    clearMealResultAppContext(null); // Clear meal result from context
    router.push('/');
  };

  const handleLogAnother = () => {
    setMealPhoto(null);
    clearMealResultAppContext(null);
    router.push('/log-meal');
  };


  if (isLoading || !user) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header title="GreenBite" showBackButton={false} />
            <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground mt-4">Loading your meal results...</p>
            </main>
        </div>
    );
  }

  if (!mealResult) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header title="Meal Result" showBackButton={false} />
        <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
          <p className="text-destructive text-center">No meal result data available. Please log a meal first.</p>
          <Button onClick={() => router.push('/log-meal')} className="mt-4">Log Meal</Button>
        </main>
      </div>
    );
  }

  // foodItems are now directly from mealResult (user-confirmed list)
  const { foodItems = [], carbonFootprintKgCO2e = 0 } = mealResult;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Your Meal's Impact" showBackButton={false}/>
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center">
        <Card className="w-full max-w-lg shadow-lg mb-6 border-primary/20">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {mealPhoto ? (
                <img src={mealPhoto} alt="Meal" className="w-32 h-32 object-cover rounded-lg border" />
              ) : (
                <div className="w-32 h-32 bg-secondary rounded-lg flex items-center justify-center border">
                  <Utensils className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl text-center text-primary">Meal Carbon Footprint</CardTitle>
            <CardDescription className="text-center">
              Estimated CO₂e for your logged meal based on confirmed items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Total Estimated Footprint</p>
              <p className="text-3xl font-bold text-primary">
                {carbonFootprintKgCO2e.toFixed(2)} kg CO₂e
              </p>
            </div>

            {mealSuggestion && (
              <Alert variant="default" className="bg-accent/10 border-accent/30">
                <Sparkles className="h-5 w-5 text-accent" />
                <AlertTitle className="text-accent font-semibold">GreenBite Suggestion</AlertTitle>
                <AlertDescription className="text-accent/90">
                  {mealSuggestion}
                </AlertDescription>
                {/* Button for more details can be added later */}
              </Alert>
            )}

            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Leaf className="w-4 h-4 mr-2 text-primary" />Confirmed Item Breakdown</h3>
              <ScrollArea className="h-[150px] w-full border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Food Item</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end">
                          CO₂e (kg)
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 ml-1 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs max-w-xs">Per-item CO₂e is roughly estimated by dividing the total. The AI provides the overall meal footprint.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foodItems.length > 0 ? (
                      foodItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium capitalize">{item.name || 'Unknown Item'}</TableCell>
                          <TableCell>{item.quantity || 'N/A'}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {(carbonFootprintKgCO2e / (foodItems.length || 1)).toFixed(2)}*
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">No specific items identified or confirmed.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between">
            <Button variant="secondary" className="w-full sm:w-auto" onClick={handleLogAnother}>
              <Utensils className="mr-2 h-4 w-4" /> Log Another Meal
            </Button>
            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleGoBackHome}>
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default MealResultPage;
