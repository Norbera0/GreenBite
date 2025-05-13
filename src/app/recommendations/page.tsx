"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import type { FoodSwap, ChatMessage } from '@/context/app-context'; 
import { Lightbulb, RefreshCcw, Sparkles, Bot, Send, Info, Trash2, ChevronRight, Loader2 } from 'lucide-react'; // Added Loader2
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';


const RecommendationsPage: NextPage = () => {
  const router = useRouter();
  const { 
    user, 
    isLoading: isAppContextLoading,
    generalRecommendation,
    isLoadingGeneralRecommendation,
    fetchGeneralRecommendation,
    foodSwaps,
    isLoadingFoodSwaps,
    fetchFoodSwaps,
    updateFoodSwapTryThis,
    chatMessages,
    isLoadingChatResponse,
    sendChatMessage,
    clearChatMessages
  } = useAppContext();
  const { toast } = useToast();
  const [chatInput, setChatInput] = useState('');
  const chatScrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAppContextLoading && !user) {
      router.push('/login');
    } else if (user) {
      if(!generalRecommendation && !isLoadingGeneralRecommendation) fetchGeneralRecommendation();
      if(foodSwaps.length === 0 && !isLoadingFoodSwaps) fetchFoodSwaps();
    }
  }, [user, isAppContextLoading, router, fetchGeneralRecommendation, fetchFoodSwaps, generalRecommendation, foodSwaps, isLoadingGeneralRecommendation, isLoadingFoodSwaps]);

  useEffect(() => {
    if (chatScrollAreaRef.current) {
      chatScrollAreaRef.current.scrollTo({ top: chatScrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleRefreshGeneralTip = () => {
    fetchGeneralRecommendation(true);
    toast({ title: "Refreshing Your Wisdom!", description: "Getting a new tip, just for you!" });
  };

  const handleRefreshFoodSwaps = () => {
    fetchFoodSwaps(true);
    toast({ title: "Shaking Up Swaps!", description: "Fetching fresh food swap ideas!" });
  };
  
  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput('');
  };

  if (isAppContextLoading || !user) {
    return (
        <div className="flex flex-col min-h-screen bg-secondary/30">
            <Header title="GreenBite Wisdom" />
            <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                <Lightbulb className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-muted-foreground mt-2">Loading your GreenBite wisdom...</p>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header title="GreenBite Wisdom" />
      <main className="flex-grow container mx-auto p-4 space-y-6">
        
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-primary flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-accent" /> ✨ Your Weekly Wisdom!
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRefreshGeneralTip} disabled={isLoadingGeneralRecommendation} aria-label="Refresh general tip">
                {isLoadingGeneralRecommendation ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-h-[60px]">
            {isLoadingGeneralRecommendation ? (
              <div className="flex justify-center items-center h-full">
                 <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : generalRecommendation ? (
              <p className="text-foreground">{generalRecommendation}</p>
            ) : (
              <p className="text-muted-foreground">No tip available yet. Log some meals to get personalized wisdom!</p>
            )}
          </CardContent>
        </Card>

        
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
             <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-primary flex items-center">
                    <RefreshCcw className="w-5 h-5 mr-2 text-primary" /> 🔄 Smart Swaps for a Greener Plate!
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleRefreshFoodSwaps} disabled={isLoadingFoodSwaps} aria-label="Refresh food swaps">
                    {isLoadingFoodSwaps ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
                </Button>
            </div>
            <CardDescription>AI-suggested changes to lower your carbon footprint and eat greener!</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[250px]">
            {isLoadingFoodSwaps ? (
              <div className="flex justify-center items-center h-[250px]">
                 <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : foodSwaps && foodSwaps.length > 0 ? (
              <ScrollArea className="h-[250px] pr-3">
                <ul className="space-y-4">
                  {foodSwaps.map((swap, index) => (
                    <li key={index} className="p-4 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-semibold text-foreground">
                          <span className="text-red-500 line-through">{swap.originalItem}</span>
                          <ChevronRight className="inline w-4 h-4 mx-1 text-muted-foreground" />
                          <span className="text-green-600">{swap.suggestedItem}</span>
                        </h4>
                        <div className="flex items-center space-x-2">
                            <Label htmlFor={`try-this-${index}`} className="text-xs text-muted-foreground">Try This!</Label>
                            <Switch
                                id={`try-this-${index}`}
                                checked={(swap as any).tryThis} 
                                onCheckedChange={(checked) => updateFoodSwapTryThis(index, checked)}
                                aria-label={`Mark ${swap.suggestedItem} as 'Try This'`}
                            />
                        </div>
                      </div>
                      <p className="text-sm text-primary mb-1">{swap.co2eSavingEstimate}</p>
                      {swap.details && <p className="text-xs text-muted-foreground">{swap.details}</p>}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4">Log more meals for personalized swap ideas! Keep eating green!</p>
            )}
          </CardContent>
        </Card>

        
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center">
              <Bot className="w-5 h-5 mr-2" /> 🤖 Chat with Your GreenBite Guide!
            </CardTitle>
            <CardDescription>Ask about low-carbon eating, get ideas, or learn more. Your meal history adds context!</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] border rounded-md p-3 mb-4 bg-muted/30" ref={chatScrollAreaRef}>
              {chatMessages.length === 0 && (
                <p className="text-muted-foreground text-center py-10">Ask your GreenBite Guide anything about sustainable eating!</p>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-2 rounded-lg max-w-[80%] ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground border'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
               {isLoadingChatResponse && (
                <div className="flex justify-start mb-2">
                    <div className="p-2 rounded-lg bg-card text-card-foreground border">
                        <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                </div>
                )}
            </ScrollArea>
            <form onSubmit={handleChatSubmit} className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Ask a question..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-grow bg-card"
                disabled={isLoadingChatResponse}
              />
              <Button type="submit" size="icon" disabled={isLoadingChatResponse || !chatInput.trim()} aria-label="Send chat message">
                {isLoadingChatResponse ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </form>
          </CardContent>
          {chatMessages.length > 0 && (
            <CardFooter>
                 <Button variant="outline" size="sm" onClick={() => { clearChatMessages(); toast({title: "Chat Cleared"})}} disabled={isLoadingChatResponse}>
                    <Trash2 className="w-4 h-4 mr-2" /> Clear Chat
                </Button>
            </CardFooter>
          )}
        </Card>

        <Card className="shadow-lg border-primary/20">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 text-md text-primary hover:no-underline">
                <div className="flex items-center">
                    <Info className="w-5 h-5 mr-2" /> 💡 How It Works
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-0">
                <p className="text-sm text-muted-foreground">
                  GreenBite's AI analyzes your logged meals—what you eat and how much. Using data on food carbon footprints, it spots patterns and high-impact items. Then, it crafts personalized tips and lower-carbon swaps just for you, all based on your logs from the last 7 days. Eat smarter, live greener!
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

      </main>
    </div>
  );
};

export default RecommendationsPage;
