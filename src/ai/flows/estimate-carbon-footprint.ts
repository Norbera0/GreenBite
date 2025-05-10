
// src/ai/flows/estimate-carbon-footprint.ts
'use server';

/**
 * @fileOverview Estimates the carbon footprint of a meal based on user-confirmed food items and quantities.
 *
 * - estimateMealCarbonFootprint - A function that handles the carbon footprint estimation process.
 * - EstimateMealCarbonFootprintInput - The input type for the function.
 * - EstimateMealCarbonFootprintOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
  EstimateCarbonFootprintInputSchema, // Updated input schema
  type EstimateCarbonFootprintInput,    // Updated input type
  EstimateCarbonFootprintOutputSchema,  // Updated output schema (only CO2e)
  type EstimateCarbonFootprintOutput,   // Updated output type
} from '@/ai/schemas';

// Prompt for estimating carbon footprint from a list of confirmed food items
const estimateFootprintFromItemsPrompt = ai.definePrompt({
  name: 'estimateFootprintFromItemsPrompt',
  input: {schema: EstimateCarbonFootprintInputSchema}, // Uses new input schema
  output: {schema: EstimateCarbonFootprintOutputSchema }, // Uses new output schema
  prompt: `You are an AI assistant that estimates the total carbon footprint (in kg CO2e) for a meal based on a list of food items and their quantities.
  Optionally, a photo of the meal is provided for visual context, but the primary source of information is the food item list.

  Analyze the following meal information:
  Food Items:
  {{#each foodItems}}
  - {{this.name}} (Quantity: {{this.quantity}})
  {{/each}}
  {{#if photoDataUri}}
  Meal Photo (for context): {{media url=photoDataUri}}
  {{/if}}

  Estimate the *total* carbon footprint for the entire meal based on these items and quantities. Use average carbon footprint data for common foods.
  Return *only* the single total estimated carbon footprint as 'carbonFootprintKgCO2e' in a JSON object matching the provided schema.
  `,
});

// This function is the main export intended for use by client components.
export async function estimateMealCarbonFootprint(
  input: EstimateCarbonFootprintInput
): Promise<EstimateCarbonFootprintOutput> {
  return estimateMealCarbonFootprintFlow(input);
}

// The Genkit flow definition
const estimateMealCarbonFootprintFlow = ai.defineFlow(
  {
    name: 'estimateMealCarbonFootprintFlow',
    inputSchema: EstimateCarbonFootprintInputSchema,
    outputSchema: EstimateCarbonFootprintOutputSchema,
  },
  async (input) => {
     console.log("Calling estimateMealCarbonFootprintFlow with input:", input);
     try {
       const result = await estimateFootprintFromItemsPrompt(input);

       if (!result.output || typeof result.output.carbonFootprintKgCO2e === 'undefined') {
          throw new Error('AI did not return the expected carbon footprint output format.');
       }

       console.log("Estimate Meal Carbon Footprint Flow Result:", result.output);
       return result.output; // Contains only carbonFootprintKgCO2e

     } catch (error) {
        console.error("Error in estimate meal carbon footprint flow:", error);
        // Re-throw or handle error appropriately
         throw new Error(`AI processing failed for carbon footprint estimation: ${error instanceof Error ? error.message : String(error)}`);
     }
  }
);

// Make types available for import
export type { EstimateCarbonFootprintInput as EstimateMealCarbonFootprintInput, EstimateCarbonFootprintOutput as EstimateMealCarbonFootprintOutput };

// Legacy export for estimateCarbonFootprintFromMealPhoto was removed as it violates "use server" export rules.
// If the legacy flow is needed, it should be imported directly from '@/ai/flows/legacy-estimate-carbon-footprint'.
// The types (EstimateCarbonFootprintFromMealPhotoInput, EstimateCarbonFootprintFromMealPhotoOutput) are available from '@/ai/schemas'.
