
'use server';
/**
 * @fileOverview Generates a relatable equivalency for a meal's carbon footprint.
 *
 * - generateCarbonEquivalency - A function that handles the equivalency generation.
 * - GenerateCarbonEquivalencyInput - The input type.
 * - GenerateCarbonEquivalencyOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import {
  GenerateCarbonEquivalencyInputSchema,
  type GenerateCarbonEquivalencyInput,
  GenerateCarbonEquivalencyOutputSchema,
  type GenerateCarbonEquivalencyOutput,
} from '@/ai/schemas';

const equivalencyPrompt = ai.definePrompt({
  name: 'generateCarbonEquivalencyPrompt',
  input: { schema: GenerateCarbonEquivalencyInputSchema },
  output: { schema: GenerateCarbonEquivalencyOutputSchema },
  prompt: `Given a meal's carbon footprint of {{carbonFootprintKgCO2e}} kg CO₂e, provide one short, relatable, and impactful equivalency statement.
Focus on common, easily understandable comparisons.

Examples:
- "That's like driving a standard gasoline car for X miles/km."
- "Equivalent to charging Y smartphones fully."
- "Similar to manufacturing Z cotton t-shirts."
- "About the same as leaving a lightbulb on for W hours."
- "Roughly the emissions from producing Q liters of bottled water."

Keep the statement concise, ideally under 15 words.
Generate one equivalency statement.
`,
});

export async function generateCarbonEquivalency(
  input: GenerateCarbonEquivalencyInput
): Promise<GenerateCarbonEquivalencyOutput> {
  return generateCarbonEquivalencyFlow(input);
}

const generateCarbonEquivalencyFlow = ai.defineFlow(
  {
    name: 'generateCarbonEquivalencyFlow',
    inputSchema: GenerateCarbonEquivalencyInputSchema,
    outputSchema: GenerateCarbonEquivalencyOutputSchema,
  },
  async (input) => {
    console.log("Calling generateCarbonEquivalencyFlow with input:", input);
    try {
      const result = await equivalencyPrompt(input);
      if (!result.output || !result.output.equivalency) {
        throw new Error('AI did not return the expected equivalency format.');
      }
      console.log("Carbon Equivalency Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in carbon equivalency generation flow:", error);
      // Fallback to a generic statement
      return {
        equivalency: `This meal had a carbon footprint of ${input.carbonFootprintKgCO2e.toFixed(2)} kg CO₂e.`,
      };
    }
  }
);

export type { GenerateCarbonEquivalencyInput, GenerateCarbonEquivalencyOutput };
```