
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card'; 
import { Plus, Leaf, Utensils, Clock, ArrowDown, ArrowUp, PlusCircle, Apple, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, addDays, eachDayOfInterval, parseISO, startOfDay, isSameDay, getHours, startOfWeek, endOfWeek } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import Header from '@/components/header'; // Import Header


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

const ReportsPage: NextPage = () => { // Renamed from HomePage to ReportsPage
  const { user, mealLogs, isLoading } = useAppContext();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedMealType, setSelectedMealType] = useState<string>("Breakfast"); 

  const todayDateObj = useMemo(() => startOfDay(new Date()), []);

  const allScrollableDates = useMemo(() => {
    const startDate = subDays(todayDateObj, 14);
    const endDate = addDays(todayDateObj, 7); // Allow scrolling a bit into the future
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [todayDateObj]);

  const initialDateScrollerOffset = useMemo(() => {
    const todayIndex = allScrollableDates.findIndex(date => isSameDay(date, todayDateObj));
    // Center today's date in the scroller if possible
    return Math.max(0, Math.min(allScrollableDates.length - VISIBLE_DATES_IN_SCROLLER, todayIndex - Math.floor(VISIBLE_DATES_IN_SCROLLER / 2)));
  }, [allScrollableDates, todayDateObj]);
  
  const [dateScrollerOffset, setDateScrollerOffset] = useState(initialDateScrollerOffset);

  useEffect(() => {
    // Reset offset if todayDateObj changes (though it's memoized based on new Date())
    // This ensures if the component somehow remounts on a new day, it re-centers.
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


  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);
  
  // Graph data fixed to current week, Monday to Sunday
  const currentGraphWeekStart = useMemo(() => startOfWeek(todayDateObj, { weekStartsOn: 1 }), [todayDateObj]); // Monday as start of week
  const currentGraphWeekEnd = useMemo(() => endOfWeek(todayDateObj, { weekStartsOn: 1 }), [todayDateObj]);   // Sunday as end of week

  // Calculate totals and changes based on mealLogs and todayDateObj
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

    // Current 7-day period for rolling average and total
    const currentPeriodEnd = todayDateObj; // End of today
    const currentPeriodStart = startOfDay(subDays(todayDateObj, 6)); // 7 days including today

    // Previous 7-day period for comparison
    const previousPeriodEnd = startOfDay(subDays(todayDateObj, 7)); // End of day 7 days ago
    const previousPeriodStart = startOfDay(subDays(todayDateObj, 13)); // Start of day 13 days ago (7 days before currentPeriodStart)

    let calculatedTodaysTotalCO2e = 0;
    let current7DayTotal = 0;
    const current7DayLogsDates = new Set<string>(); // To count active days
    let previous7DayTotal = 0;
    const previous7DayLogsDates = new Set<string>(); // To count active days in previous period

    mealLogs.forEach(log => {
      const logDateObj = parseISO(log.date); // log.date is 'yyyy-MM-dd'

      // Today's total
      if (log.date === todayDateStr) {
        calculatedTodaysTotalCO2e += log.totalCarbonFootprint;
      }

      // Current 7-day period
      if (logDateObj >= currentPeriodStart && logDateObj <= currentPeriodEnd) {
        current7DayTotal += log.totalCarbonFootprint;
        current7DayLogsDates.add(log.date);
      }

      // Previous 7-day period
      if (logDateObj >= previousPeriodStart && logDateObj <= previousPeriodEnd) {
        previous7DayTotal += log.totalCarbonFootprint;
        previous7DayLogsDates.add(log.date);
      }
    });

    const current7DayActiveDays = current7DayLogsDates.size > 0 ? current7DayLogsDates.size : 1; // Avoid division by zero
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


  // Prepare data for the graph (current week, Mon-Sun)
  const graphData = useMemo(() => {
    if (!mealLogs) return [];

    const dateInterval = eachDayOfInterval({ start: currentGraphWeekStart, end: currentGraphWeekEnd });
    const dailyTotalsMap = new Map<string, number>();

    // Initialize map with all days of the current week
    dateInterval.forEach(day => {
      dailyTotalsMap.set(format(day, 'yyyy-MM-dd'), 0);
    });

    // Populate map with totals from mealLogs
    mealLogs.forEach(log => {
      const logDateObj = parseISO(log.date); // log.date is 'yyyy-MM-dd'
      // Ensure log is within the graph's date range (Mon-Sun of current week)
      if (logDateObj >= currentGraphWeekStart && logDateObj <= currentGraphWeekEnd) {
        const dateStr = log.date; // Use the 'yyyy-MM-dd' string directly
        dailyTotalsMap.set(dateStr, (dailyTotalsMap.get(dateStr) ?? 0) + log.totalCarbonFootprint);
      }
    });

    // Convert map to array for the chart, ensuring correct day names
    return Array.from(dailyTotalsMap.entries()).map(([date, total]) => ({
      name: format(parseISO(date), 'EEE'), // Format date as 'Mon', 'Tue', etc.
      totalCO2e: parseFloat(total.toFixed(2)), // Ensure it's a number
      fullDate: date, // Store full date for potential click interactions
    })).sort((a,b) => parseISO(a.fullDate).getTime() - parseISO(b.fullDate).getTime()); // Ensure chronological order
  }, [mealLogs, currentGraphWeekStart, currentGraphWeekEnd]);
  

  // Filter meals for the selected date and meal type (Breakfast, Lunch, Dinner)
  const filteredMealsForSelectedDateTimeType = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return mealLogs.filter(log => {
      if (log.date !== selectedDateStr) {
        return false;
      }
      // Determine meal type based on log timestamp
      const logHour = getHours(parseISO(log.timestamp)); // log.timestamp is ISO string
      switch (selectedMealType) {
        case "Breakfast":
          return logHour >= 4 && logHour < 10; // 4 AM to 9:59 AM
        case "Lunch":
          return logHour >= 10 && logHour < 18; // 10 AM to 5:59 PM
        case "Dinner":
          // Covers 6 PM to 3:59 AM (next day technically, but logged under current dinner)
          return logHour >= 18 || logHour < 4; 
        default:
          return false;
      }
    });
  }, [mealLogs, selectedDate, selectedMealType]);

  // Determine Y-axis max for the graph
  const yAxisDomainMax = useMemo(() => {
    if (!graphData || graphData.length === 0) return 5; // Default if no data
    const maxVal = Math.max(...graphData.map(d => d.totalCO2e), 0);
    const roundedMax = Math.ceil(maxVal / 5) * 5; // Round up to nearest 5
    return Math.max(5, roundedMax + (roundedMax > 0 ? 1 : 0) ); // Ensure a little space above, min 5
  }, [graphData]);


  if (isLoading || !user) {
    // Show a loading state or redirect handled by useEffect
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  const mealTypes = ["Breakfast", "Lunch", "Dinner"];

  return (
    <div className="flex flex-col min-h-screen bg-background">
       <Header title="Reports" /> {/* Changed title to "Reports" */}
      <main className="flex-grow container mx-auto px-4 py-6 space-y-6">
        {/* Top Panel: CO2e Stats - Adhering to the visual style provided */}
        <Card className="bg-primary-light shadow-lg border-primary/20 overflow-hidden">
          <CardContent className="p-3 flex flex-row"> {/* Adjusted padding */}
            {/* Left Side: "AS OF TODAY" */}
            <div className="flex-1 text-center pr-2 sm:pr-3 py-2 border-r border-primary/30 flex flex-col justify-center items-center"> {/* Centering content */}
              <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">AS OF TODAY</p>
              <p className="text-4xl sm:text-5xl font-bold text-primary my-1">{todaysTotalCO2e.toFixed(0)}</p>
              <p className="text-xs sm:text-sm text-gray-500">kg CO₂e</p>
            </div>
            
            {/* Right Side: "AVE. DAILY" and "OVER THE LAST 7 DAYS" */}
            <div className="flex-1 pl-2 sm:pl-3 flex flex-col justify-around"> {/* Takes remaining space, items spread out */}
              {/* Average Daily */}
              <div className="text-center flex-1 flex flex-col justify-center py-1">
                <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">AVE. DAILY</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-700">{rolling7DayAverageDailyCO2e.toFixed(0)}</p>
                  <span className={`text-xs font-medium flex items-center ${avgDailyChange.direction === 'down' ? 'text-green-500' : (avgDailyChange.direction === 'up' ? 'text-red-500' : 'text-gray-500')}`}>
                    {avgDailyChange.direction === 'down' ? <ArrowDown className="w-3 h-3" /> : (avgDailyChange.direction === 'up' ? <ArrowUp className="w-3 h-3" /> : null)}
                    {avgDailyChange.value.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">kg CO₂e</p>
              </div>

              <hr className="border-primary/20 my-1" /> {/* Thin separator line */}

              {/* Over The Last 7 Days */}
              <div className="text-center flex-1 flex flex-col justify-center py-1">
                <p className="text-xs font-bold uppercase text-gray-600 tracking-wider mb-1">OVER THE LAST 7 DAYS</p>
                <div className="flex items-baseline justify-center space-x-1">
                  <p className="text-2xl sm:text-3xl font-bold text-gray-700">{rolling7DayTotalCO2e.toFixed(0)}</p>
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

        {/* Graph: 7-Day Trend */}
        <Card className="shadow-lg">
           <CardContent className="h-[250px] p-2 pt-4"> {/* Ensure padding for content */}
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} unit="kg" domain={[0, yAxisDomainMax]} allowDecimals={false} tickCount={ Math.min(6, yAxisDomainMax + 1) } />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
                  itemStyle={{ color: 'hsl(var(--chart-2))' }} // Using chart-2 for line color
                  formatter={(value: number, name: string, props: any) => [`${(typeof value === 'number' ? value : 0).toFixed(2)} kg CO₂e`, `Total for ${format(parseISO(props.payload.fullDate), 'EEE, MMM d')}`]}
                 />
                <Line type="monotone" dataKey="totalCO2e" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--chart-2))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Date Scroller */}
        <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" onClick={handlePrevDates} disabled={dateScrollerOffset === 0} aria-label="Previous dates">
                <ChevronLeft className="h-6 w-6" />
            </Button>
            <ScrollArea className="w-full whitespace-nowrap rounded-md flex-grow">
              <div className="flex space-x-3 pb-2">
                {dateScrollerDates.map(date => (
                  <Button
                    key={date.toISOString()}
                    variant={isSameDay(date, selectedDate) ? "default" : "outline"}
                    className={cn("flex flex-col items-center justify-center h-16 w-16 p-2 shadow-md transition-all shrink-0", 
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
            <Button variant="ghost" size="icon" onClick={handleNextDates} disabled={dateScrollerOffset >= allScrollableDates.length - VISIBLE_DATES_IN_SCROLLER} aria-label="Next dates">
                <ChevronRight className="h-6 w-6" />
            </Button>
        </div>


        {/* Meal Type Tabs */}
        <Tabs defaultValue={selectedMealType} onValueChange={setSelectedMealType} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-12 bg-card border">
            {mealTypes.map(type => (
              <TabsTrigger key={type} value={type} className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
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
                  {/* "Add Food" item always on top */}
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
                  {/* Display filtered meal logs */}
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
                           {/* Swapped time and CO2e */}
                           <span className="text-sm font-medium text-primary whitespace-nowrap ml-2">
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

      {/* Floating Action Button for Log Meal */}
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
