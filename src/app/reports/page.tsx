
"use client";

import type { NextPage } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subDays, eachDayOfInterval, parseISO } from 'date-fns';
import Header from '@/components/header';
import { useAppContext } from '@/context/app-context';
import type { MealLog } from '@/context/app-context';
import { Leaf, CalendarDays } from 'lucide-react';
import { Tooltip as ShadTooltip, TooltipContent as ShadTooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // Added for info icon

// Utility to group logs by date
const groupLogsByDate = (logs: MealLog[]): { [date: string]: MealLog[] } => {
  return logs.reduce((acc, log) => {
    const date = log.date; // Assuming date is YYYY-MM-DD
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as { [date: string]: MealLog[] });
};

const ReportsPage: NextPage = () => {
  const router = useRouter();
  const { user, mealLogs, isLoading } = useAppContext();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => subDays(today, 6), [today]);

  // Calculate Totals
  const { dailyTotal, weeklyTotal, dailyLogsGrouped } = useMemo(() => {
    if (!mealLogs) return { dailyTotal: 0, weeklyTotal: 0, dailyLogsGrouped: {} };

    const todayStr = format(today, 'yyyy-MM-dd');
    let daily = 0;
    let weekly = 0;

    mealLogs.forEach(log => {
      const logDate = parseISO(log.timestamp); // Use timestamp for accurate comparison
      if (format(logDate, 'yyyy-MM-dd') === todayStr) {
        daily += log.totalCarbonFootprint;
      }
      if (logDate >= sevenDaysAgo && logDate <= today) {
        weekly += log.totalCarbonFootprint;
      }
    });

    const grouped = groupLogsByDate(mealLogs);

    return { dailyTotal: daily, weeklyTotal: weekly, dailyLogsGrouped: grouped };
  }, [mealLogs, today, sevenDaysAgo]);

  // Prepare data for the 7-day graph
   const graphData = useMemo(() => {
     if (!mealLogs) return [];

     const dateInterval = eachDayOfInterval({ start: sevenDaysAgo, end: today });
     const dailyTotalsMap = new Map<string, number>();

     // Initialize map with 0 for each day in the interval (ensures chronological order)
     dateInterval.forEach(day => {
       dailyTotalsMap.set(format(day, 'yyyy-MM-dd'), 0);
     });

     // Aggregate totals from logs
     mealLogs.forEach(log => {
       const dateStr = format(parseISO(log.timestamp), 'yyyy-MM-dd');
       if (dailyTotalsMap.has(dateStr)) {
         dailyTotalsMap.set(dateStr, (dailyTotalsMap.get(dateStr) ?? 0) + log.totalCarbonFootprint);
       }
     });

     // Convert map to array format for the chart. Map iteration preserves insertion order, which is chronological here.
     return Array.from(dailyTotalsMap.entries()).map(([date, total]) => ({
       name: format(parseISO(date), 'EEE'), // Format date as 'Mon', 'Tue', etc.
       totalCO2e: parseFloat(total.toFixed(2)), // Ensure it's a number
       fullDate: date, // Keep full date for potential future use or debugging
     }));
     // Removed the complex and error-prone .sort() call. The data is inherently sorted chronologically.

   }, [mealLogs, sevenDaysAgo, today]);

  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  const sortedDates = Object.keys(dailyLogsGrouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Reports" />
      <main className="flex-grow container mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Daily Logs</TabsTrigger>
          </TabsList>

           <TabsContent value="overview">
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {/* Totals Card */}
                <Card className="shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">CO₂e Totals</CardTitle>
                     <Leaf className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                     <div className="text-2xl font-bold">{dailyTotal.toFixed(2)} kg</div>
                    <p className="text-xs text-muted-foreground">Today's Total</p>
                     <div className="text-2xl font-bold">{weeklyTotal.toFixed(2)} kg</div>
                    <p className="text-xs text-muted-foreground">Last 7 Days Total</p>
                  </CardContent>
                </Card>

               {/* 7-Day Graph Card */}
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">7-Day Carbon Footprint Trend</CardTitle>
                     <CardDescription>kg CO₂e per day</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px] p-0 pr-2 pb-2">
                     <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={graphData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}> {/* Adjusted margins */}
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
                          tickFormatter={(value) => `${value}kg`}
                         />
                         <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                             contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }} // Style tooltip
                             labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px' }}
                             itemStyle={{ color: 'hsl(var(--primary))' }}
                            formatter={(value: number) => [`${value.toFixed(2)} kg CO₂e`, 'Total']}
                         />
                         <Bar dataKey="totalCO2e" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} /> {/* Adjust barSize */}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
           </TabsContent>

           <TabsContent value="logs">
             <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                     <CalendarDays className="h-5 w-5 mr-2 text-primary"/>
                     Daily Meal Logs
                  </CardTitle>
                   <CardDescription>View your logged meals day by day, newest first.</CardDescription>
                </CardHeader>
                <CardContent>
                 <ScrollArea className="h-[400px] w-full pr-4">
                    {sortedDates.length > 0 ? (
                      sortedDates.map(date => (
                         <div key={date} className="mb-6">
                          <h3 className="text-md font-semibold mb-2 border-b pb-1">{format(parseISO(date), 'EEEE, MMMM do, yyyy')}</h3>
                          <ul className="space-y-3">
                            {dailyLogsGrouped[date].map((log, index) => (
                               <li key={`${log.timestamp}-${index}`} className="flex items-center justify-between p-3 bg-card rounded-md border border-border/50 hover:bg-muted/50 transition-colors"> {/* Added key, padding, border, hover */}
                                 <div className="flex items-center space-x-3 flex-1 min-w-0"> {/* Flex-1 and min-w-0 for truncation */}
                                   {log.photoDataUri ? (
                                     <img src={log.photoDataUri} alt={`Meal from ${format(parseISO(log.timestamp), 'p')}`} className="w-12 h-12 object-cover rounded-md border"/>
                                   ) : (
                                     <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center flex-shrink-0"> {/* flex-shrink-0 */}
                                        <Leaf className="w-6 h-6 text-muted-foreground"/>
                                     </div>
                                   )}
                                    <div className="flex-1 min-w-0"> {/* Flex-1 and min-w-0 for truncation */}
                                      <p className="text-sm font-medium truncate" title={log.foodItems.map(i => i.name).join(', ') || 'Logged Meal'}> {/* Truncate and add title */}
                                          {log.foodItems.map(i => i.name).join(', ') || 'Logged Meal'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), 'p')}</p> {/* Time */}
                                    </div>
                                 </div>
                                  <span className="text-sm font-semibold text-primary ml-3">{log.totalCarbonFootprint.toFixed(2)} kg CO₂e</span>
                               </li>
                            ))}
                          </ul>
                         </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No meals logged yet.</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
           </TabsContent>
         </Tabs>
       </main>
     </div>
   );
 };

 export default ReportsPage;

    