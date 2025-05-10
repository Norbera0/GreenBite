
'use server';
/**
 * @fileOverview Generates a weekly sustainability challenge based on user's meal log summary.
 *
 * - generateWeeklyChallenge - A function that handles the weekly challenge generation process.
 * - GenerateWeeklyChallengeInput - The input type.
 * - GenerateWeeklyChallengeOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import {
  GenerateWeeklyChallengeInputSchema,
  type GenerateWeeklyChallengeInput,
  GenerateWeeklyChallengeOutputSchema,
  type GenerateWeeklyChallengeOutput,
} from '@/ai/schemas';

const weeklyChallengePrompt = ai.definePrompt({
  name: 'generateWeeklyChallengePrompt',
  input: { schema: GenerateWeeklyChallengeInputSchema },
  output: { schema: GenerateWeeklyChallengeOutputSchema },
  prompt: `You are an AI assistant for EcoPlate, an app helping users track and reduce their food's carbon footprint.
Your task is to generate an engaging weekly challenge based on the user's meal logs from the past 7-14 days.

User's meal logs summary:
{{{mealLogsSummary}}}

Consider the following challenge types:
- 'weekly_co2e_under': Challenge the user to keep their total CO2e for the week under a certain amount (e.g., 15 kg, 12 kg). This should be ambitious but achievable based on their summary.
- 'plant_based_meals_count': Encourage eating a certain number of plant-based meals (low CO2e, e.g., < 0.7 kg CO2e per meal) during the week (e.g., 3 meals, 5 meals).
- 'log_days_count': Motivate the user to log meals on a specific number of days this week (e.g., 5 days, 7 days).

Select one challenge type.
Provide a concise, encouraging 'description' for the challenge.
Specify the 'type' of the challenge (matching one of the enums).
Provide an appropriate 'targetValue' for the challenge.

Example output for 'weekly_co2e_under':
{
  "description": "Aim to keep your total carbon footprint under 14.0 kg CO₂e this week!",
  "type": "weekly_co2e_under",
  "targetValue": 14.0
}

Example output for 'plant_based_meals_count':
{
  "description": "Enjoy at least 4 plant-based meals (under 0.7 kg CO₂e each) this week!",
  "type": "plant_based_meals_count",
  "targetValue": 4
}

Generate a new weekly challenge based on the provided meal log summary. Make it relevant to their past eating habits if possible.
If the meal log summary indicates very low activity or very low CO2e already, suggest a challenge like 'log_days_count' to encourage consistent logging, or a slightly more ambitious 'plant_based_meals_count'.
`,
});

export async function generateWeeklyChallenge(
  input: GenerateWeeklyChallengeInput
): Promise<GenerateWeeklyChallengeOutput> {
  return generateWeeklyChallengeFlow(input);
}

const generateWeeklyChallengeFlow = ai.defineFlow(
  {
    name: 'generateWeeklyChallengeFlow',
    inputSchema: GenerateWeeklyChallengeInputSchema,
    outputSchema: GenerateWeeklyChallengeOutputSchema,
  },
  async (input) => {
    console.log("Calling generateWeeklyChallengeFlow with input mealLogsSummary (first 200 chars):", input.mealLogsSummary.substring(0, 200) + "...");
    try {
      const result = await weeklyChallengePrompt(input);
      if (!result.output || !result.output.description || !result.output.type || result.output.targetValue === undefined) {
        throw new Error('AI did not return the expected weekly challenge format.');
      }
       // Ensure targetValue is positive
      if (result.output.targetValue <= 0) {
        console.warn(`AI returned non-positive targetValue (${result.output.targetValue}) for type ${result.output.type}. Adjusting to a sensible default.`);
        if (result.output.type === 'weekly_co2e_under') result.output.targetValue = 10.0;
        else if (result.output.type === 'plant_based_meals_count') result.output.targetValue = 3;
        else if (result.output.type === 'log_days_count') result.output.targetValue = 5;
        else result.output.targetValue = 1; // Absolute fallback
      }

      console.log("Weekly Challenge Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in weekly challenge generation flow:", error);
      // Fallback to a predefined simple challenge
      return {
        description: "Try to log your meals on at least 3 different days this week!",
        type: "log_days_count",
        targetValue: 3,
      };
    }
  }
);

export type { GenerateWeeklyChallengeInput, GenerateWeeklyChallengeOutput };
