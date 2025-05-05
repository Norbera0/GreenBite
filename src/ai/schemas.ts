// src/ai/schemas.ts
import { z } from 'genkit';

/**
 * Zod schema for a single food item identified in a meal.
 */
export const FoodItemSchema = z.object({
  name: z.string().describe('The name of the food item.'),
  quantity: z.string().describe('The quantity and units of the food item (e.g., "200g", "1 cup").'),
});

/**
 * TypeScript type inferred from the FoodItemSchema.
 */
export type FoodItem = z.infer<typeof FoodItemSchema>;

/**
 * Zod schema for the input required by the carbon footprint estimation AI flow.
 */
export const EstimateCarbonFootprintFromMealPhotoInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  quantityAndUnits: z.string().describe('User provided description of the quantity and units of the entire meal (e.g., "Large bowl", "200g chicken, 1 cup rice").'),
});

/**
 * TypeScript type inferred from the EstimateCarbonFootprintFromMealPhotoInputSchema.
 */
export type EstimateCarbonFootprintFromMealPhotoInput = z.infer<
  typeof EstimateCarbonFootprintFromMealPhotoInputSchema
>;

/**
 * Zod schema for the output produced by the carbon footprint estimation AI flow.
 */
export const EstimateCarbonFootprintFromMealPhotoOutputSchema = z.object({
  foodItems: z.array(FoodItemSchema).describe('The identified food items in the meal.'),
  carbonFootprintKgCO2e: z
    .number()
    .describe('The *total* estimated carbon footprint of the meal in kg CO2e.'),
});

/**
 * TypeScript type inferred from the EstimateCarbonFootprintFromMealPhotoOutputSchema.
 */
export type EstimateCarbonFootprintFromMealPhotoOutput = z.infer<
  typeof EstimateCarbonFootprintFromMealPhotoOutputSchema
>;


// --- Meal Suggestion Schemas ---

/**
 * Zod schema for the input required by the meal suggestion AI flow.
 */
export const GenerateMealSuggestionInputSchema = z.object({
  foodItems: z.array(FoodItemSchema).describe('The identified food items in the meal.'),
  carbonFootprintKgCO2e: z.number().describe('The estimated carbon footprint of the meal in kg CO2e.'),
});

/**
 * TypeScript type inferred from the GenerateMealSuggestionInputSchema.
 */
export type GenerateMealSuggestionInput = z.infer<typeof GenerateMealSuggestionInputSchema>;

/**
 * Zod schema for the output produced by the meal suggestion AI flow.
 */
export const GenerateMealSuggestionOutputSchema = z.object({
  suggestion: z.string().describe('A short, friendly suggestion for a lower-CO2e alternative meal.'),
});

/**
 * TypeScript type inferred from the GenerateMealSuggestionOutputSchema.
 */
export type GenerateMealSuggestionOutput = z.infer<typeof GenerateMealSuggestionOutputSchema>;
