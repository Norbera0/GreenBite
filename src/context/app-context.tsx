"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { EstimateCarbonFootprintFromMealPhotoOutput } from '@/ai/flows/estimate-carbon-footprint';
import type { FoodItem, FoodSwap, ChatHistoryMessage, GenerateTipInput } from '@/ai/schemas'; 
import { generateWeeklyTip } from '@/ai/flows/generate-weekly-tip';
import { generateGeneralRecommendation } from '@/ai/flows/generate-general-recommendation';
import { generateFoodSwaps } from '@/ai/flows/generate-food-swaps';
import { askAIChatbot } from '@/ai/flows/ask-ai-chatbot';
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns';


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
  timestamp: number; 
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
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
  addMealLog: (log: Omit<MealLog, 'date' | 'timestamp' | 'userEmail'>) => Promise<void>;
  isLoading: boolean;

  // Weekly Tip (Reports Page)
  weeklyTip: string | null;
  isLoadingWeeklyTip: boolean;
  fetchWeeklyTip: () => Promise<void>;

  // General Recommendation (Recommendations Page - Block 1)
  generalRecommendation: string | null;
  isLoadingGeneralRecommendation: boolean;
  fetchGeneralRecommendation: (forceRefresh?: boolean) => Promise<void>;
  
  // Food Swaps (Recommendations Page - Block 2)
  foodSwaps: FoodSwap[];
  isLoadingFoodSwaps: boolean;
  fetchFoodSwaps: (forceRefresh?: boolean) => Promise<void>;
  updateFoodSwapTryThis: (swapIndex: number, tryThis: boolean) => void;

  // AI Chatbot (Recommendations Page - Block 3)
  chatMessages: ChatMessage[];
  isLoadingChatResponse: boolean;
  sendChatMessage: (question: string) => Promise<void>;
  clearChatMessages: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const USER_STORAGE_KEY = 'ecoPlateUser';
const MEAL_LOGS_STORAGE_KEY = 'ecoPlateMealLogs';
const WEEKLY_TIP_STORAGE_KEY_PREFIX = 'ecoPlateWeeklyTip_';
const GENERAL_REC_STORAGE_KEY_PREFIX = 'ecoPlateGeneralRec_';
const FOOD_SWAPS_STORAGE_KEY_PREFIX = 'ecoPlateFoodSwaps_';
const CHAT_MESSAGES_STORAGE_KEY_PREFIX = 'ecoPlateChatMessages_';


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


  const currentUserMealLogs = useMemo(() => {
    if (!user) return [];
    return mealLogs.filter(log => log.userEmail === user.email);
  }, [user, mealLogs]);

  const getMealLogsSummaryForAI = useCallback((logsToSummarize: MealLog[]): string => {
    if (logsToSummarize.length === 0) return "No meals logged in the relevant period.";

    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    
    const recentLogs = logsToSummarize.filter(log => {
        try {
            const logDateObj = parseISO(log.date);
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
      .map(([date, logs], index) => {
        const dayOfWeek = format(parseISO(date), 'EEEE (MMM d)');
        const mealsString = logs.map(log =>
            `${log.foodItems.map(item => `${item.name} (${item.quantity || 'N/A'})`).join(', ') || 'Logged Meal'} (Total: ${log.totalCarbonFootprint.toFixed(2)} kg CO₂e)`
        ).join('; ');
        return `Day ${index + 1} (${dayOfWeek}): ${mealsString}`;
      }).join('\n') || "No meal activity to summarize.";
  }, []);


  useEffect(() => {
    setIsLoading(true);
    try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          // Load chat messages for this user
          const storedChatMessages = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${parsedUser.email}`);
          if (storedChatMessages) {
            setChatMessages(JSON.parse(storedChatMessages));
          }
        }

        const storedLogs = localStorage.getItem(MEAL_LOGS_STORAGE_KEY);
        if (storedLogs) {
          const logs: MealLog[] = JSON.parse(storedLogs);
          const migratedLogs = logs.map(log => ({
            ...log,
            date: log.date || format(parseISO(log.timestamp), 'yyyy-MM-dd') 
          })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
    // Clear data related to previous user or load for new user
    setWeeklyTip(null); 
    setGeneralRecommendation(null);
    setFoodSwaps([]);
    const storedChatMessages = localStorage.getItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${email}`);
    setChatMessages(storedChatMessages ? JSON.parse(storedChatMessages) : []);
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setUser(null);
    setMealPhotoState(null);
    setMealResultState(null);
    setMealSuggestionState(null); 
    setWeeklyTip(null);
    setGeneralRecommendation(null);
    setFoodSwaps([]);
    setChatMessages([]);
    localStorage.removeItem(USER_STORAGE_KEY);
    // Optionally clear all user-specific data from localStorage by iterating keys or specific keys
    setIsLoading(false);
  }, []);

  const setMealPhoto = useCallback((photoDataUri: string | null) => {
    setMealPhotoState(photoDataUri);
  }, []);

  const setMealResult = useCallback((result: EstimateCarbonFootprintFromMealPhotoOutput | null, suggestion: string | null = null) => {
    setMealResultState(result);
    setMealSuggestionState(suggestion); 
  }, []);

  const addMealLog = useCallback(async (newLogData: Omit<MealLog, 'date' | 'timestamp' | 'userEmail'>) => {
    if (!user) return;
    const currentDate = new Date();
    const logToAdd: MealLog = {
      ...newLogData,
      userEmail: user.email,
      date: format(currentDate, 'yyyy-MM-dd'), 
      timestamp: currentDate.toISOString(),
    };

    setMealLogs(prevLogs => {
      const allLogs = [logToAdd, ...prevLogs];
      allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); 
      localStorage.setItem(MEAL_LOGS_STORAGE_KEY, JSON.stringify(allLogs));
      return allLogs; 
    });
  }, [user]);


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

  // --- New Recommendation Features ---
  const fetchGeneralRecommendation = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    setIsLoadingGeneralRecommendation(true);
    const cacheKey = `${GENERAL_REC_STORAGE_KEY_PREFIX}${user.email}`;
    
    if (!forceRefresh) {
        const cachedDataString = localStorage.getItem(cacheKey);
        if (cachedDataString) {
            try {
                const cachedData: CachedWeeklyTip = JSON.parse(cachedDataString); // Reusing CachedWeeklyTip structure
                // Refresh daily or if forced
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
                    setFoodSwaps(cachedData.swaps);
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
      setFoodSwaps(result.swaps.map(swap => ({ ...swap, tryThis: false }))); // Add tryThis state
      localStorage.setItem(cacheKey, JSON.stringify({ swaps: result.swaps, timestamp: Date.now() }));
    } catch (error) {
      console.error("Error fetching food swaps:", error);
      setFoodSwaps([{ originalItem: "Error", suggestedItem: "Try refreshing", co2eSavingEstimate: "N/A", details: "Could not fetch food swaps." }]);
    } finally {
      setIsLoadingFoodSwaps(false);
    }
  }, [user, currentUserMealLogs, getMealLogsSummaryForAI]);

  const updateFoodSwapTryThis = useCallback((swapIndex: number, tryThis: boolean) => {
    setFoodSwaps(prevSwaps => {
      const newSwaps = [...prevSwaps];
      if (newSwaps[swapIndex]) {
        newSwaps[swapIndex] = { ...newSwaps[swapIndex], tryThis }; // Assuming FoodSwap type in AppContext has tryThis
      }
      // Optionally, save this preference to localStorage if needed for persistence beyond session
      return newSwaps;
    });
  }, []);
  
  const sendChatMessage = useCallback(async (question: string) => {
    if (!user) return;
    setIsLoadingChatResponse(true);
    const userMessage: ChatMessage = { id: Date.now().toString() + '_user', sender: 'user', text: question, timestamp: Date.now() };
    
    // Keep limited history for context
    const MAX_HISTORY_LENGTH = 5; // User messages + AI responses
    const currentHistory = [...chatMessages, userMessage].slice(-MAX_HISTORY_LENGTH * 2); // Keep last few exchanges
    setChatMessages(currentHistory);

    const mealLogsSummary = getMealLogsSummaryForAI(currentUserMealLogs);

    const aiHistoryForPrompt: ChatHistoryMessage[] = currentHistory
      .filter(m => m.sender === 'user' || m.sender === 'ai') // ensure correct senders for history
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [{text: m.text}],
      }));
      
    try {
      const result = await askAIChatbot({ userQuestion: question, mealLogsSummary, chatHistory: aiHistoryForPrompt });
      const aiMessage: ChatMessage = { id: Date.now().toString() + '_ai', sender: 'ai', text: result.answer, timestamp: Date.now() };
      setChatMessages(prev => [...prev, aiMessage]);
      localStorage.setItem(`${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${user.email}`, JSON.stringify([...currentHistory, aiMessage]));
    } catch (error) {
      console.error("Error sending chat message:", error);
      const errorMessage: ChatMessage = { id: Date.now().toString() + '_ai_error', sender: 'ai', text: "Sorry, I couldn't process that. Please try again.", timestamp: Date.now() };
      setChatMessages(prev => [...prev, errorMessage]);
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
