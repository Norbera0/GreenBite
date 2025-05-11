
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Leaf, Utensils, Home, Sparkles, Info, AlertTriangle, Loader2, Zap, MessageCircle, CheckCircle } from 'lucide-react'; 
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils'; 

const MealResultPage: NextPage = () => {
  const router = useRouter();
  const { mealResult, mealPhoto, user, isLoading, setMealPhoto, setMealResult: clearMealResultAppContext } = useAppContext();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && !mealResult) {
      router.push('/'); 
    }
  }, [user, mealResult, isLoading, router]);

  const handleGoBackHome = () => {
    setMealPhoto(null); 
    clearMealResultAppContext(null); 
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
          <p className="text-destructive text-center">No meal result data found. Please log a meal first.</p>
          <Button onClick={() => router.push('/log-meal')} className="mt-4">Log Meal</Button>
        </main>
      </div>
    );
  }

  const { 
    foodItems = [], 
    carbonFootprintKgCO2e = 0,
    carbonEquivalency,
    mealFeedbackMessage,
    impactLevel 
  } = mealResult;

  const getImpactAlertVariant = () => {
    if (impactLevel === 'High') return 'destructive';
    if (impactLevel === 'Medium') return 'default'; 
    if (impactLevel === 'Low') return 'default'; 
    return 'default';
  };
  
  const getImpactAlertIcon = () => {
    if (impactLevel === 'High') return <AlertTriangle className="h-5 w-5 text-destructive" />;
    if (impactLevel === 'Medium') return <Info className="h-5 w-5 text-primary" />; 
    if (impactLevel === 'Low') return <CheckCircle className="h-5 w-5 text-green-500" />; 
    return <Sparkles className="h-5 w-5 text-accent" />;
  };

  const impactAlertClasses = cn(
    "border",
    impactLevel === 'High' ? "bg-destructive/10 border-destructive/30 text-destructive" :
    impactLevel === 'Medium' ? "bg-primary/10 border-primary/30 text-primary" :
    impactLevel === 'Low' ? "bg-green-500/10 border-green-500/30 text-green-700" :
    "bg-accent/10 border-accent/30" 
  );


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Your Meal's Green Impact!" showBackButton={false}/> {/* Updated header title */}
      <main className="flex-grow container mx-auto p-4 flex flex-col items-center">
        <Card className="w-full max-w-lg shadow-lg mb-6 border-primary/20">
          <CardHeader>
            <div className="flex justify-center mb-4">
              {mealPhoto ? (
                <img src={mealPhoto} alt="Meal" className="w-32 h-32 object-cover rounded-lg border" data-ai-hint="logged meal" />
              ) : (
                <div className="w-32 h-32 bg-secondary rounded-lg flex items-center justify-center border" data-ai-hint="utensils plate">
                  <Utensils className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl text-center text-primary">Your Meal's Eco-Score</CardTitle> {/* Updated card title */}
            <CardDescription className="text-center">
              Here's the scoop on your meal's carbon footprint and some friendly feedback!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-primary mb-1">Total Green Impact</p> {/* Updated text */}
              <p className="text-3xl font-bold text-primary">
                {carbonFootprintKgCO2e.toFixed(2)} kg CO₂e
              </p>
            </div>

            {carbonEquivalency && (
              <Alert variant="default" className="bg-secondary/50 border-border">
                <Zap className="h-5 w-5 text-primary" />
                <AlertTitle className="text-primary font-semibold">Eco Fact!</AlertTitle> {/* Updated title */}
                <AlertDescription className="text-foreground/80">
                  {carbonEquivalency}
                </AlertDescription>
              </Alert>
            )}
            
            {mealFeedbackMessage && (
              <Alert className={impactAlertClasses} variant={getImpactAlertVariant()}>
                {getImpactAlertIcon()}
                <AlertTitle className="font-semibold">GreenBite Feedback</AlertTitle>
                <AlertDescription>
                  {mealFeedbackMessage}
                </AlertDescription>
              </Alert>
            )}


            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center"><Leaf className="w-4 h-4 mr-2 text-primary" />Your Meal Items</h3> {/* Updated text */}
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
