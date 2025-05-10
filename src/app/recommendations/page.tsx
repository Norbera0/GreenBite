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
import type { FoodSwap, ChatMessage } from '@/context/app-context'; // Using FoodSwap from context after adding tryThis
import { Lightbulb, RefreshCcw, Sparkles, Bot, Send, Info, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
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
      fetchGeneralRecommendation();
      fetchFoodSwaps();
    }
  }, [user, isAppContextLoading, router, fetchGeneralRecommendation, fetchFoodSwaps]);

  useEffect(() => {
    // Scroll to bottom of chat messages
    if (chatScrollAreaRef.current) {
      chatScrollAreaRef.current.scrollTo({ top: chatScrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleRefreshGeneralTip = () => {
    fetchGeneralRecommendation(true);
    toast({ title: "Tip Refreshing", description: "Getting a new tip for you!" });
  };

  const handleRefreshFoodSwaps = () => {
    fetchFoodSwaps(true);
    toast({ title: "Food Swaps Refreshing", description: "Fetching new swap suggestions!" });
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
            <Header title="Recommendations" />
            <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
                <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-muted-foreground mt-2">Loading recommendations...</p>
            </main>
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header title="Recommendations" />
      <main className="flex-grow container mx-auto p-4 space-y-6">
        {/* Block 1: General Recommendation Tip */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-primary flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" /> Your AI Tip This Week
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleRefreshGeneralTip} disabled={isLoadingGeneralRecommendation} aria-label="Refresh general tip">
                <RefreshCcw className={`w-5 h-5 ${isLoadingGeneralRecommendation ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingGeneralRecommendation ? (
              <Skeleton className="h-10 w-full" />
            ) : generalRecommendation ? (
              <p className="text-foreground">{generalRecommendation}</p>
            ) : (
              <p className="text-muted-foreground">No tip available. Try logging some meals!</p>
            )}
          </CardContent>
        </Card>

        {/* Block 2: Food Recommendations List */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
             <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-primary flex items-center">
                    <Sparkles className="w-5 h-5 mr-2" /> Food Swaps & Suggestions
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={handleRefreshFoodSwaps} disabled={isLoadingFoodSwaps} aria-label="Refresh food swaps">
                    <RefreshCcw className={`w-5 h-5 ${isLoadingFoodSwaps ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <CardDescription>AI-suggested changes to lower your carbon footprint.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingFoodSwaps ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : foodSwaps && foodSwaps.length > 0 ? (
              <ScrollArea className="h-[250px] pr-3">
                <ul className="space-y-4">
                  {foodSwaps.map((swap, index) => (
                    <li key={index} className="p-4 border rounded-lg bg-card shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-semibold text-foreground">
                          <span className="text-red-500 line-through">{swap.originalItem}</span>
                          <ChevronRight className="inline w-4 h-4 mx-1 text-muted-foreground" />
                          <span className="text-green-600">{swap.suggestedItem}</span>
                        </h4>
                        {/* tryThis is not part of the initial schema from AI, but added in context */}
                        <div className="flex items-center space-x-2">
                            <Label htmlFor={`try-this-${index}`} className="text-xs text-muted-foreground">Try This</Label>
                            <Switch
                                id={`try-this-${index}`}
                                checked={(swap as any).tryThis} // Cast to any if tryThis is not in FoodSwap from schemas
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
              <p className="text-muted-foreground text-center py-4">No specific food swaps available. Log more meals for personalized suggestions!</p>
            )}
          </CardContent>
        </Card>

        {/* Block 3: Ask the AI Chatbot */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center">
              <Bot className="w-5 h-5 mr-2" /> Ask the AI
            </CardTitle>
            <CardDescription>Get answers about low-carbon eating using your meal history for context.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] border rounded-md p-3 mb-4 bg-muted/30" ref={chatScrollAreaRef}>
              {chatMessages.length === 0 && (
                <p className="text-muted-foreground text-center py-10">Ask a question to start the chat!</p>
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
                {isLoadingChatResponse ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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

        {/* Block 4: How These Suggestions Work */}
        <Card className="shadow-lg border-primary/20">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b-0">
              <AccordionTrigger className="px-6 py-4 text-md text-primary hover:no-underline">
                <div className="flex items-center">
                    <Info className="w-5 h-5 mr-2" /> How These Suggestions Work
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4 pt-0">
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes your logged meals, focusing on food types and quantities. Using established data on the carbon footprint of common foods, it identifies patterns and higher-impact items in your diet. Based on this, it suggests lower-carbon alternatives and provides general tips to help you make more sustainable choices. All suggestions are personalized based on your logging history over the last 7 days.
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
