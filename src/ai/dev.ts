import { config } from 'dotenv';
config();

import '@/ai/flows/estimate-carbon-footprint.ts';
import '@/ai/flows/generate-meal-suggestion.ts'; // Add the new flow
