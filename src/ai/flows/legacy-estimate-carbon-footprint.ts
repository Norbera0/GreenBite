
// src/ai/flows/legacy-estimate-carbon-footprint.ts
'use server';

/**
 * @fileOverview Estimates the carbon footprint of a meal from a photo (Legacy version).
 * This version identifies food items from a photo and user's general quantity description, then estimates CO2.
 *
 * - estimateCarbonFootprintFromMealPhoto - A function that handles the carbon footprint estimation process.
 * - EstimateCarbonFootprintFromMealPhotoInput - The input type for the estimateCarbonFootprintFromMealPhoto function.
 * - EstimateCarbonFootprintFromMealPhotoOutput - The return type for the estimateCarbonFootprintFromMealPhoto function.
 */

import {ai} from '@/ai/genkit';
import {
  EstimateCarbonFootprintFromMealPhotoInputSchema,
  type EstimateCarbonFootprintFromMealPhotoInput,
  EstimateCarbonFootprintFromMealPhotoOutputSchema,
  type EstimateCarbonFootprintFromMealPhotoOutput,
} from '@/ai/schemas';


const identifyAndEstimatePrompt = ai.definePrompt({
  name: 'legacyIdentifyAndEstimatePrompt', // Renamed to avoid conflict
  input: {schema: EstimateCarbonFootprintFromMealPhotoInputSchema},
  output: {schema: EstimateCarbonFootprintFromMealPhotoOutputSchema },
  prompt: `You are an AI assistant that identifies food items in a meal from a photo and estimates the total carbon footprint (in kg CO2e).

  Analyze the following meal photo and the user's description of quantity/units.
  1. Identify the main food items present.
  2. Use the user's quantity description to help estimate amounts.
  3. Estimate the *total* carbon footprint for the entire meal based on the identified items and estimated quantities. Use average carbon footprint data for common foods.

  Photo: {{media url=photoDataUri}}
  User Quantity and Units Description: {{{quantityAndUnits}}}

  Return the identified food items and the *single total* estimated carbon footprint as a JSON object matching the provided schema. Provide the footprint as 'carbonFootprintKgCO2e'.
  `,
});

export async function estimateCarbonFootprintFromMealPhoto(
  input: EstimateCarbonFootprintFromMealPhotoInput
): Promise<EstimateCarbonFootprintFromMealPhotoOutput> {
  return estimateCarbonFootprintFromMealPhotoFlow(input);
}

const estimateCarbonFootprintFromMealPhotoFlow = ai.defineFlow(
  {
    name: 'legacyEstimateCarbonFootprintFromMealPhotoFlow', // Renamed
    inputSchema: EstimateCarbonFootprintFromMealPhotoInputSchema,
    outputSchema: EstimateCarbonFootprintFromMealPhotoOutputSchema,
  },
  async input => {
     console.log("Calling LEGACY Genkit Flow with input:", input);
     try {
       const result = await identifyAndEstimatePrompt(input);

       if (!result.output) {
          throw new Error('AI did not return the expected output format (legacy flow).');
       }

       console.log("LEGACY Genkit Flow Result:", result.output);
       return result.output;

     } catch (error) {
        console.error("Error in LEGACY Genkit flow:", error);
         throw new Error(`AI processing failed (legacy flow): ${error instanceof Error ? error.message : String(error)}`);
     }
  }
);

export type { EstimateCarbonFootprintFromMealPhotoInput, EstimateCarbonFootprintFromMealPhotoOutput };
