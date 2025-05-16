// src/ai/schemas.ts
import { z } from 'genkit';

/**
 * Zod schema for a single food item identified in a meal.
 * Can now include its individually calculated CO2e.
 */
export const FoodItemSchema = z.object({
  name: z.string().describe('The name of the food item.'),
  quantity: z.string().describe('The quantity and units of the food item (e.g., "200g", "1 cup").'),
  calculatedCO2eKg: z.number().optional().describe('The calculated carbon footprint for this specific item in kg CO2e, if determined individually.'),
});

/**
 * TypeScript type inferred from the FoodItemSchema.
 */
export type FoodItem = z.infer<typeof FoodItemSchema>;


// --- Identify Food Items and Quantities Schemas ---

/**
 * Zod schema for an item identified by the AI with its estimated quantity.
 */
export const IdentifiedItemSchema = z.object({
  name: z.string().describe('The name of the identified food item.'),
  estimatedQuantity: z.string().describe('The AI-estimated quantity and units of the food item (e.g., "150g", "1 whole").'),
});
export type IdentifiedItem = z.infer<typeof IdentifiedItemSchema>;

/**
 * Zod schema for the input required by the food item and quantity identification AI flow.
 */
export const IdentifyFoodAndQuantitiesInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a meal, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type IdentifyFoodAndQuantitiesInput = z.infer<typeof IdentifyFoodAndQuantitiesInputSchema>;

/**
 * Zod schema for the output produced by the food item and quantity identification AI flow.
 */
export const IdentifyFoodAndQuantitiesOutputSchema = z.object({
  identifiedItems: z.array(IdentifiedItemSchema).describe('A list of food items identified in the photo with their estimated quantities.'),
});
export type IdentifyFoodAndQuantitiesOutput = z.infer<typeof IdentifyFoodAndQuantitiesOutputSchema>;


// --- Estimate Carbon Footprint Schemas (Updated) ---

/**
 * Zod schema for the input required by the carbon footprint estimation AI flow.
 * This flow now takes user-confirmed food items and quantities.
 * It's used as a fallback if an item isn't in the CSV or for the entire meal if preferred.
 */
export const EstimateCarbonFootprintInputSchema = z.object({
  photoDataUri: z
    .string()
    .optional() 
    .describe(
      "A photo of a meal, as a data URI. Primarily for visual context if the AI needs it, as items are already specified."
    ),
  foodItems: z.array(
    z.object({ // Simplified FoodItem for this specific flow, as calculatedCO2eKg is an output, not input here
      name: z.string().describe('The name of the food item.'),
      quantity: z.string().describe('The quantity and units of the food item (e.g., "200g", "1 cup").'),
    })
  ).describe('The user-confirmed list of food items and their quantities.'),
});

/**
 * TypeScript type inferred from the EstimateCarbonFootprintInputSchema.
 */
export type EstimateCarbonFootprintInput = z.infer<
  typeof EstimateCarbonFootprintInputSchema
>;

/**
 * Zod schema for the output produced by the carbon footprint estimation AI flow.
 * It returns the total carbon footprint for the provided items.
 */
export const EstimateCarbonFootprintOutputSchema = z.object({
  carbonFootprintKgCO2e: z
    .number()
    .describe('The *total* estimated carbon footprint of the meal (or specific items provided) in kg CO2e.'),
});

/**
 * TypeScript type inferred from the EstimateCarbonFootprintOutputSchema.
 */
export type EstimateCarbonFootprintOutput = z.infer<
  typeof EstimateCarbonFootprintOutputSchema
>;

// --- Normalize Quantity to Kilograms Schemas ---
export const NormalizeQuantityToKgInputSchema = z.object({
  itemName: z.string().describe("The name of the food item, for context (e.g., 'rice', 'apple')."),
  quantityString: z.string().describe("The user-inputted quantity string (e.g., '1 slice', 'a bowl of', '200g', '2 pieces').")
});
export type NormalizeQuantityToKgInput = z.infer<typeof NormalizeQuantityToKgInputSchema>;

export const NormalizeQuantityToKgOutputSchema = z.object({
  quantityKg: z.number().describe("The estimated quantity of the item in kilograms (kg)."),
  originalQuantityString: z.string().describe("The original quantity string provided by the user."),
  itemName: z.string().describe("The item name this normalization applies to."),
  confidence: z.enum(["High", "Medium", "Low"]).optional().describe("The AI's confidence in the conversion accuracy.")
});
export type NormalizeQuantityToKgOutput = z.infer<typeof NormalizeQuantityToKgOutputSchema>;


// --- Legacy Schemas for reference or if needed by other parts not yet updated ---
/**
 * @deprecated Use EstimateCarbonFootprintInputSchema instead.
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
export type EstimateCarbonFootprintFromMealPhotoInput = z.infer<typeof EstimateCarbonFootprintFromMealPhotoInputSchema>;


export const EstimateCarbonFootprintFromMealPhotoOutputSchema = z.object({
  foodItems: z.array(FoodItemSchema).describe('The identified food items in the meal.'), // FoodItemSchema now includes calculatedCO2eKg
  carbonFootprintKgCO2e: z
    .number()
    .describe('The *total* estimated carbon footprint of the meal in kg CO2e.'),
});
export type EstimateCarbonFootprintFromMealPhotoOutput = z.infer<typeof EstimateCarbonFootprintFromMealPhotoOutputSchema>;


// --- Meal Suggestion Schemas ---

/**
 * Zod schema for the input required by the meal suggestion AI flow.
 */
export const GenerateMealSuggestionInputSchema = z.object({
  foodItems: z.array(FoodItemSchema).describe('The identified food items in the meal, potentially with their individual CO2e values.'),
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


// --- Weekly Tip Schemas (can also be used for General Recommendation Tip) ---

/**
 * Zod schema for the input required by the weekly tip generation AI flow.
 * Can also be used for generating general recommendation tips.
 */
export const GenerateTipInputSchema = z.object({
  mealLogsSummary: z.string().describe("A multi-line string summarizing the user's meals over the last 7 days, including food items, quantities, CO2e values, and meal types (Breakfast, Lunch, Dinner), formatted day by day."),
});

/**
 * TypeScript type inferred from the GenerateTipInputSchema.
 */
export type GenerateTipInput = z.infer<typeof GenerateTipInputSchema>;

/**
 * Zod schema for the output produced by the weekly/general tip generation AI flow.
 */
export const GenerateTipOutputSchema = z.object({
  tip: z.string().describe('A 1-2 sentence friendly and specific suggestion for reducing carbon footprint based on weekly patterns or general knowledge.'),
});

/**
 * TypeScript type inferred from the GenerateTipOutputSchema.
 */
export type GenerateTipOutput = z.infer<typeof GenerateTipOutputSchema>;


// --- Food Swaps Schemas ---

/**
 * Zod schema for a single food swap suggestion.
 */
export const FoodSwapSchema = z.object({
  originalItem: z.string().describe("The high-impact food item the user commonly eats."),
  suggestedItem: z.string().describe("The lower-impact alternative food item."),
  co2eSavingEstimate: z.string().describe("Estimated CO2e savings, e.g., '15.4 kg CO2e/month' or 'by 70%'."),
  details: z.string().optional().describe("A brief explanation for the suggestion."),
  tryThis: z.boolean().optional().describe("User's intent to try this swap."), 
});

/**
 * TypeScript type inferred from the FoodSwapSchema.
 */
export type FoodSwap = z.infer<typeof FoodSwapSchema>;

/**
 * Zod schema for the input required by the food swaps generation AI flow.
 */
export const GenerateFoodSwapsInputSchema = z.object({
  mealLogsSummary: z.string().describe("A multi-line string summarizing the user's meals over the last 7 days, including food items, quantities, and CO2e values, formatted day by day."),
});

/**
 * TypeScript type inferred from the GenerateFoodSwapsInputSchema.
 */
export type GenerateFoodSwapsInput = z.infer<typeof GenerateFoodSwapsInputSchema>;

/**
 * Zod schema for the output produced by the food swaps generation AI flow.
 */
export const GenerateFoodSwapsOutputSchema = z.object({
  swaps: z.array(FoodSwapSchema).min(1).max(5).describe("A list of 3-5 food swap suggestions."),
});

/**
 * TypeScript type inferred from the GenerateFoodSwapsOutputSchema.
 */
export type GenerateFoodSwapsOutput = z.infer<typeof GenerateFoodSwapsOutputSchema>;


// --- AI Chatbot Schemas ---

/**
 * Zod schema for a single message in the chat history.
 */
export const ChatMessageRoleSchema = z.enum(["user", "model"]);
export const ChatMessagePartSchema = z.object({ text: z.string() });
export const ChatHistoryMessageSchema = z.object({
  role: ChatMessageRoleSchema,
  parts: z.array(ChatMessagePartSchema),
});
export type ChatHistoryMessage = z.infer<typeof ChatHistoryMessageSchema>;


/**
 * Zod schema for the input required by the AI chatbot flow.
 */
export const AskAIChatbotInputSchema = z.object({
  userQuestion: z.string().describe("The user's question about low-carbon eating."),
  mealLogsSummary: z.string().describe("A summary of the user's meal logs from the last 7 days for context."),
  chatHistory: z.array(ChatHistoryMessageSchema).optional().describe("Previous messages in the conversation for context to maintain conversation flow."),
  formattedChatHistory: z.string().optional().describe("A pre-formatted string of the chat history."),
});

/**
 * TypeScript type inferred from the AskAIChatbotInputSchema.
 */
export type AskAIChatbotInput = z.infer<typeof AskAIChatbotInputSchema>;

/**
 * Zod schema for the output produced by the AI chatbot flow.
 */
export const AskAIChatbotOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the user's question."),
});

/**
 * TypeScript type inferred from the AskAIChatbotOutputSchema.
 */
export type AskAIChatbotOutput = z.infer<typeof AskAIChatbotOutputSchema>;


// --- Challenge Generation Schemas ---

// Daily Challenge
export const GenerateDailyChallengeInputSchema = z.object({
  userHistorySummary: z.string().optional().describe("Optional summary of user's recent activity or preferences to tailor the challenge."),
});
export type GenerateDailyChallengeInput = z.infer<typeof GenerateDailyChallengeInputSchema>;

export const GenerateDailyChallengeOutputSchema = z.object({
  description: z.string().describe("The user-facing description of the daily challenge."),
  type: z.enum(['log_plant_based', 'co2e_under_today', 'avoid_red_meat_meal', 'log_three_meals', 'log_low_co2e_meal']).describe("The programmatic type of the challenge for internal logic."),
  targetValue: z.number().optional().describe("Target value for challenges like 'co2e_under_today' (e.g., 2.5 for 2.5kg CO2e) or 'log_low_co2e_meal' (e.g. 0.5 for 0.5kg CO2e)."),
});
export type GenerateDailyChallengeOutput = z.infer<typeof GenerateDailyChallengeOutputSchema>;

// Weekly Challenge
export const GenerateWeeklyChallengeInputSchema = z.object({
  mealLogsSummary: z.string().describe("Summary of user's meal logs for the past 7-14 days to identify patterns and suggest relevant challenges."),
});
export type GenerateWeeklyChallengeInput = z.infer<typeof GenerateWeeklyChallengeInputSchema>;

export const GenerateWeeklyChallengeOutputSchema = z.object({
  description: z.string().describe("The user-facing description of the weekly challenge."),
  type: z.enum(['weekly_co2e_under', 'plant_based_meals_count', 'log_days_count']).describe("The programmatic type of the weekly challenge."),
  targetValue: z.number().describe("Target value for the challenge (e.g., 15 for 15kg CO2e total, 3 for 3 plant-based meals, 5 for logging on 5 days)."),
});
export type GenerateWeeklyChallengeOutput = z.infer<typeof GenerateWeeklyChallengeOutputSchema>;


// --- Carbon Equivalency Schemas ---
export const GenerateCarbonEquivalencyInputSchema = z.object({
  carbonFootprintKgCO2e: z.number().describe("The total carbon footprint of the meal in kg CO2e."),
});
export type GenerateCarbonEquivalencyInput = z.infer<typeof GenerateCarbonEquivalencyInputSchema>;

export const GenerateCarbonEquivalencyOutputSchema = z.object({
  equivalency: z.string().describe("A short, relatable carbon footprint equivalency statement."),
});
export type GenerateCarbonEquivalencyOutput = z.infer<typeof GenerateCarbonEquivalencyOutputSchema>;


// --- Meal Feedback Schemas ---
export const MealImpactLevelSchema = z.enum(['High', 'Medium', 'Low']);
export type MealImpactLevel = z.infer<typeof MealImpactLevelSchema>;

export const GenerateMealFeedbackInputSchema = z.object({
  foodItems: z.array(FoodItemSchema).describe("The list of food items in the meal, potentially with their individual CO2e values."),
  carbonFootprintKgCO2e: z.number().describe("The total carbon footprint of the meal in kg CO2e."),
});
export type GenerateMealFeedbackInput = z.infer<typeof GenerateMealFeedbackInputSchema>;

export const GenerateMealFeedbackOutputSchema = z.object({
  feedbackMessage: z.string().describe("A personalized feedback message based on the meal's carbon impact."),
  impactLevel: MealImpactLevelSchema.describe("The categorized impact level of the meal (High, Medium, or Low)."),
});
export type GenerateMealFeedbackOutput = z.infer<typeof GenerateMealFeedbackOutputSchema>;


// Re-exporting existing weekly tip schemas for clarity, though they are now generalized to GenerateTipInputSchema/OutputSchema
export { GenerateTipInputSchema as GenerateWeeklyTipInputSchema, GenerateTipOutputSchema as GenerateWeeklyTipOutputSchema};
export type { GenerateTipInput as GenerateWeeklyTipInput, GenerateTipOutput as GenerateWeeklyTipOutput };

// Export new types for carbon footprint estimation
export type { EstimateCarbonFootprintInput as EstimateMealCarbonFootprintInput, EstimateCarbonFootprintOutput as EstimateMealCarbonFootprintOutput };
// Export new types for food identification
export type { IdentifyFoodAndQuantitiesInput, IdentifyFoodAndQuantitiesOutput, IdentifiedItem as AIIdentifiedFoodItem };
// Export new types for quantity normalization
export type { NormalizeQuantityToKgInput, NormalizeQuantityToKgOutput };
