
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowDown, ArrowUp, Plus, Edit3, Leaf, Utensils } from 'lucide-react';
import Header from '@/components/header';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay, isSameDay } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { MealLog } from '@/context/app-context'; // Ensure MealLog type is imported


const HomePage: NextPage = () => {
  const { user, mealLogs, isLoading } = useAppContext();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const todayDateObj = useMemo(() => startOfDay(new Date()), []);
  const sevenDaysAgoDateObj = useMemo(() => startOfDay(subDays(todayDateObj, 6)), [todayDateObj]);

  const { todaysTotalCO2e, weeklyTotalCO2e, averageDailyCO2e } = useMemo(() => {
    if (!mealLogs) return { todaysTotalCO2e: 0, weeklyTotalCO2e: 0, averageDailyCO2e: 0 };
    
    const todayStr = format(todayDateObj, 'yyyy-MM-dd');
    let daily = 0;
    let weekly = 0;
    let daysWithLogs = new Set<string>();

    mealLogs.forEach(log => {
      const logDateObj = parseISO(log.date);
      if (log.date === todayStr) {
        daily += log.totalCarbonFootprint;
      }
      if (logDateObj >= sevenDaysAgoDateObj && logDateObj <= todayDateObj) {
        weekly += log.totalCarbonFootprint;
        daysWithLogs.add(log.date);
      }
    });
    
    // For average, consider only days with logs within the 7 day period or all 7 days
    const numDaysForAverage = daysWithLogs.size > 0 ? daysWithLogs.size : 7; // Or just 7 to smooth out if few logs
    return { 
      todaysTotalCO2e: daily, 
      weeklyTotalCO2e: weekly, 
      averageDailyCO2e: weekly / (daysWithLogs.size || 1) // Avoid division by zero if no logs in 7 days
    };
  }, [mealLogs, todayDateObj, sevenDaysAgoDateObj]);

  const graphData = useMemo(() => {
    if (!mealLogs) return [];

    const dateInterval = eachDayOfInterval({ start: sevenDaysAgoDateObj, end: todayDateObj });
    const dailyTotalsMap = new Map<string, number>();

    dateInterval.forEach(day => {
      dailyTotalsMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    mealLogs.forEach(log => {
      const dateStr = log.date;
      if (dailyTotalsMap.has(dateStr)) {
        dailyTotalsMap.set(dateStr, (dailyTotalsMap.get(dateStr) ?? 0) + log.totalCarbonFootprint);
      }
    });

    return Array.from(dailyTotalsMap.entries()).map(([date, total]) => ({
      name: format(parseISO(date), 'EEE'),
      totalCO2e: parseFloat(total.toFixed(2)),
      fullDate: date,
    })).sort((a,b) => parseISO(a.fullDate).getTime() - parseISO(b.fullDate).getTime());
  }, [mealLogs, sevenDaysAgoDateObj, todayDateObj]);
  
  const dateScrollerDates = useMemo(() => {
    return eachDayOfInterval({ start: subDays(todayDateObj, 6), end: todayDateObj }).reverse();
  }, [todayDateObj]);


  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  // Dummy meal types for filter UI. Actual filtering logic would depend on data structure.
  const mealTypes = ["Breakfast", "Lunch", "Dinner", "Snacks"];

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <Header title="Report" /> {/* Header updated as per design */}
      
      <main className="flex-grow container mx-auto p-4 space-y-6">
        {/* Stats Section */}
        <Card className="bg-primary/5 shadow-lg border-primary/20">
          <CardContent className="p-4 flex space-x-2">
            <div className="flex-1 text-center py-2">
              <p className="text-xs font-medium text-primary/80 uppercase">As of Today</p>
              <p className="text-4xl font-bold text-primary">{todaysTotalCO2e.toFixed(2)}</p>
              <p className="text-sm text-primary/90">kg CO₂e</p>
            </div>
            <div className="border-l border-primary/20"></div>
            <div className="flex-1 space-y-2 py-2">
              <div className="text-center">
                <p className="text-xs font-medium text-primary/80 uppercase">Avg. Daily</p>
                <div className="flex items-center justify-center">
                  <p className="text-2xl font-semibold text-primary">{averageDailyCO2e.toFixed(2)}</p>
                  {/* Percentage change placeholder */}
                </div>
                <p className="text-xs text-primary/90">kg CO₂e</p>
              </div>
              <hr className="border-primary/10"/>
              <div className="text-center">
                <p className="text-xs font-medium text-primary/80 uppercase">Total Weekly</p>
                 <div className="flex items-center justify-center">
                    <p className="text-2xl font-semibold text-primary">{weeklyTotalCO2e.toFixed(2)}</p>
                    {/* Percentage change placeholder */}
                 </div>
                <p className="text-xs text-primary/90">kg CO₂e</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Released CO2e Graph */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-center text-primary">Released CO₂e</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="kg" domain={[0, 'dataMax + 2']}/>
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
                  itemStyle={{ color: 'hsl(var(--chart-2))' }} // Using chart-2 for pink/red
                  formatter={(value: number, name: string, props: any) => [`${value.toFixed(2)} kg CO₂e`, `Total for ${format(parseISO(props.payload.fullDate), 'EEE, MMM d')}`]}
                 />
                <Line type="monotone" dataKey="totalCO2e" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Meal Type Filters */}
        <Tabs defaultValue={mealTypes[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-12 bg-card border">
            {mealTypes.map(type => (
              <TabsTrigger key={type} value={type} className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Content for tabs can be added here if needed to display filtered meals */}
        </Tabs>

        {/* Date Scroller */}
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
          <div className="flex space-x-3 pb-2">
            {dateScrollerDates.map(date => (
              <Button
                key={date.toISOString()}
                variant={isSameDay(date, selectedDate) ? "default" : "outline"}
                className={cn("flex flex-col items-center justify-center h-16 w-16 p-2 shadow", 
                              isSameDay(date, selectedDate) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"
                )}
                onClick={() => setSelectedDate(date)}
              >
                <span className="text-sm font-medium">{format(date, 'MMM')}</span>
                <span className="text-xl font-bold">{format(date, 'dd')}</span>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        
        {/* Placeholder for meals of selectedDate - design doesn't show this section */}
        {/* <Card className="mt-4">
          <CardHeader><CardTitle>Meals for {format(selectedDate, 'MMM dd')}</CardTitle></CardHeader>
          <CardContent><p>Meal list for {format(selectedDate, 'MMM dd')} would appear here.</p></CardContent>
        </Card> */}

      </main>

      {/* Floating Action Button */}
      <Link href="/log-meal" passHref>
        <Button
          className="fixed bottom-20 right-6 h-16 w-16 rounded-full bg-accent shadow-xl hover:bg-accent/90 md:hidden z-40"
          size="icon"
          aria-label="Log new meal"
        >
          <Plus className="h-8 w-8 text-accent-foreground" />
        </Button>
      </Link>
    </div>
  );
};

export default HomePage;
