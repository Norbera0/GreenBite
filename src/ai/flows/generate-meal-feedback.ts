
'use server';
/**
 * @fileOverview Generates personalized feedback for a meal based on its carbon impact.
 *
 * - generateMealFeedback - A function that handles the feedback generation.
 * - GenerateMealFeedbackInput - The input type.
 * - GenerateMealFeedbackOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import {
  GenerateMealFeedbackInputSchema,
  type GenerateMealFeedbackInput,
  GenerateMealFeedbackOutputSchema,
  type GenerateMealFeedbackOutput,
  MealImpactLevelSchema,
} from '@/ai/schemas';

const feedbackPrompt = ai.definePrompt({
  name: 'generateMealFeedbackPrompt',
  input: { schema: GenerateMealFeedbackInputSchema },
  output: { schema: GenerateMealFeedbackOutputSchema },
  prompt: `Analyze the following meal and its carbon footprint:
Food Items:
{{#each foodItems}}
- {{this.name}} (Quantity: {{this.quantity}})
{{/each}}
Total CO₂e: {{carbonFootprintKgCO2e}} kg.

First, determine the impact level based on the total CO₂e:
- If CO₂e > 5.0 kg, the impactLevel is "High".
- If CO₂e >= 2.0 kg and CO₂e <= 5.0 kg, the impactLevel is "Medium".
- If CO₂e < 2.0 kg, the impactLevel is "Low".

Then, based on the determined impactLevel and the specific food items, provide a single, short, friendly, and actionable feedbackMessage (1-2 sentences).

- If impactLevel is "High": Provide a constructive suggestion. Example: "This meal had a high footprint. Try replacing [specific high-impact item like beef] with [a lower-impact alternative like lentils or chicken] next time – your planet will thank you!"
- If impactLevel is "Medium": Provide a balanced reflection. Example: "Not bad! Some parts like [specific item] were a bit carbon-heavy. Consider smaller portions of meat or more seasonal veggies next time." or "A moderate impact. To lower it further, you could try [suggestion]."
- If impactLevel is "Low": Provide an encouraging affirmation. Example: "Great job! This meal was light on the planet. Keep up the sustainable choices!" or "Excellent choice! This meal has a low carbon footprint."

Return the feedbackMessage and the determined impactLevel in the specified JSON format.
Focus on being helpful and encouraging.
`,
});

export async function generateMealFeedback(
  input: GenerateMealFeedbackInput
): Promise<GenerateMealFeedbackOutput> {
  return generateMealFeedbackFlow(input);
}

const generateMealFeedbackFlow = ai.defineFlow(
  {
    name: 'generateMealFeedbackFlow',
    inputSchema: GenerateMealFeedbackInputSchema,
    outputSchema: GenerateMealFeedbackOutputSchema,
  },
  async (input) => {
    console.log("Calling generateMealFeedbackFlow with input:", input);
    try {
      const result = await feedbackPrompt(input);
      if (!result.output || !result.output.feedbackMessage || !result.output.impactLevel) {
        throw new Error('AI did not return the expected feedback format.');
      }
      console.log("Meal Feedback Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in meal feedback generation flow:", error);
      // Determine impact level manually for fallback
      let impact: 'High' | 'Medium' | 'Low' = 'Medium';
      if (input.carbonFootprintKgCO2e > 5.0) impact = 'High';
      else if (input.carbonFootprintKgCO2e < 2.0) impact = 'Low';
      
      return {
        feedbackMessage: `Your meal's carbon footprint was ${input.carbonFootprintKgCO2e.toFixed(2)} kg CO₂e. Consider exploring lower-impact options for future meals.`,
        impactLevel: impact,
      };
    }
  }
);

export type { GenerateMealFeedbackInput, GenerateMealFeedbackOutput };
