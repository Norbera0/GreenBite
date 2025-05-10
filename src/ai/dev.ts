import { config } from 'dotenv';
config();

import '@/ai/flows/estimate-carbon-footprint.ts';
import '@/ai/flows/generate-meal-suggestion.ts'; 
import '@/ai/flows/generate-weekly-tip.ts';
import '@/ai/flows/generate-general-recommendation.ts'; // New general tip flow
import '@/ai/flows/generate-food-swaps.ts'; // New food swaps flow
import '@/ai/flows/ask-ai-chatbot.ts'; // New chatbot flow
