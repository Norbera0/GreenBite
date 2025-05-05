
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { EstimateCarbonFootprintFromMealPhotoOutput } from '@/ai/flows/estimate-carbon-footprint';
import type { FoodItem } from '@/ai/schemas'; // Import FoodItem type from the new schemas file

// Define interfaces directly or import if they exist elsewhere
interface User {
  name: string;
  email: string;
}

export interface MealLog {
  userEmail: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string for precise time
  photoDataUri: string;
  foodItems: FoodItem[];
  totalCarbonFootprint: number;
}

interface AppContextProps {
  user: User | null;
  login: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  mealPhoto: string | null;
  setMealPhoto: (photoDataUri: string | null) => void;
  mealResult: EstimateCarbonFootprintFromMealPhotoOutput | null;
  mealSuggestion: string | null; // Added for AI suggestion
  setMealResult: (result: EstimateCarbonFootprintFromMealPhotoOutput | null, suggestion?: string | null) => void; // Modified signature
  mealLogs: MealLog[];
  addMealLog: (log: MealLog) => Promise<void>;
  isLoading: boolean;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

// Simple localStorage keys
const USER_STORAGE_KEY = 'ecoPlateUser';
const MEAL_LOGS_STORAGE_KEY = 'ecoPlateMealLogs';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [mealPhoto, setMealPhotoState] = useState<string | null>(null);
  const [mealResult, setMealResultState] = useState<EstimateCarbonFootprintFromMealPhotoOutput | null>(null);
  const [mealSuggestion, setMealSuggestionState] = useState<string | null>(null); // State for suggestion
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading

  // Load initial state from localStorage
  useEffect(() => {
    setIsLoading(true);
    try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
        setUser(JSON.parse(storedUser));
        }

        const storedLogs = localStorage.getItem(MEAL_LOGS_STORAGE_KEY);
        if (storedLogs) {
        const logs = JSON.parse(storedLogs);
         // Ensure logs are sorted newest first (optional, but good for display)
         logs.sort((a: MealLog, b: MealLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setMealLogs(logs);
        }
    } catch (error) {
      console.error("Failed to load data from localStorage:", error);
      // Optionally clear corrupted storage
      // localStorage.removeItem(USER_STORAGE_KEY);
      // localStorage.removeItem(MEAL_LOGS_STORAGE_KEY);
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (name: string, email: string) => {
    setIsLoading(true);
    const newUser = { name, email };
    setUser(newUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    // Potentially load user-specific logs here if needed, though current setup uses global logs
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setUser(null);
    setMealPhotoState(null);
    setMealResultState(null);
    setMealSuggestionState(null); // Clear suggestion on logout
    // Decide whether to clear logs on logout or keep them global
    // setMealLogs([]);
    // localStorage.removeItem(MEAL_LOGS_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setIsLoading(false);
  }, []);

  const setMealPhoto = useCallback((photoDataUri: string | null) => {
    setMealPhotoState(photoDataUri);
    // Optionally store in session storage if needed across refreshes before result
  }, []);

  // Modified setMealResult to accept optional suggestion
  const setMealResult = useCallback((result: EstimateCarbonFootprintFromMealPhotoOutput | null, suggestion: string | null = null) => {
    setMealResultState(result);
    setMealSuggestionState(suggestion); // Set the suggestion
  }, []);


  const addMealLog = useCallback(async (log: MealLog) => {
    setMealLogs(prevLogs => {
      // Filter logs to only include those for the current user, then add the new one
       const currentUserLogs = prevLogs.filter(l => l.userEmail === log.userEmail);
       const updatedLogs = [log, ...currentUserLogs]; // Add new log to the start (newest first)

       // Persist only the current user's logs to localStorage under their email key or similar
       // For simplicity in this hackathon, we'll store all logs together but filter on load/display
      const allLogs = [log, ...prevLogs];
       allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Ensure sorted
       localStorage.setItem(MEAL_LOGS_STORAGE_KEY, JSON.stringify(allLogs));
      return allLogs; // Update state with all logs
    });
  }, []);


   // Filter logs for the current user when providing context value
   const currentUserMealLogs = useMemo(() => {
     if (!user) return [];
     return mealLogs.filter(log => log.userEmail === user.email);
   }, [user, mealLogs]);


  return (
    <AppContext.Provider value={{
      user,
      login,
      logout,
      mealPhoto,
      setMealPhoto,
      mealResult,
      mealSuggestion, // Provide suggestion
      setMealResult,
      mealLogs: currentUserMealLogs, // Provide filtered logs
      addMealLog,
      isLoading
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
