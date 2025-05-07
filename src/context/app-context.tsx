"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { EstimateCarbonFootprintFromMealPhotoOutput } from '@/ai/flows/estimate-carbon-footprint';
import type { FoodItem } from '@/ai/schemas'; 
import { generateWeeklyTip } from '@/ai/flows/generate-weekly-tip';
import type { GenerateWeeklyTipInput } from '@/ai/schemas';
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';


// Define interfaces directly or import if they exist elsewhere
interface User {
  name: string;
  email: string;
}

export interface MealLog {
  userEmail: string;
  date: string; // YYYY-MM-DD (local date of the meal)
  timestamp: string; // ISO string for precise time (UTC)
  photoDataUri: string;
  foodItems: FoodItem[];
  totalCarbonFootprint: number;
}

interface CachedWeeklyTip {
  tip: string;
  timestamp: number; // Timestamp of when the tip was generated
}

interface AppContextProps {
  user: User | null;
  login: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  mealPhoto: string | null;
  setMealPhoto: (photoDataUri: string | null) => void;
  mealResult: EstimateCarbonFootprintFromMealPhotoOutput | null;
  mealSuggestion: string | null; 
  setMealResult: (result: EstimateCarbonFootprintFromMealPhotoOutput | null, suggestion?: string | null) => void; 
  mealLogs: MealLog[];
  addMealLog: (log: MealLog) => Promise<void>;
  isLoading: boolean;
  weeklyTip: string | null;
  isLoadingWeeklyTip: boolean;
  fetchWeeklyTip: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Simple localStorage keys
const USER_STORAGE_KEY = 'ecoPlateUser';
const MEAL_LOGS_STORAGE_KEY = 'ecoPlateMealLogs';
const WEEKLY_TIP_STORAGE_KEY_PREFIX = 'ecoPlateWeeklyTip_';


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mealPhoto, setMealPhotoState] = useState<string | null>(null);
  const [mealResult, setMealResultState] = useState<EstimateCarbonFootprintFromMealPhotoOutput | null>(null);
  const [mealSuggestion, setMealSuggestionState] = useState<string | null>(null); 
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [weeklyTip, setWeeklyTip] = useState<string | null>(null);
  const [isLoadingWeeklyTip, setIsLoadingWeeklyTip] = useState(false);


  useEffect(() => {
    setIsLoading(true);
    try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        }

        const storedLogs = localStorage.getItem(MEAL_LOGS_STORAGE_KEY);
        if (storedLogs) {
          const logs: MealLog[] = JSON.parse(storedLogs);
          // Ensure logs always have a valid local date string if migrating old data
          const migratedLogs = logs.map(log => ({
            ...log,
            date: log.date || format(parseISO(log.timestamp), 'yyyy-MM-dd') 
          }));
          migratedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setMealLogs(migratedLogs);
        }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (name: string, email: string) => {
    setIsLoading(true);
    const newUser = { name, email };
    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    setWeeklyTip(null); // Clear previous user's weekly tip
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setUser(null);
    setMealPhotoState(null);
    setMealResultState(null);
    setMealSuggestionState(null); 
    setWeeklyTip(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setIsLoading(false);
  }, []);

  const setMealPhoto = useCallback((photoDataUri: string | null) => {
    setMealPhotoState(photoDataUri);
  }, []);

  const setMealResult = useCallback((result: EstimateCarbonFootprintFromMealPhotoOutput | null, suggestion: string | null = null) => {
    setMealResultState(result);
    setMealSuggestionState(suggestion); 
  }, []);


  const addMealLog = useCallback(async (newLogData: Omit<MealLog, 'date' | 'timestamp'> & { date?: string, timestamp?: string }) => {
    // Ensure date is the local date and timestamp is UTC
    const currentDate = new Date();
    const logToAdd: MealLog = {
      ...newLogData,
      date: format(currentDate, 'yyyy-MM-dd'), // Use local date
      timestamp: currentDate.toISOString(),     // Use UTC timestamp
    };

    setMealLogs(prevLogs => {
      const allLogs = [logToAdd, ...prevLogs];
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); 
      localStorage.setItem(MEAL_LOGS_STORAGE_KEY, JSON.stringify(allLogs));
      return allLogs; 
    });
  }, []);

   const currentUserMealLogs = useMemo(() => {
     if (!user) return [];
     return mealLogs.filter(log => log.userEmail === user.email);
   }, [user, mealLogs]);

  const fetchWeeklyTip = useCallback(async () => {
    if (!user || currentUserMealLogs.length === 0) {
      setWeeklyTip(null);
      return;
    }
    setIsLoadingWeeklyTip(true);

    const cacheKey = `${WEEKLY_TIP_STORAGE_KEY_PREFIX}${user.email}`;
    const cachedDataString = localStorage.getItem(cacheKey);
    
    if (cachedDataString) {
      try {
        const cachedData: CachedWeeklyTip = JSON.parse(cachedDataString);
        const cacheDate = new Date(cachedData.timestamp);
        const today = new Date();
        if (differenceInCalendarDays(today, cacheDate) === 0 && cachedData.tip) {
          setWeeklyTip(cachedData.tip);
          setIsLoadingWeeklyTip(false);
          return;
        }
      } catch (e) {
        console.error("Error parsing cached weekly tip:", e);
        localStorage.removeItem(cacheKey); 
      }
    }

    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);

    const recentLogs = currentUserMealLogs.filter(log => {
      const logDateObj = parseISO(log.date); // log.date is 'YYYY-MM-DD' (local)
      return logDateObj >= sevenDaysAgo && logDateObj <= today;
    });

    if (recentLogs.length === 0) {
      setWeeklyTip("Log more meals this week to get personalized tips!");
      setIsLoadingWeeklyTip(false);
      return;
    }
    
    const logsByDay: { [key: string]: MealLog[] } = {};
    recentLogs.forEach(log => {
        const dayKey = log.date; // log.date is already 'YYYY-MM-DD' (local)
        if (!logsByDay[dayKey]) {
            logsByDay[dayKey] = [];
        }
        logsByDay[dayKey].push(log);
    });

    const mealLogsSummary = Object.entries(logsByDay)
      .sort(([dateA], [dateB]) => parseISO(dateA).getTime() - parseISO(dateB).getTime()) 
      .map(([date, logs], index) => {
        const dayOfWeek = format(parseISO(date), 'EEEE (MMM d)'); // date is 'YYYY-MM-DD'
        const mealsString = logs.map(log => 
            `${log.foodItems.map(item => `${item.name} (${item.quantity})`).join(', ') || 'Logged Meal'} (Total: ${log.totalCarbonFootprint.toFixed(2)} kg CO₂e)`
        ).join('; ');
        return `Day ${index + 1} (${dayOfWeek}): ${mealsString}`;
      }).join('\n');

    try {
      const input: GenerateWeeklyTipInput = { mealLogsSummary };
      const result = await generateWeeklyTip(input);
      setWeeklyTip(result.tip);
      localStorage.setItem(cacheKey, JSON.stringify({ tip: result.tip, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching weekly tip:", error);
      setWeeklyTip("Could not fetch a weekly tip at this time. Please try again later.");
    } finally {
      setIsLoadingWeeklyTip(false);
    }
  }, [user, currentUserMealLogs]);


  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      mealPhoto,
      setMealPhoto,
      mealResult,
      mealSuggestion, 
      setMealResult,
      mealLogs: currentUserMealLogs, 
      addMealLog,
      isLoading,
      weeklyTip,
      isLoadingWeeklyTip,
      fetchWeeklyTip,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextProps => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

