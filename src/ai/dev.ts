
import { config } from 'dotenv';
config();

import '@/ai/flows/estimate-carbon-footprint.ts';
import '@/ai/flows/identify-food-items-and-quantities-from-photo.ts'; // New flow
import '@/ai/flows/generate-meal-suggestion.ts'; 
import '@/ai/flows/generate-weekly-tip.ts';
import '@/ai/flows/generate-general-recommendation.ts';
import '@/ai/flows/generate-food-swaps.ts';
import '@/ai/flows/ask-ai-chatbot.ts';
import '@/ai/flows/generate-daily-challenge.ts'; 
import '@/ai/flows/generate-weekly-challenge.ts';
import '@/ai/flows/legacy-estimate-carbon-footprint.ts'; // If keeping legacy flow
import '@/ai/flows/generate-carbon-equivalency.ts'; 
import '@/ai/flows/generate-meal-feedback.ts'; 
import '@/ai/flows/normalize-quantity-to-kg.ts'; // Added new flow for quantity normalization
