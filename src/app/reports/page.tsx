
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO, startOfDay } from 'date-fns';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import type { MealLog } from '@/context/app-context';
import { Leaf, CalendarDays, Lightbulb, Loader2, Info } from 'lucide-react';

// Utility to group logs by date
const groupLogsByDate = (logs: MealLog[]): { [date: string]: MealLog[] } => {
  return logs.reduce((acc, log) => {
    const date = log.date; // Assuming date is YYYY-MM-DD (local)
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as { [date: string]: MealLog[] });
};

const ReportsPage: NextPage = () => {
  const router = useRouter();
  const { user, mealLogs, isLoading, weeklyTip, isLoadingWeeklyTip, fetchWeeklyTip } = useAppContext();
  const [selectedDateForLogView, setSelectedDateForLogView] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && mealLogs.length > 0 && !weeklyTip && !isLoadingWeeklyTip) { // Fetch only if no tip and not already loading
      fetchWeeklyTip();
    }
  }, [user, mealLogs, weeklyTip, isLoadingWeeklyTip, fetchWeeklyTip]);


  const todayDateObj = useMemo(() => startOfDay(new Date()), []); 
  const sevenDaysAgoDateObj = useMemo(() => startOfDay(subDays(todayDateObj, 6)), [todayDateObj]);

  // Calculate Totals
  const { dailyTotal, weeklyTotal, dailyLogsGrouped } = useMemo(() => {
    if (!mealLogs) return { dailyTotal: 0, weeklyTotal: 0, dailyLogsGrouped: {} };

    const todayStr = format(todayDateObj, 'yyyy-MM-dd');
    let daily = 0;
    let weekly = 0;

    mealLogs.forEach(log => {
      if (log.date === todayStr) {
        daily += log.totalCarbonFootprint;
      }
      
      const logDateObj = parseISO(log.date); 
      if (logDateObj >= sevenDaysAgoDateObj && logDateObj <= todayDateObj) {
        weekly += log.totalCarbonFootprint;
      }
    });

    const grouped = groupLogsByDate(mealLogs);
    return { dailyTotal: daily, weeklyTotal: weekly, dailyLogsGrouped: grouped };
  }, [mealLogs, todayDateObj, sevenDaysAgoDateObj]);

  // Prepare data for the 7-day graph
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
     
     const data = Array.from(dailyTotalsMap.entries()).map(([date, total]) => ({
       name: format(parseISO(date), 'EEE'), 
       totalCO2e: parseFloat(total.toFixed(2)), 
       fullDate: date, 
     }));
     data.sort((a, b) => parseISO(a.fullDate).getTime() - parseISO(b.fullDate).getTime());
     return data;
   }, [mealLogs, sevenDaysAgoDateObj, todayDateObj]);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const clickedBarData = data.activePayload[0].payload;
      setSelectedDateForLogView(clickedBarData.fullDate);
    }
  };

  const logsForSelectedDay = useMemo(() => {
    if (!selectedDateForLogView) return [];
    return dailyLogsGrouped[selectedDateForLogView] || [];
  }, [selectedDateForLogView, dailyLogsGrouped]);


  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading...</span></div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Reports" />
      <main className="flex-grow container mx-auto p-4"> {/* Ensure main content has padding */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Totals Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">CO₂e Totals</CardTitle>
              <Leaf className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div>
                <div className="text-3xl font-bold">{dailyTotal.toFixed(2)} kg</div>
                <p className="text-xs text-muted-foreground">Today's Total</p>
              </div>
              <div>
                <div className="text-3xl font-bold">{weeklyTotal.toFixed(2)} kg</div>
                <p className="text-xs text-muted-foreground">Last 7 Days Total</p>
              </div>
            </CardContent>
          </Card>

          {/* 7-Day Graph Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-medium">7-Day Carbon Footprint Trend</CardTitle>
              <CardDescription className="text-xs">kg CO₂e per day. Click a bar to see daily logs.</CardDescription>
            </CardHeader>
            <CardContent className="h-[220px] p-0 pr-2 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={graphData} onClick={handleBarClick} margin={{ top: 5, right:10, left: -25, bottom: 5 }}> {/* Adjusted left margin */}
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    width={45} 
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                    contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }} 
                    labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                    formatter={(value: number, name: string, props: any) => [`${value.toFixed(2)} kg CO₂e`, `Total for ${format(parseISO(props.payload.fullDate), 'EEE, MMM d')}`]}
                  />
                  <Bar dataKey="totalCO2e" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={25} className="cursor-pointer" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Weekly Tip Card */}
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Weekly Tip</CardTitle>
              <Lightbulb className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-2 min-h-[100px] flex items-center justify-center">
              {isLoadingWeeklyTip ? (
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Generating your tip...</span>
                </div>
              ) : weeklyTip ? (
                <p className="text-sm text-foreground leading-relaxed">{weeklyTip}</p>
              ) : (
                 mealLogs.length === 0 ? (
                   <p className="text-sm text-muted-foreground">Log some meals to get your first weekly tip!</p>
                 ) : (
                   <p className="text-sm text-muted-foreground">Your weekly tip is being prepared. Check back soon!</p>
                 )
              )}
            </CardContent>
          </Card>
          
          {/* Daily Meal Logs for Selected Day Card */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center">
                <CalendarDays className="h-5 w-5 mr-2 text-primary"/>
                {selectedDateForLogView ? `Meals for ${format(parseISO(selectedDateForLogView), 'MMM d, yyyy')}` : 'Daily Meal Details'}
              </CardTitle>
              <CardDescription className="text-xs">
                {selectedDateForLogView ? `Details for the selected day.` : 'Click a day on the graph above to view meals.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[220px] p-0"> {/* Ensure content area has defined height */}
              <ScrollArea className="h-full w-full p-3 pr-4">
                {!selectedDateForLogView ? (
                  <p className="text-muted-foreground text-center py-8">Click a day on the graph to view meals.</p>
                ) : logsForSelectedDay.length > 0 ? (
                  <ul className="space-y-3">
                    {logsForSelectedDay.map((log, index) => (
                      <li key={`${log.timestamp}-${index}`} className="p-3 bg-card rounded-md border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), 'p')}</p>
                          <span className="text-sm font-semibold text-primary">{log.totalCarbonFootprint.toFixed(2)} kg CO₂e</span>
                        </div>
                        <div className="flex items-start space-x-3">
                          {log.photoDataUri ? (
                            <img src={log.photoDataUri} alt={`Meal from ${format(parseISO(log.timestamp), 'p')}`} className="w-12 h-12 object-cover rounded-md border"/>
                          ) : (
                            <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center flex-shrink-0"> 
                              <Leaf className="w-6 h-6 text-muted-foreground"/>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {log.foodItems.length > 0 ? (
                              log.foodItems.map((item, itemIndex) => (
                                <p key={itemIndex} className="text-sm truncate" title={`${item.name} ${item.quantity ? `(${item.quantity})` : ''}`}>
                                  {item.name} {item.quantity ? <span className="text-xs text-muted-foreground">({item.quantity})</span> : ''}
                                </p>
                              ))
                            ) : (
                              <p className="text-sm italic text-muted-foreground">Meal items not detailed.</p>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No meals logged for {format(parseISO(selectedDateForLogView), 'MMM d, yyyy')}.</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
