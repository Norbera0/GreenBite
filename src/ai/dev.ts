import { config } from 'dotenv';
config();

import '@/ai/flows/estimate-carbon-footprint.ts';
import '@/ai/flows/generate-meal-suggestion.ts'; 
import '@/ai/flows/generate-weekly-tip.ts'; // Add the new weekly tip flow

