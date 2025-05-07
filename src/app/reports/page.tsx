
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
import { Leaf, CalendarDays, Lightbulb, Loader2 } from 'lucide-react'; // Added Lightbulb, Loader2
// import { Tooltip as ShadTooltip, TooltipContent as ShadTooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip" // Added for info icon

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
  const { user, mealLogs, isLoading, weeklyTip, isLoadingWeeklyTip, fetchWeeklyTip } = useAppContext();
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && mealLogs.length > 0 && activeTab === "overview") { // Fetch tip when overview is active and logs are available
      fetchWeeklyTip();
    }
  }, [user, mealLogs, fetchWeeklyTip, activeTab]);


  const today = useMemo(() => new Date(), []);
  const sevenDaysAgo = useMemo(() => subDays(today, 6), [today]);

  // Calculate Totals
  const { dailyTotal, weeklyTotal, dailyLogsGrouped } = useMemo(() => {
    if (!mealLogs) return { dailyTotal: 0, weeklyTotal: 0, dailyLogsGrouped: {} };

    const todayStr = format(today, 'yyyy-MM-dd');
    let daily = 0;
    let weekly = 0;

    mealLogs.forEach(log => {
      const logDate = parseISO(log.timestamp); 
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

     dateInterval.forEach(day => {
       dailyTotalsMap.set(format(day, 'yyyy-MM-dd'), 0);
     });

     mealLogs.forEach(log => {
       const dateStr = format(parseISO(log.timestamp), 'yyyy-MM-dd');
       if (dailyTotalsMap.has(dateStr)) {
         dailyTotalsMap.set(dateStr, (dailyTotalsMap.get(dateStr) ?? 0) + log.totalCarbonFootprint);
       }
     });
     
     return Array.from(dailyTotalsMap.entries()).map(([date, total]) => ({
       name: format(parseISO(date), 'EEE'), 
       totalCO2e: parseFloat(total.toFixed(2)), 
       fullDate: date, 
     }));
   }, [mealLogs, sevenDaysAgo, today]);

  if (isLoading || !user) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading...</span></div>;
  }

  const sortedDates = Object.keys(dailyLogsGrouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header title="Reports" />
      <main className="flex-grow container mx-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
           <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">Meal Log History</TabsTrigger>
          </TabsList>

           <TabsContent value="overview">
             <div className="grid gap-6 md:grid-cols-2"> {/* Increased gap */}
                {/* Totals Card */}
                <Card className="shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">CO₂e Totals</CardTitle> {/* text-base */}
                     <Leaf className="h-5 w-5 text-muted-foreground" /> {/* h-5 w-5 */}
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2"> {/* Added pt-2, increased space-y */}
                     <div>
                        <div className="text-3xl font-bold">{dailyTotal.toFixed(2)} kg</div> {/* text-3xl */}
                        <p className="text-xs text-muted-foreground">Today's Total</p>
                     </div>
                     <div>
                        <div className="text-3xl font-bold">{weeklyTotal.toFixed(2)} kg</div> {/* text-3xl */}
                        <p className="text-xs text-muted-foreground">Last 7 Days Total</p>
                     </div>
                  </CardContent>
                </Card>

               {/* 7-Day Graph Card */}
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle className="text-base font-medium">7-Day Carbon Footprint Trend</CardTitle> {/* text-base */}
                     <CardDescription className="text-xs">kg CO₂e per day</CardDescription> {/* text-xs */}
                  </CardHeader>
                  <CardContent className="h-[220px] p-0 pr-2 pb-2"> {/* Increased height */}
                     <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={graphData} margin={{ top: 5, right:10, left: -25, bottom: 5 }}> {/* Adjusted margins */}
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
                          tickFormatter={(value) => `${value}`} // Removed kg suffix, added to label
                          width={35} // Give Y-axis more space
                         />
                         <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', radius: 4 }}
                             contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px', padding: '8px' }} 
                             labelStyle={{ color: 'hsl(var(--foreground))', marginBottom: '4px', fontWeight: 'bold' }}
                             itemStyle={{ color: 'hsl(var(--primary))' }}
                            formatter={(value: number, name: string, props: any) => [`${value.toFixed(2)} kg CO₂e`, `Total for ${props.payload.name}`]}
                         />
                         <Bar dataKey="totalCO2e" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={25} /> {/* Adjust barSize */}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly Tip Card */}
                <Card className="shadow-md md:col-span-1"> {/* Spans 1 column on md+ */}
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium">💡 Weekly Tip</CardTitle>
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
                            <p className="text-sm text-muted-foreground">No tip available yet. Log some meals!</p>
                        )}
                    </CardContent>
                </Card>
                
                {/* Empty 4th Card placeholder - can be removed or used later */}
                <Card className="shadow-md md:col-span-1 bg-muted/30 border-dashed hidden md:flex items-center justify-center">
                    <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground">Future insights here!</p>
                    </CardContent>
                </Card>

              </div>
           </TabsContent>

           <TabsContent value="logs">
             <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold flex items-center">
                     <CalendarDays className="h-5 w-5 mr-2 text-primary"/>
                     Daily Meal Log History
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
                               <li key={`${log.timestamp}-${index}`} className="flex items-center justify-between p-3 bg-card rounded-md border border-border/50 hover:bg-muted/50 transition-colors"> 
                                 <div className="flex items-center space-x-3 flex-1 min-w-0"> 
                                   {log.photoDataUri ? (
                                     <img src={log.photoDataUri} alt={`Meal from ${format(parseISO(log.timestamp), 'p')}`} className="w-12 h-12 object-cover rounded-md border"/>
                                   ) : (
                                     <div className="w-12 h-12 bg-secondary rounded-md flex items-center justify-center flex-shrink-0"> 
                                        <Leaf className="w-6 h-6 text-muted-foreground"/>
                                     </div>
                                   )}
                                    <div className="flex-1 min-w-0"> 
                                      <p className="text-sm font-medium truncate" title={log.foodItems.map(i => i.name).join(', ') || 'Logged Meal'}> 
                                          {log.foodItems.map(i => i.name).join(', ') || 'Logged Meal'}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), 'p')}</p> 
                                    </div>
                                 </div>
                                  <span className="text-sm font-semibold text-primary ml-3 whitespace-nowrap">{log.totalCarbonFootprint.toFixed(2)} kg CO₂e</span>
                               </li>
                            ))}
                          </ul>
                         </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">No meals logged yet. Start logging to see your history!</p>
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
