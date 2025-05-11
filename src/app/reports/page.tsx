
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; 
import { Plus, Leaf, Utensils, Clock, ArrowDown, ArrowUp, PlusCircle, Apple, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { format, subDays, addDays, eachDayOfInterval, parseISO, startOfDay, isSameDay, getHours, startOfWeek, endOfWeek } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import Header from '@/components/header'; 


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

const VISIBLE_DATES_IN_SCROLLER = 7;
const SOUTH_KOREA_AVG_CO2E = 5.1;

const ReportsPage: NextPage = () => { 
  const { user, mealLogs, isLoading, weeklyTip, fetchWeeklyTip, isLoadingWeeklyTip } = useAppContext();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedMealType, setSelectedMealType] = useState<string>("Breakfast"); 

  const todayDateObj = useMemo(() => startOfDay(new Date()), []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (user && !isLoadingWeeklyTip && !weeklyTip) {
      fetchWeeklyTip();
    }
  }, [user, isLoading, router, weeklyTip, isLoadingWeeklyTip, fetchWeeklyTip]);

  const allScrollableDates = useMemo(() => {
    const startDate = subDays(todayDateObj, 14);
    const endDate = addDays(todayDateObj, 7); 
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [todayDateObj]);

  const initialDateScrollerOffset = useMemo(() => {
    const todayIndex = allScrollableDates.findIndex(date => isSameDay(date, todayDateObj));
    return Math.max(0, Math.min(allScrollableDates.length - VISIBLE_DATES_IN_SCROLLER, todayIndex - Math.floor(VISIBLE_DATES_IN_SCROLLER / 2)));
  }, [allScrollableDates, todayDateObj]);
  
  const [dateScrollerOffset, setDateScrollerOffset] = useState(initialDateScrollerOffset);

  useEffect(() => {
    setDateScrollerOffset(initialDateScrollerOffset);
  }, [initialDateScrollerOffset]);


  const dateScrollerDates = useMemo(() => {
    return allScrollableDates.slice(dateScrollerOffset, dateScrollerOffset + VISIBLE_DATES_IN_SCROLLER);
  }, [allScrollableDates, dateScrollerOffset]);

  const handlePrevDates = () => {
    setDateScrollerOffset(prev => Math.max(0, prev - 1));
  };

  const handleNextDates = () => {
    setDateScrollerOffset(prev => Math.min(allScrollableDates.length - VISIBLE_DATES_IN_SCROLLER, prev + 1));
  };
  
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
    if (!graphData || graphData.length === 0) return Math.max(5, SOUTH_KOREA_AVG_CO2E + 1); // Ensure SK avg is visible
    const maxVal = Math.max(...graphData.map(d => d.totalCO2e), SOUTH_KOREA_AVG_CO2E, 0); // Include SK_AVG in max calculation
    const roundedMax = Math.ceil(maxVal / 5) * 5; 
    return Math.max(5, roundedMax + (roundedMax > 0 ? 1 : 0) ); 
  }, [graphData]);


  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const payload = data.activePayload[0].payload;
      if (payload && payload.fullDate) {
        setSelectedDate(startOfDay(parseISO(payload.fullDate)));
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header title="Reports" /> 
      <main className="flex-grow container mx-auto px-2 py-4 sm:px-4 sm:py-6 space-y-4 sm:space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Top-Left Panel: CO2e Stats */}
          <Card className="bg-primary-light shadow-lg border-primary/20 overflow-hidden">
            <CardContent className="p-3 flex flex-row"> 
              <div className="flex-1 text-center pr-2 sm:pr-3 py-2 border-r border-primary/30 flex flex-col justify-center items-center"> 
                <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">AS OF TODAY</p>
                <p className="text-3xl sm:text-4xl font-bold text-primary my-1">{todaysTotalCO2e.toFixed(1)}</p>
                <p className="text-xs text-gray-500">kg CO₂e</p>
              </div>
              
              <div className="flex-1 pl-2 sm:pl-3 flex flex-col justify-around"> 
                <div className="text-center flex-1 flex flex-col justify-center py-1">
                  <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">AVE. DAILY</p>
                  <div className="flex items-baseline justify-center space-x-1">
                    <p className="text-xl sm:text-2xl font-bold text-gray-700">{rolling7DayAverageDailyCO2e.toFixed(1)}</p>
                    <span className={`text-xs font-medium flex items-center ${avgDailyChange.direction === 'down' ? 'text-green-500' : (avgDailyChange.direction === 'up' ? 'text-red-500' : 'text-gray-500')}`}>
                      {avgDailyChange.direction === 'down' ? <ArrowDown className="w-3 h-3" /> : (avgDailyChange.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : null)}
                      {avgDailyChange.value.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">kg CO₂e</p>
                </div>

                <hr className="border-primary/20 my-1" /> 

                <div className="text-center flex-1 flex flex-col justify-center py-1">
                  <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">OVER THE LAST 7 DAYS</p>
                  <div className="flex items-baseline justify-center space-x-1">
                    <p className="text-xl sm:text-2xl font-bold text-gray-700">{rolling7DayTotalCO2e.toFixed(1)}</p>
                    <span className={`text-xs font-medium flex items-center ${weeklyChange.direction === 'down' ? 'text-green-500' : (weeklyChange.direction === 'up' ? 'text-red-500' : 'text-gray-500')}`}>
                      {weeklyChange.direction === 'down' ? <ArrowDown className="w-3 h-3" /> : (weeklyChange.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : null)}
                      {weeklyChange.value.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">kg CO₂e</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top-Right Panel: Graph: 7-Day Trend */}
          <Card className="shadow-lg">
             <CardContent className="h-[200px] sm:h-[250px] p-2 pt-4"> 
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }} onClick={handleBarClick}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} unit="kg" domain={[0, yAxisDomainMax]} allowDecimals={false} tickCount={ Math.min(6, Math.floor(yAxisDomainMax) + 1) } />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '10px', padding: '6px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '2px', fontWeight: 'bold' }}
                    itemStyle={{ color: 'hsl(var(--chart-2))' }} 
                    formatter={(value: number, name: string, props: any) => [`${(typeof value === 'number' ? value : 0).toFixed(2)} kg CO₂e`, `Total for ${format(parseISO(props.payload.fullDate), 'EEE, MMM d')}`]}
                   />
                  <Line type="monotone" dataKey="totalCO2e" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--chart-2))' }} activeDot={{ r: 5 }} />
                  <ReferenceLine 
                    y={SOUTH_KOREA_AVG_CO2E} 
                    label={{ value: `Avg. SK: ${SOUTH_KOREA_AVG_CO2E}kg`, position: 'insideTopRight', fill: 'hsl(var(--muted-foreground))', fontSize: 9, dy: -5, dx: -5 }} 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="3 3" 
                    strokeWidth={1.5}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bottom-Left Panel: Weekly Tip */}
           <Card className="shadow-lg">
            <CardContent className="p-4">
              <h3 className="text-md font-semibold text-primary mb-2 flex items-center"><Leaf className="w-4 h-4 mr-2 text-primary" /> Weekly Tip</h3>
              {isLoadingWeeklyTip ? (
                <div className="flex items-center justify-center h-[100px]">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                </div>
              ) : weeklyTip ? (
                <p className="text-sm text-foreground leading-relaxed">{weeklyTip}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Log meals to get personalized weekly tips!</p>
              )}
            </CardContent>
          </Card>

          {/* Bottom-Right Panel: Daily Meal Logs (Placeholder or Future Content) */}
          <Card className="shadow-lg">
            <CardContent className="p-4">
               <h3 className="text-md font-semibold text-primary mb-2 flex items-center"><Utensils className="w-4 h-4 mr-2 text-primary" /> Meals for {format(selectedDate, 'MMM d, EEE')}</h3>
               {isLoading ? (
                 <div className="h-[100px] flex items-center justify-center">
                    <Loader2 className="animate-spin h-6 w-6 text-primary" />
                 </div>
                ) : filteredMealsForSelectedDateTimeType.length > 0 ? (
                  <ScrollArea className="h-[200px] sm:h-[250px] pr-1">
                    <ul className="space-y-3">
                      {filteredMealsForSelectedDateTimeType.map((log, index) => (
                        <li key={log.timestamp + index} className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border/70 shadow-sm">
                          {log.photoDataUri ? (
                            <img data-ai-hint="food meal" src={log.photoDataUri} alt="Meal" className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border" />
                          ) : (
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="utensils plate">
                              <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start mb-1">
                               <p className="text-xs sm:text-sm font-semibold text-primary truncate flex-grow" title={log.foodItems.map(item => item.name).join(', ') || "Meal"}>
                                 {log.foodItems.map(item => item.name).join(', ') || "Meal"}
                               </p>
                               <span className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap ml-2">
                                 {log.totalCarbonFootprint.toFixed(2)} kg CO₂e
                               </span>
                            </div>
                            <p className="text-xs text-muted-foreground mb-1">
                              {log.foodItems.map(item => item.quantity).filter(Boolean).join(', ') || "Quantity not specified"}
                            </p>
                             <p className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                                  <Clock className="w-3 h-3 mr-1" />{format(parseISO(log.timestamp), 'p')}
                             </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No meals logged for this day and meal type.</p>
                )}
            </CardContent>
          </Card>
        </div>


        {/* Date Scroller */}
        <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={handlePrevDates} disabled={dateScrollerOffset === 0} aria-label="Previous dates">
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:h-6" />
            </Button>
            <ScrollArea className="w-full whitespace-nowrap rounded-md flex-grow">
              <div className="flex space-x-2 sm:space-x-3 pb-2">
                {dateScrollerDates.map(date => (
                  <Button
                    key={date.toISOString()}
                    variant={isSameDay(date, selectedDate) ? "default" : "outline"}
                    className={cn("flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 p-1 sm:p-2 shadow-md transition-all shrink-0", 
                                  isSameDay(date, selectedDate) ? "bg-primary text-primary-foreground border-primary scale-105" : "bg-card border-border hover:bg-muted"
                    )}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span className="text-xs font-medium">{format(date, 'MMM')}</span>
                    <span className="text-md sm:text-lg font-bold">{format(date, 'dd')}</span>
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
            <Button variant="ghost" size="icon" onClick={handleNextDates} disabled={dateScrollerOffset >= allScrollableDates.length - VISIBLE_DATES_IN_SCROLLER} aria-label="Next dates">
                <ChevronRight className="h-5 w-5 sm:h-6 sm:h-6" />
            </Button>
        </div>


        {/* Meal Type Tabs */}
        <Tabs defaultValue={selectedMealType} onValueChange={setSelectedMealType} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-10 sm:h-12 bg-card border">
            {mealTypes.map(type => (
              <TabsTrigger key={type} value={type} className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
                {type}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        {/* Meal Logs for Selected Date/Type */}
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
                      <a className="flex items-center justify-between space-x-3 p-3 bg-card rounded-lg border border-dashed border-primary/50 shadow-sm hover:bg-secondary/50 transition-all cursor-pointer h-16 sm:h-20"
                         aria-label={`Add food to ${selectedMealType}`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-secondary/30 rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="plate food">
                            <Apple className="w-5 h-5 sm:w-6 sm:h-6 text-primary/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-primary">
                              Add Food to {selectedMealType}
                            </p>
                          </div>
                        </div>
                        <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
                      </a>
                    </Link>
                  </li>
                  {filteredMealsForSelectedDateTimeType.map((log, index) => (
                    <li key={log.timestamp + index} className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border/70 shadow-sm hover:shadow-md transition-shadow">
                      {log.photoDataUri ? (
                        <img data-ai-hint="food meal" src={log.photoDataUri} alt="Meal" className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border" />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-secondary rounded-md flex items-center justify-center flex-shrink-0" data-ai-hint="utensils plate">
                          <Utensils className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                         <div className="flex justify-between items-start mb-1">
                           <p className="text-xs sm:text-sm font-semibold text-primary truncate flex-grow" title={log.foodItems.map(item => item.name).join(', ') || "Meal"}>
                             {log.foodItems.map(item => item.name).join(', ') || "Meal"}
                           </p>
                           <span className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap ml-2">
                             {log.totalCarbonFootprint.toFixed(2)} kg CO₂e
                           </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {log.foodItems.map(item => item.quantity).filter(Boolean).join(', ') || "Quantity not specified"}
                        </p>
                         <p className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                              <Clock className="w-3 h-3 mr-1" />{format(parseISO(log.timestamp), 'p')}
                         </p>
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

export default ReportsPage;

    