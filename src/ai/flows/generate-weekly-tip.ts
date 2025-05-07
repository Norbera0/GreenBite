'use server';
/**
 * @fileOverview Generates a personalized weekly tip based on the user's meal logs from the past 7 days.
 *
 * - generateWeeklyTip - A function that handles the weekly tip generation process.
 * - GenerateWeeklyTipInput - The input type for the generateWeeklyTip function.
 * - GenerateWeeklyTipOutput - The return type for the generateWeeklyTip function.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateWeeklyTipInputSchema,
  type GenerateWeeklyTipInput,
  GenerateWeeklyTipOutputSchema,
  type GenerateWeeklyTipOutput,
} from '@/ai/schemas';

const weeklyTipPrompt = ai.definePrompt({
  name: 'generateWeeklyTipPrompt',
  input: {schema: GenerateWeeklyTipInputSchema},
  output: {schema: GenerateWeeklyTipOutputSchema},
  prompt: `Analyze this user's weekly meal data and suggest 1-2 friendly, specific tips to help reduce their food-related carbon footprint. Focus on realistic, low-effort changes based on repeated high-impact foods.

Meal Data (Last 7 Days):
{{{mealLogsSummary}}}

Important:
- Mention specific foods with CO₂e values where useful to highlight impact.
- Keep the tone encouraging, helpful, and non-judgmental.
- Provide actionable suggestions.
- The output should be a single string for the tip, fitting into 1-2 sentences.
`,
});

// Exported function to be called by the application
export async function generateWeeklyTip(
  input: GenerateWeeklyTipInput
): Promise<GenerateWeeklyTipOutput> {
  return generateWeeklyTipFlow(input);
}

// The Genkit flow definition
const generateWeeklyTipFlow = ai.defineFlow(
  {
    name: 'generateWeeklyTipFlow',
    inputSchema: GenerateWeeklyTipInputSchema,
    outputSchema: GenerateWeeklyTipOutputSchema,
  },
  async (input) => {
    console.log("Calling generateWeeklyTipFlow with input:", input.mealLogsSummary.substring(0, 200) + "..."); // Log snippet
    try {
      const result = await weeklyTipPrompt(input);
      if (!result.output || !result.output.tip) {
        throw new Error('AI did not return the expected tip format.');
      }
      console.log("Weekly Tip Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in weekly tip generation flow:", error);
      throw new Error(`Weekly tip generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// Export types for external use
export type { GenerateWeeklyTipInput, GenerateWeeklyTipOutput };
