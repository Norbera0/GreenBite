
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Leaf, Utensils, CalendarDays, Clock } from 'lucide-react'; // Added CalendarDays, Clock
import Header from '@/components/header';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay, isSameDay, getHours } from 'date-fns';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Removed TabsContent as we are not using it here.
import type { MealLog } from '@/context/app-context';
import { cn } from '@/lib/utils';


const HomePage: NextPage = () => {
  const { user, mealLogs, isLoading } = useAppContext();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedMealType, setSelectedMealType] = useState<string>("Breakfast"); // Default to Breakfast

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
    
    const numDaysForAverage = daysWithLogs.size > 0 ? daysWithLogs.size : 1; // Avoid division by zero
    return { 
      todaysTotalCO2e: daily, 
      weeklyTotalCO2e: weekly, 
      averageDailyCO2e: weekly / numDaysForAverage
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
    return eachDayOfInterval({ start: sevenDaysAgoDateObj, end: todayDateObj }); // Oldest to newest
  }, [sevenDaysAgoDateObj, todayDateObj]);


  const filteredMealsForSelectedDateTimeType = useMemo(() => {
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    return mealLogs.filter(log => {
      if (log.date !== selectedDateStr) {
        return false;
      }
      const logHour = getHours(parseISO(log.timestamp));
      switch (selectedMealType) {
        case "Breakfast":
          return logHour >= 4 && logHour < 10; // 4:00 AM - 9:59 AM
        case "Lunch":
          return logHour >= 10 && logHour < 18; // 10:00 AM - 5:59 PM
        case "Dinner":
          return logHour >= 18 || logHour < 4; // 6:00 PM - 3:59 AM (next day)
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
      <Header title="Home" />
      
      <main className="flex-grow container mx-auto p-4 space-y-6">
        <Card className="bg-primary/5 shadow-lg border-primary/20">
          <CardContent className="p-4 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-2">
            <div className="flex-1 text-center py-2">
              <p className="text-xs font-medium text-primary/80 uppercase">As of Today</p>
              <p className="text-4xl font-bold text-primary">{todaysTotalCO2e.toFixed(2)}</p>
              <p className="text-sm text-primary/90">kg CO₂e</p>
            </div>
            <div className="border-l border-primary/20 hidden sm:block"></div>
            <hr className="border-primary/10 sm:hidden" />
            <div className="flex-1 space-y-2 py-2">
              <div className="text-center">
                <p className="text-xs font-medium text-primary/80 uppercase">Avg. Daily (Last 7 Days)</p>
                <p className="text-2xl font-semibold text-primary">{averageDailyCO2e.toFixed(2)}</p>
                <p className="text-xs text-primary/90">kg CO₂e</p>
              </div>
              <hr className="border-primary/10"/>
              <div className="text-center">
                <p className="text-xs font-medium text-primary/80 uppercase">Total Weekly (Last 7 Days)</p>
                 <p className="text-2xl font-semibold text-primary">{weeklyTotalCO2e.toFixed(2)}</p>
                <p className="text-xs text-primary/90">kg CO₂e</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-center text-primary">Released CO₂e (Last 7 Days)</CardTitle>
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
            ) : filteredMealsForSelectedDateTimeType.length > 0 ? (
              <ScrollArea className="h-[300px] pr-3">
                <ul className="space-y-4">
                  {filteredMealsForSelectedDateTimeType.map((log, index) => (
                    <li key={log.timestamp + index} className="flex items-start space-x-3 p-3 bg-background rounded-lg border border-border/70 shadow-sm hover:shadow-md transition-shadow">
                      {log.photoDataUri ? (
                        <img data-ai-hint="food meal" src={log.photoDataUri} alt="Meal" className="w-20 h-20 object-cover rounded-md border" />
                      ) : (
                        <div className="w-20 h-20 bg-secondary rounded-md flex items-center justify-center flex-shrink-0">
                          <Utensils className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                           <p className="text-sm font-semibold text-primary truncate" title={log.foodItems.map(item => item.name).join(', ') || "Meal"}>
                             {log.foodItems.map(item => item.name).join(', ') || "Meal"}
                           </p>
                           <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center">
                             <Clock className="w-3 h-3 mr-1" />{format(parseISO(log.timestamp), 'p')}
                           </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {log.foodItems.map(item => item.quantity).filter(Boolean).join(', ') || "Quantity not specified"}
                        </p>
                        <p className="text-sm font-medium text-primary">{log.totalCarbonFootprint.toFixed(2)} kg CO₂e</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No {selectedMealType.toLowerCase()} logged for {format(selectedDate, 'MMM dd, yyyy')}.
              </div>
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
