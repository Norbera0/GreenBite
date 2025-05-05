// src/ai/flows/generate-meal-suggestion.ts
'use server';

/**
 * @fileOverview Generates a suggestion for a lower carbon footprint meal alternative.
 *
 * - generateMealSuggestion - A function that handles the meal suggestion generation process.
 * - GenerateMealSuggestionInput - The input type for the generateMealSuggestion function.
 * - GenerateMealSuggestionOutput - The return type for the generateMealSuggestion function.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateMealSuggestionInputSchema,
  type GenerateMealSuggestionInput,
  GenerateMealSuggestionOutputSchema,
  type GenerateMealSuggestionOutput,
} from '@/ai/schemas'; // Import schemas

// Define the prompt for generating the suggestion
const suggestionPrompt = ai.definePrompt({
  name: 'generateMealSuggestionPrompt',
  input: {schema: GenerateMealSuggestionInputSchema},
  output: {schema: GenerateMealSuggestionOutputSchema},
  prompt: `User logged a meal with the following items:
{{#each foodItems}}
- {{this.name}} ({{this.quantity}})
{{/each}}
Total estimated CO2e: {{carbonFootprintKgCO2e}} kg.

This carbon footprint is considered high. Provide a short (1-2 sentences), friendly suggestion for a similar but lower-CO2e alternative meal. Mention the approximate potential CO2e saving or percentage reduction. Focus on a single main alternative if possible. Keep the tone encouraging and helpful, not judgmental.

Example output format:
{
  "suggestion": "Try swapping the beef for lentils next time! It could save around 2.5 kg CO₂e."
}
or
{
  "suggestion": "Consider a chicken version next time for about 50% less CO₂e!"
}

Generate a suggestion based on the user's meal.
`,
});


// Exported function to be called by the application
export async function generateMealSuggestion(
  input: GenerateMealSuggestionInput
): Promise<GenerateMealSuggestionOutput> {
  return generateMealSuggestionFlow(input);
}

// The Genkit flow definition
const generateMealSuggestionFlow = ai.defineFlow(
  {
    name: 'generateMealSuggestionFlow',
    inputSchema: GenerateMealSuggestionInputSchema,
    outputSchema: GenerateMealSuggestionOutputSchema,
  },
  async (input) => {
    console.log("Calling generateMealSuggestionFlow with input:", input);
    try {
      const result = await suggestionPrompt(input);
      if (!result.output) {
        throw new Error('AI did not return the expected suggestion format.');
      }
      console.log("Suggestion Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in suggestion generation flow:", error);
      // Rethrow or handle error appropriately
      throw new Error(`Suggestion generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// Export types for external use
export type { GenerateMealSuggestionInput, GenerateMealSuggestionOutput };
