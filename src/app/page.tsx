"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, BarChart3, Leaf } from 'lucide-react';
import Header from '@/components/header';

const HomePage: NextPage = () => {
  const { user, mealLogs, isLoading } = useAppContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todaysTotalCO2e = useMemo(() => {
    if (!mealLogs) return 0;
    return mealLogs
      .filter(log => log.date === today)
      .reduce((total, log) => total + log.totalCarbonFootprint, 0);
  }, [mealLogs, today]);

  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto p-4 py-8 flex flex-col items-center">
        <Card className="w-full max-w-md mb-8 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Carbon Footprint</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todaysTotalCO2e.toFixed(2)} kg CO₂e</div>
            <p className="text-xs text-muted-foreground">
              Based on meals logged today
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 w-full max-w-md">
          <Link href="/log-meal" passHref>
            <Button className="w-full h-16 text-lg bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Log a new meal">
              <Utensils className="mr-2 h-5 w-5" /> Log Meal
            </Button>
          </Link>
          <Link href="/reports" passHref>
            <Button variant="secondary" className="w-full h-16 text-lg" aria-label="View reports">
              <BarChart3 className="mr-2 h-5 w-5" /> View Reports
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
