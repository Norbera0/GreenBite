'use server';
/**
 * @fileOverview Generates a general, actionable sustainability tip based on user's weekly meal data.
 *
 * - generateGeneralRecommendation - A function that handles the general tip generation process.
 * - GenerateTipInput - The input type (reused from weekly tip).
 * - GenerateTipOutput - The return type (reused from weekly tip).
 */

import {ai} from '@/ai/genkit';
import {
  GenerateTipInputSchema, // Reusing the general schema
  type GenerateTipInput,
  GenerateTipOutputSchema, // Reusing the general schema
  type GenerateTipOutput,
} from '@/ai/schemas';

const generalRecommendationPrompt = ai.definePrompt({
  name: 'generateGeneralRecommendationPrompt',
  input: {schema: GenerateTipInputSchema},
  output: {schema: GenerateTipOutputSchema},
  prompt: `Analyze this user's weekly meal data and provide a single, short (1-2 sentences), friendly, and actionable general sustainability tip to help them reduce their food-related carbon footprint.
This tip should be a broad piece of advice or insight, not just a direct swap for one meal.
Focus on an observation from their eating habits or a general sustainability principle that applies to them.

Meal Data (Last 7 Days):
{{{mealLogsSummary}}}

Example tip formats:
{
  "tip": "Eating seasonally available fruits and vegetables can often lower the carbon footprint of your meals by reducing transport and storage emissions."
}
{
  "tip": "Noticing a few high-impact meals this week? Even small reductions in frequency or portion size for these can make a big difference over time!"
}
{
  "tip": "Planning meals ahead can help reduce food waste, which is a significant contributor to greenhouse gas emissions."
}

Generate a tip based on the user's meal data.
`,
});

// Exported function to be called by the application
export async function generateGeneralRecommendation(
  input: GenerateTipInput
): Promise<GenerateTipOutput> {
  return generateGeneralRecommendationFlow(input);
}

// The Genkit flow definition
const generateGeneralRecommendationFlow = ai.defineFlow(
  {
    name: 'generateGeneralRecommendationFlow',
    inputSchema: GenerateTipInputSchema,
    outputSchema: GenerateTipOutputSchema,
  },
  async (input) => {
    console.log("Calling generateGeneralRecommendationFlow with input summary (first 200 chars):", input.mealLogsSummary.substring(0, 200) + "...");
    try {
      const result = await generalRecommendationPrompt(input);
      if (!result.output || !result.output.tip) {
        throw new Error('AI did not return the expected tip format.');
      }
      console.log("General Recommendation Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in general recommendation generation flow:", error);
      throw new Error(`General recommendation generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// Export types for external use (already exported from schemas.ts, but good for clarity)
export type { GenerateTipInput as GenerateGeneralRecommendationInput, GenerateTipOutput as GenerateGeneralRecommendationOutput };
