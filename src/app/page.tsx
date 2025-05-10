
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/header';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCircle, Target, Trophy, Flame, PlusCircle, BookOpen, Lightbulb, RefreshCcw, CheckCircle, Sparkles, Leaf } from 'lucide-react';
import { format } from 'date-fns';

const HomePage: NextPage = () => {
  const router = useRouter();
  const {
    user,
    isLoading: isAppContextLoading,
    dailyChallenge,
    weeklyChallenge,
    streakData,
    refreshDailyChallenge,
    mealLogs,
  } = useAppContext();

  useEffect(() => {
    if (!isAppContextLoading && !user) {
      router.push('/login');
    }
  }, [user, isAppContextLoading, router]);

  const todaysTotalCO2e = useMemo(() => {
    if (!user || !mealLogs || mealLogs.length === 0) return 0;
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    return mealLogs
      .filter(log => log.date === todayDateStr) // mealLogs from context is already user-specific
      .reduce((sum, log) => sum + log.totalCarbonFootprint, 0);
  }, [user, mealLogs]);

  if (isAppContextLoading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-secondary/30">
        <Header title="EcoPlate Home" />
        <main className="flex-grow container mx-auto p-4 space-y-6">
          <Skeleton className="h-28 w-full" /> {/* Skeleton for new top card */}
          <Skeleton className="h-80 w-full" /> {/* Adjusted skeleton for combined welcome/challenges card */}
        </main>
        <Skeleton className="fixed bottom-20 right-4 h-14 w-14 rounded-full" />
      </div>
    );
  }

  const weeklyChallengeProgress = weeklyChallenge?.targetValue && weeklyChallenge.targetValue > 0
    ? Math.min((weeklyChallenge.currentValue / weeklyChallenge.targetValue) * 100, 100)
    : 0;

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header title="EcoPlate Home" />
      <main className="flex-grow container mx-auto p-4 space-y-6">

        {/* Top Card for Streak and Daily CO2e */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-lg text-primary text-center">Your Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 pt-2 pb-4"> {/* Changed to grid-cols-2 for all sizes */}
            {/* Streak Display */}
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-card border border-border shadow-sm aspect-[3/2] sm:aspect-auto"> {/* Added aspect ratio for very narrow screens */}
              <Flame className={`w-7 h-7 sm:w-8 sm:h-8 mb-1 ${streakData && streakData.logStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {streakData ? streakData.logStreak : 0} Day{streakData && streakData.logStreak !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground text-center">Logging Streak</p>
            </div>
            {/* Daily CO2e Display */}
            <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-card border border-border shadow-sm aspect-[3/2] sm:aspect-auto"> {/* Added aspect ratio */}
              <Leaf className="w-7 h-7 sm:w-8 sm:h-8 mb-1 text-green-600" />
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {todaysTotalCO2e.toFixed(2)} kg
              </p>
              <p className="text-xs text-muted-foreground text-center">CO₂e Today</p>
            </div>
          </CardContent>
        </Card>

        {/* Welcome Card - User Greeting, Quick Actions, Challenges */}
        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl text-primary flex items-center">
              <UserCircle className="w-7 h-7 mr-2" />
              Hello, {user.name}!
            </CardTitle>
            <CardDescription>Ready to make a difference today?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href="/log-meal" passHref>
                <Button className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground text-sm">
                  <PlusCircle className="w-4 h-4 mr-2" /> Log New Meal
                </Button>
              </Link>
              <Link href="/reports" passHref>
                <Button variant="outline" className="w-full h-11 text-sm border-primary text-primary hover:bg-primary/10">
                  <BookOpen className="w-4 h-4 mr-2" /> View Reports
                </Button>
              </Link>
              <Link href="/recommendations" passHref>
                <Button variant="outline" className="w-full h-11 text-sm border-primary text-primary hover:bg-primary/10">
                  <Lightbulb className="w-4 h-4 mr-2" /> Get Tips
                </Button>
              </Link>
            </div>

            {/* Daily Challenge Section */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-md font-semibold text-primary flex items-center">
                  <Target className="w-5 h-5 mr-2" /> Today's Challenge
                </h3>
                <Button variant="ghost" size="icon" onClick={refreshDailyChallenge} aria-label="Refresh daily challenge" className="h-8 w-8">
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-3 rounded-lg bg-primary-light/40 border border-primary/20 min-h-[60px]">
                {dailyChallenge ? (
                  <div className="flex items-start space-x-2">
                    {dailyChallenge.isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Sparkles className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{dailyChallenge.description}</p>
                      {dailyChallenge.type === 'co2e_under_today' && dailyChallenge.targetValue && (
                         <p className="text-xs text-muted-foreground">Target: {dailyChallenge.targetValue} kg CO₂e</p>
                      )}
                       {dailyChallenge.type === 'log_low_co2e_meal' && dailyChallenge.targetValue && (
                         <p className="text-xs text-muted-foreground">Log a meal under {dailyChallenge.targetValue} kg CO₂e</p>
                      )}
                      <p className={`text-xs font-semibold ${dailyChallenge.isCompleted ? 'text-green-600' : 'text-amber-600'}`}>
                        {dailyChallenge.isCompleted ? 'Completed!' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No daily challenge. Try refreshing.</p>
                )}
              </div>
            </div>

            {/* Weekly Challenge Section */}
             <div className="pt-1">
                <h3 className="text-md font-semibold text-primary flex items-center mb-1">
                  <Trophy className="w-5 h-5 mr-2" /> This Week's Goal
                </h3>
                 {weeklyChallenge && (
                   <CardDescription className="text-xs mb-1 pl-1">
                    {weeklyChallenge.isCompleted ? "Goal Achieved! Well done!" : `Progress: ${weeklyChallenge.currentValue.toFixed(1)} / ${weeklyChallenge.targetValue.toFixed(1)}`}
                   </CardDescription>
                )}
                <div className="p-3 rounded-lg bg-primary-light/40 border border-primary/20 min-h-[70px]">
                  {weeklyChallenge ? (
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1.5">{weeklyChallenge.description}</p>
                      <Progress value={weeklyChallengeProgress} className="w-full h-2.5 mb-1" />
                      <p className={`text-xs font-semibold text-right ${weeklyChallenge.isCompleted ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {weeklyChallenge.isCompleted ? 'Completed!' : `${weeklyChallengeProgress.toFixed(0)}%`}
                        </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No weekly challenge. Check back later.</p>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>
        
      </main>

       <Link href="/log-meal" passHref>
        <Button
          className="fixed bottom-20 right-4 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-accent shadow-xl hover:bg-accent/90 z-40"
          size="icon"
          aria-label="Log new meal"
        >
          <PlusCircle className="h-7 w-7 sm:h-8 sm:h-8 text-accent-foreground" />
        </Button>
      </Link>
    </div>
  );
};

export default HomePage;

