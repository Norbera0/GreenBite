"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { FoodItem, FoodSwap, ChatHistoryMessage, GenerateTipInput, IdentifiedItem as AIIdentifiedFoodItem, MealImpactLevel, GenerateDailyChallengeInput, GenerateDailyChallengeOutput, GenerateWeeklyChallengeInput, GenerateWeeklyChallengeOutput } from '@/ai/schemas'; 
import { generateWeeklyTip } from '@/ai/flows/generate-weekly-tip';
import { generateGeneralRecommendation } from '@/ai/flows/generate-general-recommendation';
import { generateFoodSwaps } from '@/ai/flows/generate-food-swaps';
import { askAIChatbot } from '@/ai/flows/ask-ai-chatbot';
import { generateDailyChallenge } from '@/ai/flows/generate-daily-challenge';
import { generateWeeklyChallenge } from '@/ai/flows/generate-weekly-challenge';
import { format, subDays, parseISO, differenceInCalendarDays, isSameDay, isSameWeek, startOfWeek, endOfWeek, getHours } from 'date-fns';


interface User {
  name: string;
  email: string;
}

// FoodItem type is now imported from '@/ai/schemas' and includes calculatedCO2eKg

export interface MealLog {
  userEmail: string;
  date: string; // YYYY-MM-DD (local date of the meal)
  timestamp: string; // ISO string for precise time (UTC)
  // photoDataUri is removed from long-term storage to save space
  foodItems: FoodItem[]; // User-confirmed food items, potentially with individual CO2e
  totalCarbonFootprint: number;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner';
}

export interface NewMealLogData {
  photoDataUri?: string; // Photo of the meal currently being logged
  foodItems: FoodItem[]; // Items with name, quantity, and potentially calculatedCO2eKg
  totalCarbonFootprint: number;
}

export interface FinalMealResult {
  foodItems: FoodItem[]; // User-confirmed items, potentially with individual CO2e
  carbonFootprintKgCO2e: number;
  carbonEquivalency?: string; 
  mealFeedbackMessage?: string; 
  impactLevel?: MealImpactLevel; 
  mealSuggestion?: string; 
}


interface CachedWeeklyTip {
  tip: string;
  timestamp: number; 
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export type DailyChallengeType = 'log_plant_based' | 'co2e_under_today' | 'avoid_red_meat_meal' | 'log_three_meals' | 'log_low_co2e_meal';
export interface DailyChallenge {
  id: string; 
  description: string;
  type: DailyChallengeType;
  targetValue?: number; 
  isCompleted: boolean;
  date: string; 
}

export type WeeklyChallengeType = 'weekly_co2e_under' | 'plant_based_meals_count' | 'log_days_count';
export interface WeeklyChallenge {
  id: string; 
  description: string;
  type: WeeklyChallengeType;
  targetValue: number;
  currentValue: number;
  startDate: string; 
  endDate: string; 
  isCompleted: boolean;
}

export interface StreakData {
  logStreak: number; 
  lastLogDate: string | null; 
}

interface AppContextProps {
  user: User | null;
  login: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  mealPhoto: string | null;
  setMealPhoto: (photoDataUri: string | null) => void;
  
  detectedMealItems: AIIdentifiedFoodItem[] | null; 
  setDetectedMealItems: (items: AIIdentifiedFoodItem[] | null) => void;

  mealResult: FinalMealResult | null; 
  setMealResult: (result: FinalMealResult | null) => void; 
  
  mealLogs: MealLog[];
  addMealLog: (logData: NewMealLogData) => Promise<FinalMealResult | null>; 
  isLoading: boolean;

  weeklyTip: string | null;
  isLoadingWeeklyTip: boolean;
  fetchWeeklyTip: (forceRefresh?: boolean) => Promise<void>;

  generalRecommendation: string | null;
  isLoadingGeneralRecommendation: boolean;
  fetchGeneralRecommendation: (forceRefresh?: boolean) => Promise<void>;
  
  foodSwaps: FoodSwap[];
  isLoadingFoodSwaps: boolean;
  fetchFoodSwaps: (forceRefresh?: boolean) => Promise<void>;
  updateFoodSwapTryThis: (swapIndex: number, tryThis: boolean) => void;

  chatMessages: ChatMessage[];
  isLoadingChatResponse: boolean;
  sendChatMessage: (question: string) => Promise<void>;
  clearChatMessages: () => void;

  dailyChallenge: DailyChallenge | null;
  isLoadingDailyChallenge: boolean;
  weeklyChallenge: WeeklyChallenge | null;
  isLoadingWeeklyChallenge: boolean;
  streakData: StreakData | null;
  refreshDailyChallenge: () => Promise<void>;
  refreshWeeklyChallenge: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const USER_STORAGE_KEY = 'greenBiteUser'; 
const MEAL_LOGS_STORAGE_KEY = 'greenBiteMealLogs'; 
const MAX_MEAL_LOGS_STORED = 20; // Reduced further to manage quota strictly
const DETECTED_ITEMS_STORAGE_KEY = 'greenBiteDetectedMealItems'; 
const WEEKLY_TIP_STORAGE_KEY_PREFIX = 'greenBiteWeeklyTip_';
const GENERAL_REC_STORAGE_KEY_PREFIX = 'greenBiteGeneralRec_';
const FOOD_SWAPS_STORAGE_KEY_PREFIX = 'greenBiteFoodSwaps_';
const CHAT_MESSAGES_STORAGE_KEY_PREFIX = 'greenBiteChatMessages_';
const DAILY_CHALLENGE_STORAGE_KEY_PREFIX = 'greenBiteDailyChallenge_';
const WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX = 'greenBiteWeeklyChallenge_';
const STREAK_DATA_STORAGE_KEY_PREFIX = 'greenBiteStreakData_';


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mealPhoto, setMealPhotoState] = useState<string | null>(null);
  const [detectedMealItems, setDetectedMealItemsState] = useState<AIIdentifiedFoodItem[] | null>(null);
  const [mealResult, setMealResultState] = useState<FinalMealResult | null>(null);

  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  
  const [weeklyTip, setWeeklyTip] = useState<string | null>(null);
  const [isLoadingWeeklyTip, setIsLoadingWeeklyTip] = useState(false);

  const [generalRecommendation, setGeneralRecommendation] = useState<string | null>(null);
  const [isLoadingGeneralRecommendation, setIsLoadingGeneralRecommendation] = useState(false);
  const [foodSwaps, setFoodSwaps] = useState<FoodSwap[]>([]);
  const [isLoadingFoodSwaps, setIsLoadingFoodSwaps] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChatResponse, setIsLoadingChatResponse] = useState(false);

  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [isLoadingDailyChallenge, setIsLoadingDailyChallenge] = useState(false);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
  const [isLoadingWeeklyChallenge, setIsLoadingWeeklyChallenge] = useState(false);
  const [streakData, setStreakData] = useState<StreakData | null>({ logStreak: 0, lastLogDate: null });

  const currentUserMealLogs = useMemo(() => {
    if (!user) return [];
    return mealLogs.filter(log => log.userEmail === user.email);
  }, [user, mealLogs]);

  const getMealType = (timestamp: string): 'Breakfast' | 'Lunch' | 'Dinner' => {
    const hour = getHours(parseISO(timestamp));
    if (hour >= 4 && hour < 10) return 'Breakfast';
    if (hour >= 10 && hour < 18) return 'Lunch';
    return 'Dinner';
  };

  useEffect(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        
        const storedChat = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedChat) setChatMessages(JSON.parse(storedChat));

        const storedDailyChallenge = localStorage.getItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedDailyChallenge) setDailyChallenge(JSON.parse(storedDailyChallenge));
        
        const storedWeeklyChallenge = localStorage.getItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedWeeklyChallenge) setWeeklyChallenge(JSON.parse(storedWeeklyChallenge));

        const storedStreak = localStorage.getItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedStreak) setStreakData(JSON.parse(storedStreak));
        else setStreakData({ logStreak: 0, lastLogDate: null });

        const storedDetectedItems = localStorage.getItem(DETECTED_ITEMS_STORAGE_KEY);
        if(storedDetectedItems) setDetectedMealItemsState(JSON.parse(storedDetectedItems));

      }

      const storedLogs = localStorage.getItem(MEAL_LOGS_STORAGE_KEY);
      if (storedLogs) {
        // The logs in storage are already just { userEmail, date, timestamp, foodItems, totalCarbonFootprint, mealType }
        const logsFromStorage: MealLog[] = JSON.parse(storedLogs); 
        const migratedLogs: MealLog[] = logsFromStorage.map(log => ({
          ...log, 
          date: log.date || format(parseISO(log.timestamp), 'yyyy-MM-dd'), // Ensure date field consistency
          mealType: log.mealType || getMealType(log.timestamp) // Ensure mealType consistency
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMealLogs(migratedLogs);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const getMealLogsSummaryForAI = useCallback((logsToSummarize: MealLog[], days = 7): string => {
    if (logsToSummarize.length === 0) return "No meals logged in the relevant period.";
    const today = new Date();
    const periodStart = subDays(today, days - 1); 
    
    const recentLogs = logsToSummarize.filter(log => {
        try {
            const logDateObj = parseISO(log.date); 
            return logDateObj >= periodStart && logDateObj <= today;
        } catch (e) {
            return false;
        }
    });

    if (recentLogs.length === 0) return `No meals logged in the last ${days} days.`;

    const logsByDay: { [key: string]: MealLog[] } = {};
    recentLogs.forEach(log => {
        const dayKey = log.date; 
        if (!logsByDay[dayKey]) {
            logsByDay[dayKey] = [];
        }
        logsByDay[dayKey].push(log);
    });

    return Object.entries(logsByDay)
      .sort(([dateA], [dateB]) => parseISO(dateA).getTime() - parseISO(dateB).getTime()) 
      .map(([date, logsForDay], index) => {
        const dayOfWeek = format(parseISO(date), 'EEEE (MMM d)');
        const mealsString = logsForDay.map(log =>
            `${log.foodItems.map(item => `${item.name} (${item.quantity || 'N/A'})${item.calculatedCO2eKg ? ` ~${item.calculatedCO2eKg.toFixed(2)}kg` : ''}`).join(', ') || 'Logged Meal'} (Total: ${log.totalCarbonFootprint.toFixed(2)} kg CO₂e, Meal: ${log.mealType || 'Unknown'})`
        ).join('; ');
        return `Day ${index + 1} (${dayOfWeek}): ${mealsString}`;
      }).join('\n') || "No meal activity to summarize.";
  }, []);

  const _generateAndSetDailyChallenge = useCallback(async (userHistorySummary?: string) => {
    if (!user) return;
    setIsLoadingDailyChallenge(true);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    try {
      const input: GenerateDailyChallengeInput = { userHistorySummary };
      const aiChallengeOutput: GenerateDailyChallengeOutput = await generateDailyChallenge(input);
      const newDailyChallenge: DailyChallenge = {
        ...aiChallengeOutput,
        id: `${aiChallengeOutput.type}_${todayStr}_${Date.now()}`,
        date: todayStr,
        isCompleted: false,
      };
      setDailyChallenge(newDailyChallenge);
      localStorage.setItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(newDailyChallenge));
    } catch (error) {
      console.error("Error generating daily challenge:", error);
    } finally {
      setIsLoadingDailyChallenge(false);
    }
  }, [user]);

  const checkAndRefreshDailyChallenge = useCallback(() => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const summary = getMealLogsSummaryForAI(currentUserMealLogs, 3); 
    if (!dailyChallenge || dailyChallenge.date !== todayStr) {
      _generateAndSetDailyChallenge(summary);
    }
  }, [user, dailyChallenge, _generateAndSetDailyChallenge, currentUserMealLogs, getMealLogsSummaryForAI]);

  const refreshDailyChallenge = useCallback(async () => {
    if (!user) return;
    const summary = getMealLogsSummaryForAI(currentUserMealLogs, 3);
    await _generateAndSetDailyChallenge(summary);
  }, [user, _generateAndSetDailyChallenge, currentUserMealLogs, getMealLogsSummaryForAI]);


  const _generateAndSetWeeklyChallenge = useCallback(async () => {
    if (!user) return;
    setIsLoadingWeeklyChallenge(true);
    const today = new Date();
    const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    try {
      const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs, 14); 
      const input: GenerateWeeklyChallengeInput = { mealLogsSummary };
      const aiChallengeOutput: GenerateWeeklyChallengeOutput = await generateWeeklyChallenge(input);
      
      const newWeeklyChallenge: WeeklyChallenge = {
        ...aiChallengeOutput,
        id: `${aiChallengeOutput.type}_${currentWeekStart}_${Date.now()}`,
        startDate: currentWeekStart,
        endDate: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        currentValue: 0, 
        isCompleted: false,
      };
      setWeeklyChallenge(newWeeklyChallenge);
      localStorage.setItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(newWeeklyChallenge));
    } catch (error) {
      console.error("Error generating weekly challenge:", error);
    } finally {
      setIsLoadingWeeklyChallenge(false);
    }
  }, [user, currentUserMealLogs, getMealLogsSummaryForAI]);

  const checkAndRefreshWeeklyChallenge = useCallback(() => {
    if (!user) return;
    const today = new Date();
    const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (!weeklyChallenge || weeklyChallenge.startDate !== currentWeekStart) {
      _generateAndSetWeeklyChallenge();
    }
  }, [user, weeklyChallenge, _generateAndSetWeeklyChallenge]);
  
  const refreshWeeklyChallenge = useCallback(async () => {
    if (!user) return;
    await _generateAndSetWeeklyChallenge();
  }, [user, _generateAndSetWeeklyChallenge]);


  useEffect(() => {
    if (user && !isLoading) { 
      checkAndRefreshDailyChallenge();
      checkAndRefreshWeeklyChallenge();
    }
  }, [user, isLoading, checkAndRefreshDailyChallenge, checkAndRefreshWeeklyChallenge]);
  

  const updateStreakOnMealLog = useCallback((logDateStr: string) => {
    if (!user) return;
    setStreakData(prevStreak => {
      const today = parseISO(logDateStr);
      let newStreakCount = prevStreak?.logStreak || 0;
      
      if (prevStreak?.lastLogDate) {
        const lastLog = parseISO(prevStreak.lastLogDate);
        const diffDays = differenceInCalendarDays(today, lastLog);
        if (diffDays === 1) {
          newStreakCount += 1;
        } else if (diffDays > 1) {
          newStreakCount = 1; 
        } else if (diffDays === 0) {
          newStreakCount = newStreakCount === 0 ? 1 : newStreakCount;
        }
      } else {
        newStreakCount = 1; 
      }
      
      const newStreak: StreakData = { ...prevStreak, logStreak: newStreakCount, lastLogDate: logDateStr };
      localStorage.setItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(newStreak));
      return newStreak;
    });
  }, [user]);

  const updateChallengesOnMealLog = useCallback((mealLog: MealLog) => {
    if (!user) return;

    if (dailyChallenge && dailyChallenge.date === mealLog.date && !dailyChallenge.isCompleted) {
      let dailyCompleted = false;
      const todaysLogsForChallenge = [...currentUserMealLogs, mealLog].filter(log => log.date === dailyChallenge.date);

      switch (dailyChallenge.type) {
        case 'log_plant_based':
          if (mealLog.totalCarbonFootprint < (dailyChallenge.targetValue || 0.7)) dailyCompleted = true;
          break;
        case 'co2e_under_today':
          break; 
        case 'avoid_red_meat_meal':
          const redMeatKeywords = ['beef', 'lamb', 'steak', 'pork', 'bacon', 'sausage']; 
          const containsRedMeat = mealLog.foodItems.some(item => redMeatKeywords.some(keyword => item.name.toLowerCase().includes(keyword)));
          if (!containsRedMeat) dailyCompleted = true;
          break;
        case 'log_three_meals':
          const mealTypesLoggedToday = new Set(todaysLogsForChallenge.map(log => log.mealType));
          if (mealTypesLoggedToday.size >= 3) dailyCompleted = true;
          break;
        case 'log_low_co2e_meal':
          if (mealLog.totalCarbonFootprint < (dailyChallenge.targetValue || 0.5)) dailyCompleted = true;
          break;
      }
      if (dailyCompleted) {
        const updatedDailyChallenge = { ...dailyChallenge, isCompleted: true };
        setDailyChallenge(updatedDailyChallenge);
        localStorage.setItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(updatedDailyChallenge));
      }
    }

    if (weeklyChallenge && mealLog.date >= weeklyChallenge.startDate && mealLog.date <= weeklyChallenge.endDate && !weeklyChallenge.isCompleted) {
      let newCurrentValue = weeklyChallenge.currentValue;
      let weeklyChallengeDirty = false;
      const logsThisWeekForChallenge = [...currentUserMealLogs, mealLog].filter(log => log.date >= weeklyChallenge.startDate && log.date <= weeklyChallenge.endDate);

      switch (weeklyChallenge.type) {
        case 'weekly_co2e_under':
          newCurrentValue = logsThisWeekForChallenge.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);
          weeklyChallengeDirty = true;
          break;
        case 'plant_based_meals_count':
           newCurrentValue = logsThisWeekForChallenge.filter(log => log.totalCarbonFootprint < 0.7).length;
           weeklyChallengeDirty = true;
          break;
        case 'log_days_count':
          const distinctLogDays = new Set(logsThisWeekForChallenge.map(log => log.date));
          newCurrentValue = distinctLogDays.size;
          weeklyChallengeDirty = true;
          break;
      }

      if(weeklyChallengeDirty) {
        const weeklyCompleted = newCurrentValue >= weeklyChallenge.targetValue;
        const updatedWeeklyChallenge = { ...weeklyChallenge, currentValue: newCurrentValue, isCompleted: weeklyCompleted };
        setWeeklyChallenge(updatedWeeklyChallenge);
        localStorage.setItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(updatedWeeklyChallenge));
      }
    }
  }, [user, dailyChallenge, weeklyChallenge, currentUserMealLogs]);

  const login = useCallback(async (name: string, email: string) => {
    setIsLoading(true);
    const newUser = { name, email };
    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    
    setWeeklyTip(null); 
    setGeneralRecommendation(null);
    setFoodSwaps([]);
    setDetectedMealItemsState(null); 

    const storedChat = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${email}`);
    setChatMessages(storedChat ? JSON.parse(storedChat) : []);
    
    const storedDaily = localStorage.getItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${email}`);
    setDailyChallenge(storedDaily ? JSON.parse(storedDaily) : null);

    const storedWeekly = localStorage.getItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${email}`);
    setWeeklyChallenge(storedWeekly ? JSON.parse(storedWeekly) : null);
    
    const storedStreak = localStorage.getItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${email}`);
    setStreakData(storedStreak ? JSON.parse(storedStreak) : { logStreak: 0, lastLogDate: null });
    
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const prevUserEmail = user?.email;
    setUser(null);
    setMealPhotoState(null);
    setMealResultState(null);
    setWeeklyTip(null);
    setGeneralRecommendation(null);
    setFoodSwaps([]);
    setChatMessages([]);
    setDailyChallenge(null);
    setWeeklyChallenge(null);
    setStreakData({ logStreak: 0, lastLogDate: null });
    setDetectedMealItemsState(null);

    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(DETECTED_ITEMS_STORAGE_KEY);
    if (prevUserEmail) {
        localStorage.removeItem(`${WEEKLY_TIP_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${GENERAL_REC_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${FOOD_SWAPS_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${prevUserEmail}`);
    }
    setIsLoading(false);
  }, [user]);

  const setMealPhoto = useCallback((photoDataUri: string | null) => {
    setMealPhotoState(photoDataUri);
    if(photoDataUri === null) { 
      setDetectedMealItemsState(null);
      localStorage.removeItem(DETECTED_ITEMS_STORAGE_KEY);
    }
  }, []);

  const setDetectedMealItems = useCallback((items: AIIdentifiedFoodItem[] | null) => {
    setDetectedMealItemsState(items);
    if(items) {
      localStorage.setItem(DETECTED_ITEMS_STORAGE_KEY, JSON.stringify(items));
    } else {
      localStorage.removeItem(DETECTED_ITEMS_STORAGE_KEY);
    }
  }, []);

  const setMealResult = useCallback((result: FinalMealResult | null) => {
    setMealResultState(result);
    setDetectedMealItemsState(null); 
    localStorage.removeItem(DETECTED_ITEMS_STORAGE_KEY);
  }, []);

  const addMealLog = useCallback(async (newLogData: NewMealLogData): Promise<FinalMealResult | null> => {
    if (!user) return null;
    const currentDate = new Date();
    const timestamp = currentDate.toISOString();
    const mealType = getMealType(timestamp);

    const logToAdd: MealLog = { // This log includes all data, including per-item CO2e
      userEmail: user.email,
      date: format(currentDate, 'yyyy-MM-dd'),
      timestamp: timestamp,
      // photoDataUri is NOT part of the logForStorage
      foodItems: newLogData.foodItems, // These items can have 'calculatedCO2eKg'
      totalCarbonFootprint: newLogData.totalCarbonFootprint,
      mealType: mealType,
    };
    
    // Update in-memory state first
    setMealLogs(prevLogs => {
      const updatedLogsInMemory = [logToAdd, ...prevLogs]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, MAX_MEAL_LOGS_STORED * 2); // Keep more in memory temporarily if needed, but less in localStorage

      // Prepare logs for persistent storage (without photoDataUri)
      const logsForPersistentStorage: Omit<MealLog, 'photoDataUri'>[] = updatedLogsInMemory
        .map(log => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { photoDataUri, ...rest } = log; // Explicitly remove photoDataUri for storage
          return rest;
        })
        .slice(0, MAX_MEAL_LOGS_STORED); // Trim for localStorage

      try {
        localStorage.setItem(MEAL_LOGS_STORAGE_KEY, JSON.stringify(logsForPersistentStorage));
      } catch (error) {
        console.error("Error saving meal logs to localStorage (quota likely exceeded):", error);
        // Potentially notify user or implement more sophisticated cache eviction
      }
      return updatedLogsInMemory; // Return the potentially larger in-memory list for immediate UI updates
    });

    updateStreakOnMealLog(logToAdd.date);
    updateChallengesOnMealLog(logToAdd);
    
    return {
      foodItems: newLogData.foodItems, // These items include 'calculatedCO2eKg'
      carbonFootprintKgCO2e: newLogData.totalCarbonFootprint,
      // Other fields like suggestion, equivalency, feedback will be added by the caller (ReviewMealPage)
    };
  }, [user, updateStreakOnMealLog, updateChallengesOnMealLog]);


  useEffect(() => {
    if (!user || !dailyChallenge || dailyChallenge.type !== 'co2e_under_today' || dailyChallenge.isCompleted) {
      return;
    }
    const todaysLogs = currentUserMealLogs.filter(log => log.date === dailyChallenge.date);
    const totalCO2eToday = todaysLogs.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);

    if (totalCO2eToday <= (dailyChallenge.targetValue || 2.5) && todaysLogs.length > 0) { 
      const updatedDailyChallenge = { ...dailyChallenge, isCompleted: true };
      setDailyChallenge(updatedDailyChallenge);
      localStorage.setItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(updatedDailyChallenge));
    }
  }, [currentUserMealLogs, dailyChallenge, user]);


   useEffect(() => {
    if (!user || !weeklyChallenge || weeklyChallenge.isCompleted) { 
      return;
    }
    const logsThisWeek = currentUserMealLogs.filter(log => log.date >= weeklyChallenge.startDate && log.date <= weeklyChallenge.endDate);
    let newCurrentValue = weeklyChallenge.currentValue;
    let isNowCompleted = weeklyChallenge.isCompleted;

    switch (weeklyChallenge.type) {
        case 'weekly_co2e_under':
            newCurrentValue = logsThisWeek.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);
            isNowCompleted = newCurrentValue <= weeklyChallenge.targetValue && logsThisWeek.length > 0; 
            break;
        case 'plant_based_meals_count':
            newCurrentValue = logsThisWeek.filter(log => log.totalCarbonFootprint < 0.7).length;
            isNowCompleted = newCurrentValue >= weeklyChallenge.targetValue;
            break;
        case 'log_days_count':
            const distinctLogDays = new Set(logsThisWeek.map(log => log.date));
            newCurrentValue = distinctLogDays.size;
            isNowCompleted = newCurrentValue >= weeklyChallenge.targetValue;
            break;
    }
    
    if (newCurrentValue !== weeklyChallenge.currentValue || isNowCompleted !== weeklyChallenge.isCompleted) {
        const updatedWkChallenge = {
            ...weeklyChallenge,
            currentValue: newCurrentValue,
            isCompleted: isNowCompleted,
        };
        setWeeklyChallenge(updatedWkChallenge);
        localStorage.setItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(updatedWkChallenge));
    }
  }, [currentUserMealLogs, weeklyChallenge, user]);

  const fetchWeeklyTip = useCallback(async (forceRefresh = false) => {
    if (!user) { 
      setWeeklyTip(null); 
      return;
    }
    setIsLoadingWeeklyTip(true);
    const cacheKey = `${WEEKLY_TIP_STORAGE_KEY_PREFIX}${user.email}`;
    
    if (!forceRefresh) {
        const cachedDataString = localStorage.getItem(cacheKey);
        if (cachedDataString) {
            try {
                const cachedData: CachedWeeklyTip = JSON.parse(cachedDataString);
                if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000 && cachedData.tip) {
                    setWeeklyTip(cachedData.tip);
                    setIsLoadingWeeklyTip(false);
                    return;
                }
            } catch (e) { console.error("Error parsing cached weekly tip:", e); localStorage.removeItem(cacheKey); }
        }
    }
    
    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);
    try {
      const input: GenerateTipInput = { mealLogsSummary };
      const result = await generateWeeklyTip(input);
      setWeeklyTip(result.tip);
      localStorage.setItem(cacheKey, JSON.stringify({ tip: result.tip, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching weekly tip:", error);
      setWeeklyTip("Could not fetch a weekly tip at this time. Try again later.");
    } finally {
      setIsLoadingWeeklyTip(false);
    }
  }, [user, currentUserMealLogs, getMealLogsSummaryForAI]);

  const fetchGeneralRecommendation = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    setIsLoadingGeneralRecommendation(true);
    const cacheKey = `${GENERAL_REC_STORAGE_KEY_PREFIX}${user.email}`;
    
    if (!forceRefresh) {
        const cachedDataString = localStorage.getItem(cacheKey);
        if (cachedDataString) {
            try {
                const cachedData: CachedWeeklyTip = JSON.parse(cachedDataString);
                 if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000 && cachedData.tip) {
                    setGeneralRecommendation(cachedData.tip);
                    setIsLoadingGeneralRecommendation(false);
                    return;
                }
            } catch (e) { console.error("Error parsing cached general recommendation:", e); localStorage.removeItem(cacheKey); }
        }
    }
    
    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);
    try {
      const result = await generateGeneralRecommendation({ mealLogsSummary });
      setGeneralRecommendation(result.tip);
      localStorage.setItem(cacheKey, JSON.stringify({ tip: result.tip, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching general recommendation:", error);
      setGeneralRecommendation("Could not fetch a recommendation. Please ensure you have logged some meals.");
    } finally {
      setIsLoadingGeneralRecommendation(false);
    }
  }, [user, currentUserMealLogs, getMealLogsSummaryForAI]);

  const fetchFoodSwaps = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    setIsLoadingFoodSwaps(true);
    const cacheKey = `${FOOD_SWAPS_STORAGE_KEY_PREFIX}${user.email}`;

    if (!forceRefresh) {
        const cachedDataString = localStorage.getItem(cacheKey);
        if (cachedDataString) {
            try {
                const cachedData: { swaps: FoodSwap[], timestamp: number } = JSON.parse(cachedDataString);
                 if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000 && cachedData.swaps.length > 0) {
                    setFoodSwaps(cachedData.swaps.map(s => ({...s, tryThis: (s as any).tryThis || false })));
                    setIsLoadingFoodSwaps(false);
                    return;
                }
            } catch (e) { console.error("Error parsing cached food swaps:", e); localStorage.removeItem(cacheKey); }
        }
    }

    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);
    try {
      const result = await generateFoodSwaps({ mealLogsSummary });
      const swapsWithTryThis = result.swaps.map(swap => ({ ...swap, tryThis: false }));
      setFoodSwaps(swapsWithTryThis);
      localStorage.setItem(cacheKey, JSON.stringify({ swaps: swapsWithTryThis, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching food swaps:", error);
      setFoodSwaps([{ originalItem: "Error", suggestedItem: "Try refreshing", co2eSavingEstimate: "N/A", details: "Could not fetch food swaps. Log more meals for suggestions." }]);
    } finally {
      setIsLoadingFoodSwaps(false);
    }
  }, [user, currentUserMealLogs, getMealLogsSummaryForAI]);

  const updateFoodSwapTryThis = useCallback((swapIndex: number, tryThis: boolean) => {
    setFoodSwaps(prevSwaps => {
      const newSwaps = prevSwaps.map((swap, index) => 
        index === swapIndex ? { ...swap, tryThis } : swap
      );
      if (user) {
        localStorage.setItem(`${FOOD_SWAPS_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify({ swaps: newSwaps, timestamp: Date.now() }));
      }
      return newSwaps;
    });
  }, [user]);
  
  const sendChatMessage = useCallback(async (question: string) => {
    if (!user) return;
    setIsLoadingChatResponse(true);
    const userMessage: ChatMessage = { id: Date.now().toString() + '_user', sender: 'user', text: question, timestamp: Date.now() };
    
    const MAX_HISTORY_LENGTH = 5; 
    const currentHistory = [...chatMessages, userMessage].slice(-MAX_HISTORY_LENGTH * 2); 
    setChatMessages(currentHistory);

    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);

    const aiHistoryForPrompt: ChatHistoryMessage[] = currentHistory
      .filter(m => m.sender === 'user' || m.sender === 'ai') 
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{text: m.text}],
      }));
      
    try {
      const result = await askAIChatbot({ userQuestion: question, mealLogsSummary, chatHistory: aiHistoryForPrompt });
      const aiMessage: ChatMessage = { id: Date.now().toString() + '_ai', sender: 'ai', text: result.answer, timestamp: Date.now() };
      const finalChatMessages = [...currentHistory, aiMessage];
      setChatMessages(finalChatMessages);
      localStorage.setItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(finalChatMessages));
    } catch (error) {
      console.error("Error sending chat message:", error);
      const errorMessage: ChatMessage = { id: Date.now().toString() + '_ai_error', sender: 'ai', text: "Sorry, I couldn't process that. Please try again.", timestamp: Date.now() };
      const finalChatMessages = [...currentHistory, errorMessage];
      setChatMessages(finalChatMessages);
      localStorage.setItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(finalChatMessages));
    } finally {
      setIsLoadingChatResponse(false);
    }
  }, [user, chatMessages, currentUserMealLogs, getMealLogsSummaryForAI]);

  const clearChatMessages = useCallback(() => {
    if(user) {
      setChatMessages([]);
      localStorage.removeItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${user.email}`);
    }
  }, [user]);

  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      mealPhoto,
      setMealPhoto,
      detectedMealItems,
      setDetectedMealItems,
      mealResult,
      setMealResult,
      mealLogs: currentUserMealLogs, 
      addMealLog,
      isLoading,
      weeklyTip,
      isLoadingWeeklyTip,
      fetchWeeklyTip,
      generalRecommendation,
      isLoadingGeneralRecommendation,
      fetchGeneralRecommendation,
      foodSwaps,
      isLoadingFoodSwaps,
      fetchFoodSwaps,
      updateFoodSwapTryThis,
      chatMessages,
      isLoadingChatResponse,
      sendChatMessage,
      clearChatMessages,
      dailyChallenge,
      isLoadingDailyChallenge,
      weeklyChallenge,
      isLoadingWeeklyChallenge,
      streakData,
      refreshDailyChallenge,
      refreshWeeklyChallenge,
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

export type { FoodItem, AIIdentifiedFoodItem };
