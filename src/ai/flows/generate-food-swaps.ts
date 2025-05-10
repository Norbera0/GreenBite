'use server';
/**
 * @fileOverview Generates food swap suggestions based on user's weekly meal data.
 *
 * - generateFoodSwaps - A function that handles the food swap generation process.
 * - GenerateFoodSwapsInput - The input type.
 * - GenerateFoodSwapsOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateFoodSwapsInputSchema,
  type GenerateFoodSwapsInput,
  GenerateFoodSwapsOutputSchema,
  type GenerateFoodSwapsOutput,
} from '@/ai/schemas';

const foodSwapsPrompt = ai.definePrompt({
  name: 'generateFoodSwapsPrompt',
  input: {schema: GenerateFoodSwapsInputSchema},
  output: {schema: GenerateFoodSwapsOutputSchema},
  prompt: `User's meal logs for the past 7 days:
{{{mealLogsSummary}}}

Based on this data, provide 3-5 specific food swap suggestions to reduce carbon footprint. For each suggestion:
1. Identify a high-impact 'originalItem' the user consumes (e.g., "Beef Burger", "Lamb Chops", "Cheese Platter"). Be specific if possible.
2. Suggest a lower-impact 'suggestedItem' (e.g., "Lentil Burger", "Chicken Breast", "Plant-based Cheese").
3. Provide an estimated 'co2eSavingEstimate' (e.g., "Save ~2.5 kg CO₂e per serving", "Reduce impact by ~70%", "Around 10 kg CO₂e less per month if swapped weekly"). Make this impactful and easy to understand.
4. Optionally, add a short 'details' string (max 1-2 sentences) explaining the benefit or context of the swap.

Keep the suggestions varied if possible.
Return the response as a JSON object matching the provided schema, with a 'swaps' array containing 3 to 5 suggestions.
If no clear high-impact items are found or logs are sparse, suggest general swaps like "Red meat for poultry" or "Dairy milk for plant-based milk".
`,
});

// Exported function to be called by the application
export async function generateFoodSwaps(
  input: GenerateFoodSwapsInput
): Promise<GenerateFoodSwapsOutput> {
  return generateFoodSwapsFlow(input);
}

// The Genkit flow definition
const generateFoodSwapsFlow = ai.defineFlow(
  {
    name: 'generateFoodSwapsFlow',
    inputSchema: GenerateFoodSwapsInputSchema,
    outputSchema: GenerateFoodSwapsOutputSchema,
  },
  async (input) => {
    console.log("Calling generateFoodSwapsFlow with input summary (first 200 chars):", input.mealLogsSummary.substring(0, 200) + "...");
    try {
      const result = await foodSwapsPrompt(input);
      if (!result.output || !result.output.swaps || result.output.swaps.length === 0) {
        // Fallback if AI returns empty or malformed swaps
        console.warn("AI did not return valid swaps, providing default suggestions.");
        return {
          swaps: [
            { originalItem: "High-carbon meals", suggestedItem: "Plant-rich alternatives", co2eSavingEstimate: "Significant savings!", details: "Consider incorporating more plant-based meals into your week." }
          ]
        };
      }
      console.log("Food Swaps Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in food swaps generation flow:", error);
      // Provide a fallback in case of error
      return {
        swaps: [
          { originalItem: "Error fetching suggestions", suggestedItem: "Try refreshing", co2eSavingEstimate: "N/A", details: "Could not generate personalized food swaps at this time." }
        ]
      };
    }
  }
);

// Export types for external use
export type { GenerateFoodSwapsInput, GenerateFoodSwapsOutput };
