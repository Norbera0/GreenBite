
import { config } from 'dotenv';
config();

import '@/ai/flows/estimate-carbon-footprint.ts';
import '@/ai/flows/generate-meal-suggestion.ts'; 
import '@/ai/flows/generate-weekly-tip.ts';
import '@/ai/flows/generate-general-recommendation.ts';
import '@/ai/flows/generate-food-swaps.ts';
import '@/ai/flows/ask-ai-chatbot.ts';
import '@/ai/flows/generate-daily-challenge.ts'; // New daily challenge flow
import '@/ai/flows/generate-weekly-challenge.ts'; // New weekly challenge flow
