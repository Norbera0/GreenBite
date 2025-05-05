// src/ai/flows/estimate-carbon-footprint.ts
'use server';

/**
 * @fileOverview Estimates the carbon footprint of a meal from a photo.
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
} from '@/ai/schemas'; // Import from the new schemas file

// Use the placeholder service function to simulate the backend call structure if needed,
// but the core logic is within the flow itself.
// import { estimateCarbonFootprint } from '@/services/food-carbon-footprint';

// Schemas and Types are now imported from src/ai/schemas.ts

// This prompt now asks for *both* identification and *total* footprint estimation.
// This simplifies the flow by doing it in one LLM call.
const identifyAndEstimatePrompt = ai.definePrompt({
  name: 'identifyAndEstimatePrompt',
  input: {schema: EstimateCarbonFootprintFromMealPhotoInputSchema},
  output: {schema: EstimateCarbonFootprintFromMealPhotoOutputSchema }, // Output includes total footprint
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

// This function is the main export intended for use by client components.
export async function estimateCarbonFootprintFromMealPhoto(
  input: EstimateCarbonFootprintFromMealPhotoInput
): Promise<EstimateCarbonFootprintFromMealPhotoOutput> {
   // Directly call the flow defined below
  return estimateCarbonFootprintFromMealPhotoFlow(input);
}

// The Genkit flow definition itself is not exported directly.
const estimateCarbonFootprintFromMealPhotoFlow = ai.defineFlow(
  {
    name: 'estimateCarbonFootprintFromMealPhotoFlow',
    inputSchema: EstimateCarbonFootprintFromMealPhotoInputSchema,
    outputSchema: EstimateCarbonFootprintFromMealPhotoOutputSchema,
  },
  async input => {
     console.log("Calling Genkit Flow with input:", input);
     try {
       const result = await identifyAndEstimatePrompt(input); // Call the combined prompt

       if (!result.output) {
          throw new Error('AI did not return the expected output format.');
       }

       console.log("Genkit Flow Result:", result.output);
        // The prompt now directly returns the required output structure
       return result.output;

     } catch (error) {
        console.error("Error in Genkit flow:", error);
        // Re-throw or handle error appropriately
         throw new Error(`AI processing failed: ${error instanceof Error ? error.message : String(error)}`);
     }

    // // ---- Old logic (calling separate service) is removed as the prompt now handles estimation ---
    // const foodItemsResponse = await identifyFoodItemsPrompt(input);
    // const foodItems = foodItemsResponse.output!;

    // // Call the placeholder service function (or potentially a real backend if logic was split)
    // const carbonFootprintResult = await estimateCarbonFootprint(foodItems);

    // return {
    //   foodItems: foodItems,
    //   carbonFootprintKgCO2e: carbonFootprintResult.totalCarbonFootprintKgCO2e, // Use total from result
    // };
    // ---- End of old logic ---
  }
);

// Make EstimateCarbonFootprintFromMealPhotoInput and EstimateCarbonFootprintFromMealPhotoOutput types available for import
// They are already exported from src/ai/schemas.ts, so no need to re-export here.
export type { EstimateCarbonFootprintFromMealPhotoInput, EstimateCarbonFootprintFromMealPhotoOutput };
