'use server';
/**
 * @fileOverview Normalizes a user-provided food quantity string to kilograms (kg).
 *
 * - normalizeQuantityToKg - A function that handles the quantity normalization.
 * - NormalizeQuantityToKgInput - The input type.
 * - NormalizeQuantityToKgOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import {
  NormalizeQuantityToKgInputSchema,
  type NormalizeQuantityToKgInput,
  NormalizeQuantityToKgOutputSchema,
  type NormalizeQuantityToKgOutput,
} from '@/ai/schemas';

const normalizationPrompt = ai.definePrompt({
  name: 'normalizeQuantityToKgPrompt',
  input: { schema: NormalizeQuantityToKgInputSchema },
  output: { schema: NormalizeQuantityToKgOutputSchema },
  prompt: `You are an expert in food quantity estimation.
Given a food item name and a quantity string, convert the quantity to kilograms (kg).
Food Item: {{{itemName}}}
Quantity String: {{{quantityString}}}

Common conversions to consider:
- 1 cup of liquid ~ 0.24 kg (water), but varies for solids (e.g., 1 cup flour ~ 0.12 kg, 1 cup rice ~ 0.19 kg)
- 1 tablespoon ~ 0.015 kg (liquids)
- 1 teaspoon ~ 0.005 kg (liquids)
- 1 slice of bread ~ 0.03 kg
- 1 medium apple/banana/orange ~ 0.15 - 0.2 kg
- 1 egg ~ 0.05 - 0.06 kg
- "a piece" or "a serving" is ambiguous, use context of item. e.g. "a piece of chicken" might be 0.15kg. "a serving of rice" could be 0.1kg cooked.
- If units like "g", "grams", "kg", "kilograms", "oz", "ounces", "lb", "pounds" are present, use them directly.
  - 1 oz ~ 0.02835 kg
  - 1 lb ~ 0.453592 kg
- If the quantity string is already in kg or g, just parse it. E.g., "150g" is 0.15kg. "0.5kg" is 0.5kg.
- If quantity is highly ambiguous (e.g., "some", "a bit"), make a reasonable estimate based on common serving sizes for the item, and set confidence to "Low". For "a bowl of soup", assume ~0.3kg. For "a handful of nuts", assume ~0.03kg.

Return the estimated quantity in kilograms as 'quantityKg'.
Also return the original 'quantityString' and 'itemName' as provided in the input.
Estimate your 'confidence' in this conversion (High, Medium, Low).
If the input quantity is non-numeric or completely unparsable for the given item (e.g., "delicious" for "apple"), return 0.1 kg as a default low-confidence guess.
`,
});

export async function normalizeQuantityToKg(
  input: NormalizeQuantityToKgInput
): Promise<NormalizeQuantityToKgOutput> {
  return normalizeQuantityToKgFlow(input);
}

const normalizeQuantityToKgFlow = ai.defineFlow(
  {
    name: 'normalizeQuantityToKgFlow',
    inputSchema: NormalizeQuantityToKgInputSchema,
    outputSchema: NormalizeQuantityToKgOutputSchema,
  },
  async (input) => {
    console.log("Calling normalizeQuantityToKgFlow with input:", input);
    try {
      const result = await normalizationPrompt(input);
      if (!result.output || typeof result.output.quantityKg !== 'number') {
        console.warn("AI did not return the expected normalization format. Input:", input);
        // Fallback if AI fails to produce valid output
        return { 
            quantityKg: 0.1, // Default to a small amount
            originalQuantityString: input.quantityString,
            itemName: input.itemName,
            confidence: "Low" 
        };
      }
      console.log("Quantity Normalization Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in quantity normalization flow:", error);
      // More robust fallback in case of error
      return {
        quantityKg: 0.1, // Default to a small amount if error occurs
        originalQuantityString: input.quantityString,
        itemName: input.itemName,
        confidence: "Low"
      };
    }
  }
);

export type { NormalizeQuantityToKgInput, NormalizeQuantityToKgOutput };
