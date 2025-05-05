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
import {z} from 'genkit';
// Use the placeholder service function to simulate the backend call structure if needed,
// but the core logic is within the flow itself.
// import { estimateCarbonFootprint } from '@/services/food-carbon-footprint';

// Ensure FoodItem schema matches the one used in AppContext/services
export const FoodItemSchema = z.object({
  name: z.string().describe('The name of the food item.'),
  quantity: z.string().describe('The quantity and units of the food item (e.g., "200g", "1 cup").'),
});
export type FoodItem = z.infer<typeof FoodItemSchema>;


const EstimateCarbonFootprintFromMealPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  quantityAndUnits: z.string().describe('User provided description of the quantity and units of the entire meal (e.g., "Large bowl", "200g chicken, 1 cup rice").'),
});
export type EstimateCarbonFootprintFromMealPhotoInput = z.infer<
  typeof EstimateCarbonFootprintFromMealPhotoInputSchema
>;


const EstimateCarbonFootprintFromMealPhotoOutputSchema = z.object({
  foodItems: z.array(FoodItemSchema).describe('The identified food items in the meal.'),
  carbonFootprintKgCO2e: z
    .number()
    .describe('The *total* estimated carbon footprint of the meal in kg CO2e.'),
});
export type EstimateCarbonFootprintFromMealPhotoOutput = z.infer<
  typeof EstimateCarbonFootprintFromMealPhotoOutputSchema
>;


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


export async function estimateCarbonFootprintFromMealPhoto(
  input: EstimateCarbonFootprintFromMealPhotoInput
): Promise<EstimateCarbonFootprintFromMealPhotoOutput> {
   // Directly call the flow defined below
  return estimateCarbonFootprintFromMealPhotoFlow(input);
}


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
