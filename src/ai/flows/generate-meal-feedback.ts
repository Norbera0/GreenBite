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
  prompt: `You are an AI assistant for EcoPlate, an app helping users understand and reduce their food's carbon footprint.
Analyze the following meal, its total carbon footprint, and the user's confirmed food items:

Food Items:
{{#each foodItems}}
- {{this.name}} (Quantity: {{this.quantity}})
{{/each}}
Total CO₂e: {{carbonFootprintKgCO2e}} kg.

First, determine the impactLevel based on the total CO₂e:
- If CO₂e > 5.0 kg, the impactLevel is "High".
- If CO₂e >= 2.0 kg and CO₂e <= 5.0 kg, the impactLevel is "Medium".
- If CO₂e < 2.0 kg, the impactLevel is "Low".

Based on the determined impactLevel AND the specific food items (especially high-impact ones if present), generate a single, short (1-2 sentences), friendly, empathetic, and actionable 'feedbackMessage'.
The message should be contextual and helpful, not judgmental. Avoid explicitly stating "Your meal's impact is High/Medium/Low" in the feedback message itself.
Instead, focus on:
- For higher impact meals: Gently point out high-impact items if identifiable (e.g., "The beef in this meal contributed significantly to its footprint.") and suggest a specific, actionable alternative for next time.
- For medium impact meals: Offer a balanced reflection, perhaps acknowledging good choices while suggesting minor improvements or portion adjustments for specific items.
- For low impact meals: Provide an encouraging affirmation, highlighting what made it a good choice (e.g., "Great choice with the lentils and vegetables! This meal is light on the planet.").

Examples:
- High CO2e (e.g., Beef Burger, 4.1 kg): "The beef burger made up a large part of this meal's 4.1 kg CO₂e. Next time, a lentil or chicken burger could reduce the impact significantly!"
- Medium CO2e (e.g., Chicken Stir-fry, 2.5 kg): "A good-sized meal! To make it even more planet-friendly, you could try slightly less chicken or add more seasonal vegetables next time."
- Low CO2e (e.g., Lentil Soup, 0.6 kg): "Excellent choice! This lentil soup is a delicious and very low-impact meal. Keep up the great work!"

Return the 'feedbackMessage' and the determined 'impactLevel' in the specified JSON format.
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
