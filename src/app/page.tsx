
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Leaf, Utensils, CalendarDays, Clock, ArrowDown, ArrowUp, PlusCircle, Apple } from 'lucide-react'; // Added Apple
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay, isSameDay, getHours, startOfWeek, endOfWeek, differenceInCalendarDays } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MealLog } from '@/context/app-context';
import { cn } from '@/lib/utils';


// Helper function to calculate percentage change and direction
function calculateChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  let value = 0;
  let direction: 'up' | 'down' | 'neutral' = 'neutral';

  if (previous > 0) {
    value = ((current - previous) / previous) * 100;
  } else if (current > 0) { // Previous is 0 or negative, current is positive
    value = 100; // Represent as 100% increase if starting from 0
  } else if (current === 0 && previous === 0) {
    value = 0; // No change if both are zero
  }
  // If previous > 0 and current is 0, value will be -100%
  // If previous is negative, the concept of percentage change might be misleading,
  // but CO2e values should be non-negative.

  if (current > previous) {
    direction = 'up';
  } else if (current < previous) {
    direction = 'down';
  }
  
  return { value: parseFloat(value.toFixed(1)), direction };
}


const HomePage: NextPage = () => {
  const { user, mealLogs, isLoading } = useAppContext();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedMealType, setSelectedMealType] = useState<string>("Breakfast"); 

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const todayDateObj = useMemo(() => startOfDay(new Date()), []);
  
  // Current week for graph and date scroller (Monday to Sunday)
  const currentGraphWeekStart = useMemo(() => startOfWeek(todayDateObj, { weekStartsOn: 1 }), [todayDateObj]);
  const currentGraphWeekEnd = useMemo(() => endOfWeek(todayDateObj, { weekStartsOn: 1 }), [todayDateObj]);

  const { 
    todaysTotalCO2e, 
    rolling7DayTotalCO2e, 
    rolling7DayAverageDailyCO2e,
    avgDailyChange,
    weeklyChange 
  } = useMemo(() => {
    if (!mealLogs) return { 
      todaysTotalCO2e: 0, 
      rolling7DayTotalCO2e: 0, 
      rolling7DayAverageDailyCO2e: 0,
      avgDailyChange: { value: 0, direction: 'neutral' as 'up' | 'down' | 'neutral' },
      weeklyChange: { value: 0, direction: 'neutral' as 'up' | 'down' | 'neutral' }
    };
    
    const todayDateStr = format(todayDateObj, 'yyyy-MM-dd');

    // Current 7-day rolling window (includes today)
    const currentPeriodEnd = todayDateObj;
    const currentPeriodStart = startOfDay(subDays(todayDateObj, 6));

    // Previous 7-day rolling window
    const previousPeriodEnd = startOfDay(subDays(todayDateObj, 7));
    const previousPeriodStart = startOfDay(subDays(todayDateObj, 13));

    let calculatedTodaysTotalCO2e = 0;

    let current7DayTotal = 0;
    const current7DayLogsDates = new Set<string>();

    let previous7DayTotal = 0;
    const previous7DayLogsDates = new Set<string>();

    mealLogs.forEach(log => {
      const logDateObj = parseISO(log.date); 

      // Today's total
      if (log.date === todayDateStr) {
        calculatedTodaysTotalCO2e += log.totalCarbonFootprint;
      }

      // Current 7-day rolling window
      if (logDateObj >= currentPeriodStart && logDateObj <= currentPeriodEnd) {
        current7DayTotal += log.totalCarbonFootprint;
        current7DayLogsDates.add(log.date);
      }

      // Previous 7-day rolling window
      if (logDateObj >= previousPeriodStart && logDateObj <= previousPeriodEnd) {
        previous7DayTotal += log.totalCarbonFootprint;
        previous7DayLogsDates.add(log.date);
      }
    });

    const current7DayAverage = current7DayLogsDates.size > 0 ? current7DayTotal / current7DayLogsDates.size : 0;
    const previous7DayAverage = previous7DayLogsDates.size > 0 ? previous7DayTotal / previous7DayLogsDates.size : 0;
    
    const calculatedAvgDailyChange = calculateChange(current7DayAverage, previous7DayAverage);
    const calculatedWeeklyChange = calculateChange(current7DayTotal, previous7DayTotal);

    return { 
      todaysTotalCO2e: calculatedTodaysTotalCO2e,
      rolling7DayTotalCO2e: current7DayTotal,
      rolling7DayAverageDailyCO2e: current7DayAverage,
      avgDailyChange: calculatedAvgDailyChange,
      weeklyChange: calculatedWeeklyChange,
    };
  }, [mealLogs, todayDateObj]);


  const graphData = useMemo(() => {
    if (!mealLogs) return [];

    const dateInterval = eachDayOfInterval({ start: currentGraphWeekStart, end: currentGraphWeekEnd });
    const dailyTotalsMap = new Map<string, number>();

    dateInterval.forEach(day => {
      dailyTotalsMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    mealLogs.forEach(log => {
      const logDateObj = parseISO(log.date);
      if (logDateObj >= currentGraphWeekStart && logDateObj <= currentGraphWeekEnd) {
        const dateStr = log.date;
        dailyTotalsMap.set(dateStr, (dailyTotalsMap.get(dateStr) ?? 0) + log.totalCarbonFootprint);
      }
    });

    return Array.from(dailyTotalsMap.entries()).map(([date, total]) => ({
      name: format(parseISO(date), 'EEE'),
      totalCO2e: parseFloat(total.toFixed(2)),
      fullDate: date,
    })).sort((a,b) => parseISO(a.fullDate).getTime() - parseISO(b.fullDate).getTime());
  }, [mealLogs, currentGraphWeekStart, currentGraphWeekEnd]);
  
  const dateScrollerDates = useMemo(() => {
    // Show 7 days in scroller, centered around selectedDate, or starting from current week by default
    // For simplicity, let's keep it to the current graph week for now.
    return eachDayOfInterval({ start: currentGraphWeekStart, end: currentGraphWeekEnd });
  }, [currentGraphWeekStart, currentGraphWeekEnd]);


  const filteredMealsForSelectedDateTimeType = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return mealLogs.filter(log => {
      if (log.date !== selectedDateStr) {
        return false;
      }
      const logHour = getHours(parseISO(log.timestamp));
      switch (selectedMealType) {
        case "Breakfast":
          return logHour >= 4 && logHour < 10; 
        case "Lunch":
          return logHour >= 10 && logHour < 18; 
        case "Dinner":
          return logHour >= 18 || logHour < 4; 
        default:
          return false;
      }
    });
  }, [mealLogs, selectedDate, selectedMealType]);


  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

  return (
    <div className="flex flex-col min-h-screen bg-secondary/30">
      <main className="flex-grow container mx-auto p-4 space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-primary my-4">
          Home
        </h1>

        <Card className="bg-primary-light shadow-lg border-primary/20">
          <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row">
            <div className="flex-1 text-center sm:pr-3 md:pr-6 py-2 sm:border-r border-primary/30 mb-4 sm:mb-0">
              <p className="text-xs font-bold uppercase text-primary/80 tracking-wider mb-1">AS OF TODAY</p>
              <p className="text-6xl md:text-7xl font-bold text-primary my-1">{todaysTotalCO2e.toFixed(2)}</p>
              <p className="text-base md:text-lg text-muted-foreground">kg CO₂e</p>
            </div>
            
            <div className="flex-1 sm:pl-3 md:pl-6 flex flex-col justify-around">
              <div className="text-center mb-2 sm:mb-0">
                <p className="text-xs font-bold uppercase text-primary/80 tracking-wider mb-1">AVE. DAILY (LAST 7 DAYS)</p>
                <div className="flex items-baseline justify-center space-x-1 md:space-x-2">
                  <p className="text-4xl md:text-5xl font-bold text-muted-foreground">{rolling7DayAverageDailyCO2e.toFixed(2)}</p>
                  <span className={`text-sm md:text-base font-medium flex items-center ${avgDailyChange.direction === 'down' ? 'text-destructive' : (avgDailyChange.direction === 'up' ? 'text-green-600' : 'text-muted-foreground')}`}>
                    {avgDailyChange.direction === 'down' ? <ArrowDown className="w-4 h-4" /> : (avgDailyChange.direction === 'up' ? <ArrowUp className="w-4 h-4" /> : null)}
                    {avgDailyChange.value.toFixed(1)}%
                  </span>
                </div>
                <p className="text-base md:text-lg text-muted-foreground">kg CO₂e</p>
              </div>
              <hr className="border-primary/20 my-2 md:my-3" />
              <div className="text-center">
                <p className="text-xs font-bold uppercase text-primary/80 tracking-wider mb-1">OVER THE LAST 7 DAYS</p>
                <div className="flex items-baseline justify-center space-x-1 md:space-x-2">
                  <p className="text-4xl md:text-5xl font-bold text-muted-foreground">{rolling7DayTotalCO2e.toFixed(2)}</p>
                  <span className={`text-sm md:text-base font-medium flex items-center ${weeklyChange.direction === 'down' ? 'text-destructive' : (weeklyChange.direction === 'up' ? 'text-green-600' : 'text-muted-foreground')}`}>
                    {weeklyChange.direction === 'down' ? <ArrowDown className="w-4 h-4" /> : (weeklyChange.direction === 'up' ? <ArrowUp className="w-4 h-4" /> : null)}
                    {weeklyChange.value.toFixed(1)}%
                  </span>
                </div>
                <p className="text-base md:text-lg text-muted-foreground">kg CO₂e</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-center text-primary">Released CO₂e (This Week: Mon-Sun)</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="kg" domain={[0, 'auto']} allowDecimals={true} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
                  itemStyle={{ color: 'hsl(var(--chart-2))' }}
                  formatter={(value: number, name: string, props: any) => [`${value.toFixed(2)} kg CO₂e`, `Total for ${format(parseISO(props.payload.fullDate), 'EEE, MMM d')}`]}
                 />
                <Line type="monotone" dataKey="totalCO2e" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <ScrollArea className="w-full whitespace-nowrap rounded-md">
          <div className="flex space-x-3 pb-2">
            {dateScrollerDates.map(date => (
              <Button
                key={date.toISOString()}
                variant={isSameDay(date, selectedDate) ? "default" : "outline"}
                className={cn("flex flex-col items-center justify-center h-16 w-16 p-2 shadow-md", 
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

        <Tabs defaultValue={selectedMealType} onValueChange={setSelectedMealType} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-card border">
            {mealTypes.map(type => (
              <TabsTrigger key={type} value={type} className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary flex items-center">
              <Utensils className="w-5 h-5 mr-2" />
              {selectedMealType} for {format(selectedDate, 'MMM dd, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading meals...</p>
            ) : (
              <ScrollArea className="h-[300px] pr-3">
                <ul className="space-y-4">
                  <li className="mb-3">
                    <Link href="/log-meal" passHref legacyBehavior>
                      <a className="flex items-center justify-between space-x-3 p-3 bg-card rounded-lg border border-dashed border-primary/50 shadow-sm hover:bg-secondary/50 transition-all cursor-pointer h-24"
                         aria-label={`Add food to ${selectedMealType}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-20 h-20 bg-secondary/30 rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="plate food">
                            <Apple className="w-8 h-8 text-primary/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-md font-semibold text-primary">
                              Add Food to {selectedMealType}
                            </p>
                          </div>
                        </div>
                        <PlusCircle className="w-8 h-8 text-primary flex-shrink-0" />
                      </a>
                    </Link>
                  </li>
                  {filteredMealsForSelectedDateTimeType.map((log, index) => (
                    <li key={log.timestamp + index} className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border/70 shadow-sm hover:shadow-md transition-shadow">
                      {log.photoDataUri ? (
                        <img data-ai-hint="food meal" src={log.photoDataUri} alt="Meal" className="w-20 h-20 object-cover rounded-md border" />
                      ) : (
                        <div className="w-20 h-20 bg-secondary rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="utensils plate">
                          <Utensils className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                           <p className="text-sm font-semibold text-primary truncate" title={log.foodItems.map(item => item.name).join(', ') || "Meal"}>
                             {log.foodItems.map(item => item.name).join(', ') || "Meal"}
                           </p>
                            <p className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                                <Clock className="w-3 h-3 mr-1" />{format(parseISO(log.timestamp), 'p')}
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {log.foodItems.map(item => item.quantity).filter(Boolean).join(', ') || "Quantity not specified"}
                        </p>
                        <span className="text-sm font-medium text-primary whitespace-nowrap">
                            {log.totalCarbonFootprint.toFixed(2)} kg CO₂e
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

      </main>

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

