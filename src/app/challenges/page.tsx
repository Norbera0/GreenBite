
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import { CheckCircle, RefreshCcw, Target, Flame, Trophy, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const ChallengesPage: NextPage = () => {
  const router = useRouter();
  const { 
    user, 
    isLoading: isAppContextLoading, 
    dailyChallenge, 
    weeklyChallenge, 
    streakData,
    refreshDailyChallenge 
  } = useAppContext();

  useEffect(() => {
    if (!isAppContextLoading && !user) {
      router.push('/login');
    }
  }, [user, isAppContextLoading, router]);

  if (isAppContextLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary/30">
        <Header title="Challenges" />
        <main className="flex-grow container mx-auto p-4 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </main>
      </div>
    );
  }

  const dailyChallengeProgress = dailyChallenge?.isCompleted ? 100 : 0;
  const weeklyChallengeProgress = weeklyChallenge && weeklyChallenge.targetValue > 0 
    ? Math.min((weeklyChallenge.currentValue / weeklyChallenge.targetValue) * 100, 100) 
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header title="Challenges" />
      <main className="flex-grow container mx-auto p-4 space-y-6">
        {/* Daily Challenge Card */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-primary flex items-center">
                <Target className="w-5 h-5 mr-2" /> Today's Challenge
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={refreshDailyChallenge} aria-label="Refresh daily challenge">
                <RefreshCcw className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="min-h-[80px]">
            {dailyChallenge ? (
              <div className="flex items-start space-x-3">
                {dailyChallenge.isCompleted ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                ) : (
                  <Sparkles className="w-6 h-6 text-accent mt-1 flex-shrink-0" />
                )}
                <div>
                  <p className="text-md font-medium text-foreground">{dailyChallenge.description}</p>
                  {dailyChallenge.type === 'co2e_under_today' && (
                     <p className="text-xs text-muted-foreground">Target: {dailyChallenge.targetValue} kg CO₂e</p>
                  )}
                   {dailyChallenge.type === 'log_low_co2e_meal' && (
                     <p className="text-xs text-muted-foreground">Log a meal under {dailyChallenge.targetValue} kg CO₂e</p>
                  )}
                  <p className={`text-sm font-semibold ${dailyChallenge.isCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                    {dailyChallenge.isCompleted ? 'Completed!' : 'In Progress'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No daily challenge available. Try refreshing.</p>
            )}
          </CardContent>
        </Card>

        {/* Weekly Challenge Card */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center">
              <Trophy className="w-5 h-5 mr-2" /> This Week's Goal
            </CardTitle>
            {weeklyChallenge && (
               <CardDescription>
                {weeklyChallenge.isCompleted ? "Goal Achieved! Well done!" : `Progress: ${weeklyChallenge.currentValue.toFixed(1)} / ${weeklyChallenge.targetValue}`}
               </CardDescription>
            )}
          </CardHeader>
          <CardContent className="min-h-[100px]">
            {weeklyChallenge ? (
              <div>
                <p className="text-md font-medium text-foreground mb-2">{weeklyChallenge.description}</p>
                <Progress value={weeklyChallengeProgress} className="w-full h-3 mb-1" />
                 <p className={`text-sm font-semibold text-right ${weeklyChallenge.isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {weeklyChallenge.isCompleted ? 'Completed!' : `${weeklyChallengeProgress.toFixed(0)}%`}
                  </p>
              </div>
            ) : (
              <p className="text-muted-foreground">No weekly challenge available. Check back later.</p>
            )}
          </CardContent>
        </Card>

        {/* Streaks Card */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center">
              <Flame className="w-5 h-5 mr-2" /> Your Streaks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {streakData ? (
              <div className="flex items-center space-x-2">
                <Flame className={`w-8 h-8 ${streakData.logStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{streakData.logStreak} Day</p>
                  <p className="text-sm text-muted-foreground">Meal Logging Streak</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Log your first meal to start a streak!</p>
            )}
            {/* Future: Challenge completion streak */}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ChallengesPage;

