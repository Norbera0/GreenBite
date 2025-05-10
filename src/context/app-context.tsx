
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { EstimateCarbonFootprintFromMealPhotoOutput } from '@/ai/flows/estimate-carbon-footprint';
import type { FoodItem, FoodSwap, ChatHistoryMessage, GenerateTipInput } from '@/ai/schemas'; 
import { generateWeeklyTip } from '@/ai/flows/generate-weekly-tip';
import { generateGeneralRecommendation } from '@/ai/flows/generate-general-recommendation';
import { generateFoodSwaps } from '@/ai/flows/generate-food-swaps';
import { askAIChatbot } from '@/ai/flows/ask-ai-chatbot';
import { format, subDays, parseISO, differenceInCalendarDays, isSameDay, isSameWeek, startOfWeek, endOfWeek, getHours } from 'date-fns';


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
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner'; // Added for challenge processing
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

// Challenge and Streak Types
export type DailyChallengeType = 'log_plant_based' | 'co2e_under_today' | 'avoid_red_meat_meal' | 'log_three_meals' | 'log_low_co2e_meal';
export interface DailyChallenge {
  id: string; 
  description: string;
  type: DailyChallengeType;
  targetValue?: number; 
  isCompleted: boolean;
  date: string; // YYYY-MM-DD for which this challenge is
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
  // Future: challengeStreak, lastChallengeCompletionDate
}

const PREDEFINED_DAILY_CHALLENGES: Omit<DailyChallenge, 'date' | 'isCompleted' | 'id'>[] = [
  { description: "Log a plant-based meal (under 0.7kg CO₂e) today.", type: 'log_plant_based', targetValue: 0.7 },
  { description: "Keep your total CO₂e under 2.5 kg today.", type: 'co2e_under_today', targetValue: 2.5 },
  { description: "Log a meal that doesn't contain red meat today.", type: 'avoid_red_meat_meal' },
  { description: "Log all three main meals (Breakfast, Lunch, Dinner) today.", type: 'log_three_meals' },
  { description: "Log a meal with less than 0.5kg CO₂e.", type: 'log_low_co2e_meal', targetValue: 0.5 },
];

const PREDEFINED_WEEKLY_CHALLENGES: Omit<WeeklyChallenge, 'startDate' | 'endDate' | 'isCompleted' | 'id' | 'currentValue'>[] = [
    { description: "Keep your total weekly CO₂e under 15 kg.", type: 'weekly_co2e_under', targetValue: 15 },
    { description: "Eat 3 plant-based meals (under 0.7kg CO₂e each) this week.", type: 'plant_based_meals_count', targetValue: 3 },
    { description: "Log meals on at least 5 different days this week.", type: 'log_days_count', targetValue: 5 },
];


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
  addMealLog: (log: Omit<MealLog, 'date' | 'timestamp' | 'userEmail' | 'mealType'>) => Promise<void>;
  isLoading: boolean;

  weeklyTip: string | null;
  isLoadingWeeklyTip: boolean;
  fetchWeeklyTip: () => Promise<void>;

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

  // Challenges & Streaks
  dailyChallenge: DailyChallenge | null;
  weeklyChallenge: WeeklyChallenge | null;
  streakData: StreakData | null;
  refreshDailyChallenge: () => void;
  // refreshWeeklyChallenge: () => void; // For manual refresh if needed later
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const USER_STORAGE_KEY = 'ecoPlateUser';
const MEAL_LOGS_STORAGE_KEY = 'ecoPlateMealLogs';
const WEEKLY_TIP_STORAGE_KEY_PREFIX = 'ecoPlateWeeklyTip_';
const GENERAL_REC_STORAGE_KEY_PREFIX = 'ecoPlateGeneralRec_';
const FOOD_SWAPS_STORAGE_KEY_PREFIX = 'ecoPlateFoodSwaps_';
const CHAT_MESSAGES_STORAGE_KEY_PREFIX = 'ecoPlateChatMessages_';
const DAILY_CHALLENGE_STORAGE_KEY_PREFIX = 'ecoPlateDailyChallenge_';
const WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX = 'ecoPlateWeeklyChallenge_';
const STREAK_DATA_STORAGE_KEY_PREFIX = 'ecoPlateStreakData_';


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mealPhoto, setMealPhotoState] = useState<string | null>(null);
  const [mealResult, setMealResultState] = useState<EstimateCarbonFootprintFromMealPhotoOutput | null>(null);
  const [mealSuggestion, setMealSuggestionState] = useState<string | null>(null); 
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

  // Challenges & Streaks State
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>({ logStreak: 0, lastLogDate: null });

  const currentUserMealLogs = useMemo(() => {
    if (!user) return [];
    return mealLogs.filter(log => log.userEmail === user.email);
  }, [user, mealLogs]);


  // Helper to determine meal type based on timestamp
  const getMealType = (timestamp: string): 'Breakfast' | 'Lunch' | 'Dinner' => {
    const hour = getHours(parseISO(timestamp));
    if (hour >= 4 && hour < 10) return 'Breakfast';
    if (hour >= 10 && hour < 18) return 'Lunch';
    return 'Dinner';
  };


  // Load data from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
        
        // Load user-specific data
        const storedChat = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedChat) setChatMessages(JSON.parse(storedChat));

        const storedDailyChallenge = localStorage.getItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedDailyChallenge) setDailyChallenge(JSON.parse(storedDailyChallenge));
        
        const storedWeeklyChallenge = localStorage.getItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedWeeklyChallenge) setWeeklyChallenge(JSON.parse(storedWeeklyChallenge));

        const storedStreak = localStorage.getItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${parsedUser.email}`);
        if (storedStreak) setStreakData(JSON.parse(storedStreak));
        else setStreakData({ logStreak: 0, lastLogDate: null });
      }

      const storedLogs = localStorage.getItem(MEAL_LOGS_STORAGE_KEY);
      if (storedLogs) {
        const logs: MealLog[] = JSON.parse(storedLogs);
        const migratedLogs = logs.map(log => ({
          ...log,
          date: log.date || format(parseISO(log.timestamp), 'yyyy-MM-dd'),
          mealType: log.mealType || getMealType(log.timestamp)
        })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMealLogs(migratedLogs);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // ---- CHALLENGE & STREAK LOGIC ----
  const _selectNewDailyChallenge = useCallback((): Omit<DailyChallenge, 'date' | 'isCompleted' | 'id'> => {
    const availableChallenges = PREDEFINED_DAILY_CHALLENGES.filter(c => c.type !== dailyChallenge?.type); // Avoid immediate repeat
    const pool = availableChallenges.length > 0 ? availableChallenges : PREDEFINED_DAILY_CHALLENGES;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [dailyChallenge]);

  const checkAndRefreshDailyChallenge = useCallback(() => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (!dailyChallenge || dailyChallenge.date !== todayStr) {
      const newChallengeBase = _selectNewDailyChallenge();
      const newDailyChallenge: DailyChallenge = {
        ...newChallengeBase,
        id: `${newChallengeBase.type}_${todayStr}`,
        date: todayStr,
        isCompleted: false,
      };
      setDailyChallenge(newDailyChallenge);
      localStorage.setItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(newDailyChallenge));
    }
  }, [user, dailyChallenge, _selectNewDailyChallenge]);


  const _selectNewWeeklyChallenge = useCallback((): Omit<WeeklyChallenge, 'startDate' | 'endDate' | 'isCompleted' | 'id' | 'currentValue'> => {
     const availableChallenges = PREDEFINED_WEEKLY_CHALLENGES.filter(c => c.type !== weeklyChallenge?.type);
     const pool = availableChallenges.length > 0 ? availableChallenges : PREDEFINED_WEEKLY_CHALLENGES;
     return pool[Math.floor(Math.random() * pool.length)];
  }, [weeklyChallenge]);

  const checkAndRefreshWeeklyChallenge = useCallback(() => {
    if (!user) return;
    const today = new Date();
    const currentWeekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    if (!weeklyChallenge || weeklyChallenge.startDate !== currentWeekStart) {
      const newChallengeBase = _selectNewWeeklyChallenge();
      const newWeeklyChallenge: WeeklyChallenge = {
        ...newChallengeBase,
        id: `${newChallengeBase.type}_${currentWeekStart}`,
        startDate: currentWeekStart,
        endDate: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        currentValue: 0,
        isCompleted: false,
      };
      setWeeklyChallenge(newWeeklyChallenge);
      localStorage.setItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(newWeeklyChallenge));
    }
  }, [user, weeklyChallenge, _selectNewWeeklyChallenge]);

  useEffect(() => {
    if (user && !isLoading) { // Ensure user is loaded before checking challenges
      checkAndRefreshDailyChallenge();
      checkAndRefreshWeeklyChallenge();
    }
  }, [user, isLoading, checkAndRefreshDailyChallenge, checkAndRefreshWeeklyChallenge]);
  
  const refreshDailyChallenge = useCallback(() => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const newChallengeBase = _selectNewDailyChallenge();
    const refreshedDailyChallenge: DailyChallenge = {
      ...newChallengeBase,
      id: `${newChallengeBase.type}_${todayStr}_refresh_${Date.now()}`,
      date: todayStr,
      isCompleted: false,
    };
    setDailyChallenge(refreshedDailyChallenge);
    localStorage.setItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(refreshedDailyChallenge));
  }, [user, _selectNewDailyChallenge]);

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
          newStreakCount = 1; // Reset if missed a day or more
        } else if (diffDays === 0) {
          // Multiple logs on the same day, streak already counted or initiated
          // newStreakCount remains same or 1 if it's the first log of a new streak
          newStreakCount = newStreakCount === 0 ? 1 : newStreakCount;
        }
      } else {
        newStreakCount = 1; // First log ever
      }
      
      const newStreak: StreakData = { ...prevStreak, logStreak: newStreakCount, lastLogDate: logDateStr };
      localStorage.setItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(newStreak));
      return newStreak;
    });
  }, [user]);

  const updateChallengesOnMealLog = useCallback((mealLog: MealLog) => {
    if (!user) return;

    // Update Daily Challenge
    if (dailyChallenge && dailyChallenge.date === mealLog.date && !dailyChallenge.isCompleted) {
      let dailyCompleted = false;
      const todaysLogs = currentUserMealLogs.filter(log => log.date === dailyChallenge.date); // Includes the current mealLog via context update cycle

      switch (dailyChallenge.type) {
        case 'log_plant_based':
          if (mealLog.totalCarbonFootprint < (dailyChallenge.targetValue || 0.7)) dailyCompleted = true;
          break;
        case 'co2e_under_today':
          const totalCO2eToday = todaysLogs.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);
          // This challenge can only be confirmed at end of day, or if limit EXCEEDED.
          // For simplicity, we'll mark as complete if it's the end of the day and still under.
          // Or, if a log makes it go OVER, then it's failed (not tracked as 'failed' state yet)
          // This simple check here will mark it true if ANY log keeps it under for now.
          // A more robust check would be EOD or a separate "check day completion" function.
          // For now, let's assume it is completed if the current sum is under. This isn't strictly correct.
          // Let's change logic: this type is evaluated at end of day or if user manually checks.
          // For now, we won't auto-complete it here.
          break;
        case 'avoid_red_meat_meal':
          const redMeatKeywords = ['beef', 'lamb', 'steak', 'pork', 'bacon', 'sausage']; // expand as needed
          const containsRedMeat = mealLog.foodItems.some(item => redMeatKeywords.some(keyword => item.name.toLowerCase().includes(keyword)));
          if (!containsRedMeat) dailyCompleted = true;
          break;
        case 'log_three_meals':
          const mealTypesLoggedToday = new Set(todaysLogs.map(log => log.mealType));
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

    // Update Weekly Challenge
    if (weeklyChallenge && mealLog.date >= weeklyChallenge.startDate && mealLog.date <= weeklyChallenge.endDate && !weeklyChallenge.isCompleted) {
      let newCurrentValue = weeklyChallenge.currentValue;
      let weeklyChallengeDirty = false;

      const logsThisWeek = currentUserMealLogs.filter(log => log.date >= weeklyChallenge.startDate && log.date <= weeklyChallenge.endDate);

      switch (weeklyChallenge.type) {
        case 'weekly_co2e_under':
          // This value should be the sum of all logs in the week up to now.
          newCurrentValue = logsThisWeek.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);
          weeklyChallengeDirty = true;
          break;
        case 'plant_based_meals_count':
           // Re-count all plant-based meals this week
           newCurrentValue = logsThisWeek.filter(log => log.totalCarbonFootprint < 0.7).length;
           weeklyChallengeDirty = true;
          break;
        case 'log_days_count':
          const distinctLogDays = new Set(logsThisWeek.map(log => log.date));
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


  // ---- END CHALLENGE & STREAK LOGIC ----


  const login = useCallback(async (name: string, email: string) => {
    setIsLoading(true);
    const newUser = { name, email };
    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    
    setWeeklyTip(null); 
    setGeneralRecommendation(null);
    setFoodSwaps([]);

    const storedChat = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${email}`);
    setChatMessages(storedChat ? JSON.parse(storedChat) : []);
    
    const storedDaily = localStorage.getItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${email}`);
    setDailyChallenge(storedDaily ? JSON.parse(storedDaily) : null);

    const storedWeekly = localStorage.getItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${email}`);
    setWeeklyChallenge(storedWeekly ? JSON.parse(storedWeekly) : null);
    
    const storedStreak = localStorage.getItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${email}`);
    setStreakData(storedStreak ? JSON.parse(storedStreak) : { logStreak: 0, lastLogDate: null });
    
    // Trigger challenge refresh for new user after state is set
    // Note: checkAndRefresh functions are called in useEffect based on user change
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const prevUserEmail = user?.email;
    setUser(null);
    setMealPhotoState(null);
    setMealResultState(null);
    setMealSuggestionState(null); 
    setWeeklyTip(null);
    setGeneralRecommendation(null);
    setFoodSwaps([]);
    setChatMessages([]);
    setDailyChallenge(null);
    setWeeklyChallenge(null);
    setStreakData({ logStreak: 0, lastLogDate: null });

    localStorage.removeItem(USER_STORAGE_KEY);
    if (prevUserEmail) {
        localStorage.removeItem(`${WEEKLY_TIP_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${GENERAL_REC_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${FOOD_SWAPS_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${DAILY_CHALLENGE_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${prevUserEmail}`);
        localStorage.removeItem(`${STREAK_DATA_STORAGE_KEY_PREFIX}${prevUserEmail}`);
    }
    // mealLogs are global not per user for this demo, so not clearing them on logout
    setIsLoading(false);
  }, [user]);

  const setMealPhoto = useCallback((photoDataUri: string | null) => {
    setMealPhotoState(photoDataUri);
  }, []);

  const setMealResult = useCallback((result: EstimateCarbonFootprintFromMealPhotoOutput | null, suggestion: string | null = null) => {
    setMealResultState(result);
    setMealSuggestionState(suggestion); 
  }, []);

  const addMealLog = useCallback(async (newLogData: Omit<MealLog, 'date' | 'timestamp' | 'userEmail' | 'mealType'>) => {
    if (!user) return;
    const currentDate = new Date();
    const timestamp = currentDate.toISOString();
    const mealType = getMealType(timestamp);

    const logToAdd: MealLog = {
      ...newLogData,
      userEmail: user.email,
      date: format(currentDate, 'yyyy-MM-dd'), 
      timestamp: timestamp,
      mealType: mealType,
    };

    setMealLogs(prevLogs => {
      const allLogs = [logToAdd, ...prevLogs]; // Add to global logs
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); 
      localStorage.setItem(MEAL_LOGS_STORAGE_KEY, JSON.stringify(allLogs));
      
      // After logs are updated in state (which happens after this setMealLogs finishes and re-renders)
      // then currentUserMealLogs will be up-to-date for challenge processing.
      // So, call challenge/streak updates with the new log directly.
      updateStreakOnMealLog(logToAdd.date);
      // Defer challenge update to useEffect that watches currentUserMealLogs or call it with potentially stale currentUserMealLogs for immediate check
      // For simplicity and more directness:
      // updateChallengesOnMealLog(logToAdd); // This might use slightly stale currentUserMealLogs if not careful
      // A better way is to let a useEffect watching mealLogs (or currentUserMealLogs) trigger updates.
      return allLogs; 
    });
    // Call challenge update here, it will use the `mealLog` passed and `currentUserMealLogs` which will update in next render cycle
    // This means challenge logic might operate on `currentUserMealLogs` *before* `logToAdd` is in it.
    // This is a common React state update pattern. If precise up-to-the-millisecond data is needed for challenges from `currentUserMealLogs`,
    // it's better to pass `[...currentUserMealLogs, logToAdd]` to the challenge functions or recalculate inside them.
    // For now, let's make `updateChallengesOnMealLog` robust to this by using its `mealLog` param actively.
     updateChallengesOnMealLog(logToAdd);


  }, [user, updateStreakOnMealLog, updateChallengesOnMealLog]);

  // Effect to re-evaluate daily challenge CO2e_under_today if necessary
  useEffect(() => {
    if (!user || !dailyChallenge || dailyChallenge.type !== 'co2e_under_today' || dailyChallenge.isCompleted) {
      return;
    }
    const todaysLogs = currentUserMealLogs.filter(log => log.date === dailyChallenge.date);
    const totalCO2eToday = todaysLogs.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);

    if (totalCO2eToday <= (dailyChallenge.targetValue || 2.5)) {
      // This condition is met if sum is under. Completion typically at EOD.
      // We could add a button "Check challenge status" or do an EOD check.
      // For now, if user has logged meals and is under, it's "on track".
      // No auto-completion here to avoid premature completion.
    } else {
      // User went over the limit. Challenge for the day is technically failed.
      // We don't have a "failed" state, just "not completed".
    }
  }, [currentUserMealLogs, dailyChallenge, user]);

  // Effect to re-evaluate weekly challenge weekly_co2e_under
   useEffect(() => {
    if (!user || !weeklyChallenge || weeklyChallenge.type !== 'weekly_co2e_under' || weeklyChallenge.isCompleted) {
      return;
    }
    const logsThisWeek = currentUserMealLogs.filter(log => log.date >= weeklyChallenge.startDate && log.date <= weeklyChallenge.endDate);
    const totalCO2eThisWeek = logsThisWeek.reduce((sum, log) => sum + log.totalCarbonFootprint, 0);
    
    if (totalCO2eThisWeek !== weeklyChallenge.currentValue) {
        const isNowCompleted = totalCO2eThisWeek >= weeklyChallenge.targetValue && weeklyChallenge.type === 'weekly_co2e_under' ? false : totalCO2eThisWeek >= weeklyChallenge.targetValue;

        const updatedWkChallenge = {
            ...weeklyChallenge,
            currentValue: totalCO2eThisWeek,
            isCompleted: weeklyChallenge.type === 'weekly_co2e_under' ? totalCO2eThisWeek <= weeklyChallenge.targetValue : isNowCompleted, // Special for 'under' type
        };
         if (weeklyChallenge.type === 'weekly_co2e_under' && totalCO2eThisWeek > weeklyChallenge.targetValue) {
            // If it's an "under" challenge and they've gone over, it's no longer considered completed for the "on track" sense
            updatedWkChallenge.isCompleted = false; 
        } else if (weeklyChallenge.type !== 'weekly_co2e_under' && totalCO2eThisWeek >= weeklyChallenge.targetValue) {
            updatedWkChallenge.isCompleted = true;
        }


        setWeeklyChallenge(updatedWkChallenge);
        localStorage.setItem(`${WEEKLY_CHALLENGE_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify(updatedWkChallenge));
    }
  }, [currentUserMealLogs, weeklyChallenge, user]);


  const getMealLogsSummaryForAI = useCallback((logsToSummarize: MealLog[]): string => {
    if (logsToSummarize.length === 0) return "No meals logged in the relevant period.";

    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    
    const recentLogs = logsToSummarize.filter(log => {
        try {
            const logDateObj = parseISO(log.date); // log.date is already YYYY-MM-DD
            return logDateObj >= sevenDaysAgo && logDateObj <= today;
        } catch (e) {
            console.warn("Skipping log with invalid date for summary:", log);
            return false;
        }
    });

    if (recentLogs.length === 0) return "No meals logged in the last 7 days.";

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
            `${log.foodItems.map(item => `${item.name} (${item.quantity || 'N/A'})`).join(', ') || 'Logged Meal'} (Total: ${log.totalCarbonFootprint.toFixed(2)} kg CO₂e, Meal: ${log.mealType || 'Unknown'})`
        ).join('; ');
        return `Day ${index + 1} (${dayOfWeek}): ${mealsString}`;
      }).join('\n') || "No meal activity to summarize.";
  }, []);


  const fetchWeeklyTip = useCallback(async () => {
    if (!user || currentUserMealLogs.length === 0) {
      setWeeklyTip(currentUserMealLogs.length === 0 && user ? "Log some meals to get your first weekly tip!" : null);
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
         // Tip refreshes if it's a new day
        if (differenceInCalendarDays(today, cacheDate) === 0 && cachedData.tip) {
          setWeeklyTip(cachedData.tip);
          setIsLoadingWeeklyTip(false);
          return;
        }
      } catch (e) { console.error("Error parsing cached weekly tip:", e); localStorage.removeItem(cacheKey); }
    }
    
    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);
    if (mealLogsSummary === "No meals logged in the last 7 days.") {
        setWeeklyTip("Log more meals this week to get personalized tips!");
        setIsLoadingWeeklyTip(false);
        return;
    }

    try {
      const input: GenerateTipInput = { mealLogsSummary };
      const result = await generateWeeklyTip(input);
      setWeeklyTip(result.tip);
      localStorage.setItem(cacheKey, JSON.stringify({ tip: result.tip, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching weekly tip:", error);
      setWeeklyTip("Could not fetch a weekly tip at this time.");
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
                if (differenceInCalendarDays(new Date(), new Date(cachedData.timestamp)) === 0 && cachedData.tip) {
                    setGeneralRecommendation(cachedData.tip);
                    setIsLoadingGeneralRecommendation(false);
                    return;
                }
            } catch (e) { console.error("Error parsing cached general recommendation:", e); localStorage.removeItem(cacheKey); }
        }
    }
    
    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);
     if (mealLogsSummary.startsWith("No meals logged")) {
        setGeneralRecommendation("Log some meals to receive personalized recommendations!");
        setIsLoadingGeneralRecommendation(false);
        return;
    }
    try {
      const result = await generateGeneralRecommendation({ mealLogsSummary });
      setGeneralRecommendation(result.tip);
      localStorage.setItem(cacheKey, JSON.stringify({ tip: result.tip, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching general recommendation:", error);
      setGeneralRecommendation("Could not fetch a recommendation at this time.");
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
                if (differenceInCalendarDays(new Date(), new Date(cachedData.timestamp)) === 0 && cachedData.swaps.length > 0) {
                    setFoodSwaps(cachedData.swaps.map(s => ({...s, tryThis: (s as any).tryThis || false })));
                    setIsLoadingFoodSwaps(false);
                    return;
                }
            } catch (e) { console.error("Error parsing cached food swaps:", e); localStorage.removeItem(cacheKey); }
        }
    }

    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);
    if (mealLogsSummary.startsWith("No meals logged")) {
        setFoodSwaps([{ originalItem: "Log Meals", suggestedItem: "Get Swaps", co2eSavingEstimate: "Personalized for you!", details: "Start logging to see suggestions." }]);
        setIsLoadingFoodSwaps(false);
        return;
    }
    try {
      const result = await generateFoodSwaps({ mealLogsSummary });
      const swapsWithTryThis = result.swaps.map(swap => ({ ...swap, tryThis: false }));
      setFoodSwaps(swapsWithTryThis);
      localStorage.setItem(cacheKey, JSON.stringify({ swaps: swapsWithTryThis, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching food swaps:", error);
      setFoodSwaps([{ originalItem: "Error", suggestedItem: "Try refreshing", co2eSavingEstimate: "N/A", details: "Could not fetch food swaps." }]);
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
      mealResult,
      mealSuggestion, 
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
      weeklyChallenge,
      streakData,
      refreshDailyChallenge,
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

