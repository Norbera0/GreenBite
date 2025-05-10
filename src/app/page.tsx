
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; 
import { Plus, Leaf, Utensils, Clock, ArrowDown, ArrowUp, PlusCircle, Apple, Loader2 } from 'lucide-react'; // Added Loader2
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay, isSameDay, getHours, startOfWeek, endOfWeek } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';


// Helper function to calculate percentage change and direction
function calculateChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'neutral' } {
  let value = 0;
  let direction: 'up' | 'down' | 'neutral' = 'neutral';

  if (previous > 0) {
    value = ((current - previous) / previous) * 100;
  } else if (current > 0) { 
    value = 100; 
  } else if (current === 0 && previous === 0) {
    value = 0; 
  }
  
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

    const currentPeriodEnd = todayDateObj;
    const currentPeriodStart = startOfDay(subDays(todayDateObj, 6));

    const previousPeriodEnd = startOfDay(subDays(todayDateObj, 7));
    const previousPeriodStart = startOfDay(subDays(todayDateObj, 13));

    let calculatedTodaysTotalCO2e = 0;
    let current7DayTotal = 0;
    const current7DayLogsDates = new Set<string>();
    let previous7DayTotal = 0;
    const previous7DayLogsDates = new Set<string>();

    mealLogs.forEach(log => {
      const logDateObj = parseISO(log.date); 

      if (log.date === todayDateStr) {
        calculatedTodaysTotalCO2e += log.totalCarbonFootprint;
      }

      if (logDateObj >= currentPeriodStart && logDateObj <= currentPeriodEnd) {
        current7DayTotal += log.totalCarbonFootprint;
        current7DayLogsDates.add(log.date);
      }

      if (logDateObj >= previousPeriodStart && logDateObj <= previousPeriodEnd) {
        previous7DayTotal += log.totalCarbonFootprint;
        previous7DayLogsDates.add(log.date);
      }
    });

    const current7DayActiveDays = current7DayLogsDates.size > 0 ? current7DayLogsDates.size : 1;
    const previous7DayActiveDays = previous7DayLogsDates.size > 0 ? previous7DayLogsDates.size : 1;


    const calculatedCurrent7DayAverage = current7DayTotal / current7DayActiveDays;
    const calculatedPrevious7DayAverage = previous7DayTotal / previous7DayActiveDays;
    
    const calculatedAvgDailyChange = calculateChange(calculatedCurrent7DayAverage, calculatedPrevious7DayAverage);
    const calculatedWeeklyChange = calculateChange(current7DayTotal, previous7DayTotal);

    return { 
      todaysTotalCO2e: calculatedTodaysTotalCO2e,
      rolling7DayTotalCO2e: current7DayTotal,
      rolling7DayAverageDailyCO2e: calculatedCurrent7DayAverage,
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
    return eachDayOfInterval({ start: subDays(todayDateObj, 3), end: subDays(todayDateObj, -3) }); // 7 days, today in middle
  }, [todayDateObj]);


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

  const yAxisDomainMax = useMemo(() => {
    if (!graphData || graphData.length === 0) return 5; 
    const maxVal = Math.max(...graphData.map(d => d.totalCO2e), 0);
    const roundedMax = Math.ceil(maxVal / 5) * 5; // Round up to nearest 5
    return Math.max(5, roundedMax + (roundedMax > 0 ? 1 : 0) ); // Ensure min domain of 5, add buffer if max > 0
  }, [graphData]);


  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center text-foreground mb-6">
          Your Dietary Climate Impact
        </h1>

        <Card className="bg-primary-light shadow-lg border-primary/20 overflow-hidden">
          <CardContent className="p-3 flex flex-row">
            {/* Left Part: AS OF TODAY */}
            <div className="flex-1 text-center pr-2 sm:pr-3 py-2 border-r border-primary/30 flex flex-col justify-center items-center">
              <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">AS OF TODAY</p>
              <p className="text-5xl sm:text-6xl font-bold text-primary my-1">{todaysTotalCO2e.toFixed(0)}</p>
              <p className="text-sm sm:text-base text-gray-500">kg CO₂e</p>
            </div>
            
            {/* Right Part: AVE. DAILY & OVER THE LAST 7 DAYS */}
            <div className="flex-1 pl-2 sm:pl-3 flex flex-col justify-around">
              {/* AVE. DAILY Section */}
              <div className="text-center flex-1 flex flex-col justify-center py-1">
                <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">AVE. DAILY</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <p className="text-3xl sm:text-4xl font-bold text-gray-700">{rolling7DayAverageDailyCO2e.toFixed(0)}</p>
                  <span className={`text-xs sm:text-sm font-medium flex items-center ${avgDailyChange.direction === 'down' ? 'text-red-500' : (avgDailyChange.direction === 'up' ? 'text-green-500' : 'text-gray-500')}`}>
                    {avgDailyChange.direction === 'down' ? <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : (avgDailyChange.direction === 'up' ? <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : null)}
                    {avgDailyChange.value.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">kg CO₂e</p>
              </div>

              <hr className="border-primary/20 my-1 sm:my-2" />

              {/* OVER THE LAST 7 DAYS Section */}
              <div className="text-center flex-1 flex flex-col justify-center py-1">
                <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">OVER THE LAST 7 DAYS</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <p className="text-3xl sm:text-4xl font-bold text-gray-700">{rolling7DayTotalCO2e.toFixed(0)}</p>
                  <span className={`text-xs sm:text-sm font-medium flex items-center ${weeklyChange.direction === 'down' ? 'text-red-500' : (weeklyChange.direction === 'up' ? 'text-green-500' : 'text-gray-500')}`}>
                    {weeklyChange.direction === 'down' ? <ArrowDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : (weeklyChange.direction === 'up' ? <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : null)}
                    {weeklyChange.value.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">kg CO₂e</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
           <CardContent className="h-[250px] p-2 pt-4"> 
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="kg" domain={[0, yAxisDomainMax]} allowDecimals={true} tickCount={6} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
                  itemStyle={{ color: 'hsl(var(--chart-2))' }}
                  formatter={(value: number, name: string, props: any) => [`${(typeof value === 'number' ? value : 0).toFixed(2)} kg CO₂e`, `Total for ${format(parseISO(props.payload.fullDate), 'EEE, MMM d')}`]}
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
                className={cn("flex flex-col items-center justify-center h-16 w-16 p-2 shadow-md transition-all", 
                              isSameDay(date, selectedDate) ? "bg-primary text-primary-foreground border-primary scale-105" : "bg-card border-border hover:bg-muted"
                )}
                onClick={() => setSelectedDate(date)}
              >
                <span className="text-xs font-medium">{format(date, 'MMM')}</span>
                <span className="text-lg font-bold">{format(date, 'dd')}</span>
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <Tabs defaultValue={selectedMealType} onValueChange={setSelectedMealType} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-card border">
            {mealTypes.map(type => (
              <TabsTrigger key={type} value={type} className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <Card className="shadow-md">
           <CardContent className="p-3">
            {isLoading ? (
              <div className="h-[200px] flex items-center justify-center">
                <Loader2 className="animate-spin h-8 w-8 text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-1">
                <ul className="space-y-3">
                  <li className="mb-3">
                    <Link href="/log-meal" passHref legacyBehavior>
                      <a className="flex items-center justify-between space-x-3 p-3 bg-card rounded-lg border border-dashed border-primary/50 shadow-sm hover:bg-secondary/50 transition-all cursor-pointer h-20"
                         aria-label={`Add food to ${selectedMealType}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary/30 rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="plate food">
                            <Apple className="w-6 h-6 sm:w-8 sm:h-8 text-primary/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm sm:text-md font-semibold text-primary">
                              Add Food to {selectedMealType}
                            </p>
                          </div>
                        </div>
                        <PlusCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
                      </a>
                    </Link>
                  </li>
                  {filteredMealsForSelectedDateTimeType.length === 0 && (
                     <li className="text-center text-muted-foreground py-4">
                       {/* No {selectedMealType.toLowerCase()} logged for {format(selectedDate, 'MMM dd')}. */}
                     </li>
                  )}
                  {filteredMealsForSelectedDateTimeType.map((log, index) => (
                    <li key={log.timestamp + index} className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border/70 shadow-sm hover:shadow-md transition-shadow">
                      {log.photoDataUri ? (
                        <img data-ai-hint="food meal" src={log.photoDataUri} alt="Meal" className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md border" />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="utensils plate">
                          <Utensils className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                           <p className="text-sm font-semibold text-primary truncate flex-grow" title={log.foodItems.map(item => item.name).join(', ') || "Meal"}>
                             {log.foodItems.map(item => item.name).join(', ') || "Meal"}
                           </p>
                           <p className="text-xs text-muted-foreground flex items-center whitespace-nowrap ml-2">
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
          className="fixed bottom-20 right-4 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-accent shadow-xl hover:bg-accent/90 z-40"
          size="icon"
          aria-label="Log new meal"
        >
          <Plus className="h-7 w-7 sm:h-8 sm:h-8 text-accent-foreground" />
        </Button>
      </Link>
    </div>
  );
};

export default HomePage;
