
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Leaf, Utensils, Home, Sparkles, Info } from 'lucide-react'; // Added Sparkles, Info
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"; // Import Tooltip components

const MealResultPage: NextPage = () => {
  const router = useRouter();
  const { mealResult, mealPhoto, mealSuggestion, user, isLoading } = useAppContext(); // Get mealSuggestion
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false); // State for suggestion details

   useEffect(() => {
     if (!isLoading && !user) {
      router.push('/login');
     } else if (!isLoading && !mealResult) {
       // Redirect if no result is available (e.g., direct navigation)
       router.push('/'); // Go home if no result
     }
   }, [user, mealResult, isLoading, router]);


  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!mealResult) {
     // Added check to prevent rendering before redirect or if data is missing
     return (
        <div className="flex flex-col min-h-screen bg-background">
             <Header title="Meal Result" />
             <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                 <p className="text-muted-foreground">No meal result data available. Redirecting...</p>
             </main>
         </div>
     );
  }


  const { foodItems = [], carbonFootprintKgCO2e = 0 } = mealResult; // Default to empty/zero if undefined

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Meal Result" />
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center">
        <Card className="w-full max-w-lg shadow-lg mb-6">
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
              Estimated CO₂e for your logged meal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
               <p className="text-sm font-medium text-primary mb-1">Total Estimated Footprint</p>
               <p className="text-3xl font-bold text-primary">
                 {carbonFootprintKgCO2e.toFixed(2)} kg CO₂e
               </p>
             </div>

             {/* Display AI Suggestion if available */}
             {mealSuggestion && (
                <Alert variant="default" className="bg-accent/10 border-accent/30">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <AlertTitle className="text-accent font-semibold">Eco Suggestion</AlertTitle>
                    <AlertDescription className="text-accent/90">
                        {mealSuggestion}
                    </AlertDescription>
                     {/* Optional: Button to show more details in the future */}
                    {/* <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-accent/80 hover:text-accent" onClick={() => setShowSuggestionDetails(!showSuggestionDetails)}>
                        {showSuggestionDetails ? 'Hide Details' : 'Learn More'}
                    </Button>
                    {showSuggestionDetails && (
                        <div className="mt-2 text-xs text-accent/70">
                           (Future feature: Show alternative meal details or recipes)
                        </div>
                    )} */}
                </Alert>
             )}


            <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Leaf className="w-4 h-4 mr-2 text-primary"/>Item Breakdown</h3>
                <ScrollArea className="h-[150px] w-full border rounded-md"> {/* Reduced height slightly */}
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
                                {/* Show placeholder estimated per-item CO2e */}
                                 <TableCell className="text-right text-muted-foreground">
                                    {(carbonFootprintKgCO2e / (foodItems.length || 1)).toFixed(2)}*
                                 </TableCell>
                               </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center text-muted-foreground">No specific items identified.</TableCell>
                            </TableRow>
                          )}
                      </TableBody>
                    </Table>
                 </ScrollArea>
                  {/* {foodItems.length > 0 && (
                     <p className="text-xs text-muted-foreground mt-1 text-right">* Per-item CO₂e is estimated by dividing the total.</p>
                  )} */}
            </div>


          </CardContent>
           <CardFooter className="flex flex-col sm:flex-row gap-2 justify-between">
            <Link href="/log-meal" passHref>
              <Button variant="secondary" className="w-full sm:w-auto">
                <Utensils className="mr-2 h-4 w-4" /> Log Another Meal
              </Button>
            </Link>
             <Link href="/" passHref>
               <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                 <Home className="mr-2 h-4 w-4" /> Go Home
               </Button>
            </Link>
          </CardFooter>
        </Card>

      </main>
    </div>
  );
};

export default MealResultPage;

    