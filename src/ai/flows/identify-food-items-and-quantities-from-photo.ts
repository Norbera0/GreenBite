
'use server';
/**
 * @fileOverview Identifies food items and estimates their quantities from a meal photo.
 *
 * - identifyFoodItemsAndQuantities - A function that handles the food item and quantity identification process.
 * - IdentifyFoodAndQuantitiesInput - The input type.
 * - IdentifyFoodAndQuantitiesOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import {
  IdentifyFoodAndQuantitiesInputSchema,
  type IdentifyFoodAndQuantitiesInput,
  IdentifyFoodAndQuantitiesOutputSchema,
  type IdentifyFoodAndQuantitiesOutput,
} from '@/ai/schemas';

const identifyPrompt = ai.definePrompt({
  name: 'identifyFoodItemsAndQuantitiesPrompt',
  input: { schema: IdentifyFoodAndQuantitiesInputSchema },
  output: { schema: IdentifyFoodAndQuantitiesOutputSchema },
  prompt: `You are an AI assistant that identifies food items in a meal from a photo and estimates their quantities in natural or standard units (e.g., "1 cup rice", "150g steak", "1 apple", "2 slices bread").

Analyze the following meal photo:
Photo: {{media url=photoDataUri}}

Return a list of identified food items and their estimated quantities. Be as specific as possible for each item. If multiple distinct items are visible, list them all.
If an item quantity is unclear, provide your best estimate (e.g., "small portion", "about 100g").
Output the result as a JSON object matching the provided schema, with an 'identifiedItems' array. Each item in the array should have a 'name' and 'estimatedQuantity'.
`,
});

export async function identifyFoodItemsAndQuantities(
  input: IdentifyFoodAndQuantitiesInput
): Promise<IdentifyFoodAndQuantitiesOutput> {
  return identifyFoodItemsAndQuantitiesFlow(input);
}

const identifyFoodItemsAndQuantitiesFlow = ai.defineFlow(
  {
    name: 'identifyFoodItemsAndQuantitiesFlow',
    inputSchema: IdentifyFoodAndQuantitiesInputSchema,
    outputSchema: IdentifyFoodAndQuantitiesOutputSchema,
  },
  async (input) => {
    console.log("Calling identifyFoodItemsAndQuantitiesFlow with photo input.");
    try {
      const result = await identifyPrompt(input);
      if (!result.output || !result.output.identifiedItems) {
        throw new Error('AI did not return the expected identified items format.');
      }
      console.log("Identified Items and Quantities Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in identify food items and quantities flow:", error);
      // Fallback to an empty list or a generic item if identification fails
      return {
        identifiedItems: [{ name: "Unable to identify items", estimatedQuantity: "N/A" }]
      };
    }
  }
);

export type { IdentifyFoodAndQuantitiesInput, IdentifyFoodAndQuantitiesOutput };
