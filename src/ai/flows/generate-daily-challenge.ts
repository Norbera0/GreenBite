
'use server';
/**
 * @fileOverview Generates a daily sustainability challenge for the user.
 *
 * - generateDailyChallenge - A function that handles the daily challenge generation process.
 * - GenerateDailyChallengeInput - The input type.
 * - GenerateDailyChallengeOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import {
  GenerateDailyChallengeInputSchema,
  type GenerateDailyChallengeInput,
  GenerateDailyChallengeOutputSchema,
  type GenerateDailyChallengeOutput,
} from '@/ai/schemas';

const dailyChallengePrompt = ai.definePrompt({
  name: 'generateDailyChallengePrompt',
  input: { schema: GenerateDailyChallengeInputSchema },
  output: { schema: GenerateDailyChallengeOutputSchema },
  prompt: `You are an AI assistant for EcoPlate, an app helping users track and reduce their food's carbon footprint.
Your task is to generate a simple, actionable, and friendly daily challenge for the user.

Consider the following challenge types and adapt your suggestion:
- 'log_plant_based': Encourage logging a meal that is primarily plant-based (low CO2e, e.g., < 0.7 kg CO2e).
- 'co2e_under_today': Challenge the user to keep their total daily CO2e under a certain amount (e.g., 2.0, 2.5, or 3.0 kg).
- 'avoid_red_meat_meal': Suggest logging a meal that does not contain red meat (beef, lamb, pork).
- 'log_three_meals': Encourage logging breakfast, lunch, and dinner.
- 'log_low_co2e_meal': Challenge to log any single meal with a very low CO2e (e.g., < 0.5 kg CO2e).

{{#if userHistorySummary}}
User's recent activity context (optional): {{{userHistorySummary}}}
{{/if}}

Select one challenge type from the list above.
Provide a concise, encouraging 'description' for the challenge.
Specify the 'type' of the challenge (matching one of the enums).
If the challenge type is 'co2e_under_today' or 'log_low_co2e_meal', provide an appropriate 'targetValue' (e.g., 2.5 for kg CO2e, or 0.5 for kg CO2e). For other types, targetValue is optional or not needed.

Example output for 'co2e_under_today':
{
  "description": "Try to keep your total carbon footprint under 2.5 kg CO₂e today!",
  "type": "co2e_under_today",
  "targetValue": 2.5
}

Example output for 'log_plant_based':
{
  "description": "Log a delicious plant-based meal today (aim for under 0.7 kg CO₂e)!",
  "type": "log_plant_based",
  "targetValue": 0.7 
}

Generate a new daily challenge.
`,
});

export async function generateDailyChallenge(
  input: GenerateDailyChallengeInput
): Promise<GenerateDailyChallengeOutput> {
  return generateDailyChallengeFlow(input);
}

const generateDailyChallengeFlow = ai.defineFlow(
  {
    name: 'generateDailyChallengeFlow',
    inputSchema: GenerateDailyChallengeInputSchema,
    outputSchema: GenerateDailyChallengeOutputSchema,
  },
  async (input) => {
    console.log("Calling generateDailyChallengeFlow with input:", input);
    try {
      const result = await dailyChallengePrompt(input);
      if (!result.output || !result.output.description || !result.output.type) {
        throw new Error('AI did not return the expected daily challenge format.');
      }
      // Ensure targetValue is sensible if provided
      if (result.output.type === 'co2e_under_today' && (result.output.targetValue === undefined || result.output.targetValue <= 0)) {
        result.output.targetValue = 2.5; // Default if missing or invalid
      }
      if (result.output.type === 'log_low_co2e_meal' && (result.output.targetValue === undefined || result.output.targetValue <= 0)) {
        result.output.targetValue = 0.5; // Default if missing or invalid
      }
      console.log("Daily Challenge Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in daily challenge generation flow:", error);
      // Fallback to a predefined simple challenge
      return {
        description: "Log any meal today to track its footprint!",
        type: "log_low_co2e_meal", // A generic type that encourages logging
        targetValue: 5.0 // A very high target, essentially just log anything
      };
    }
  }
);

export type { GenerateDailyChallengeInput, GenerateDailyChallengeOutput };
