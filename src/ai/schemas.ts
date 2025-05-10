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


// --- Weekly Tip Schemas (can also be used for General Recommendation Tip) ---

/**
 * Zod schema for the input required by the weekly tip generation AI flow.
 * Can also be used for generating general recommendation tips.
 */
export const GenerateTipInputSchema = z.object({
  mealLogsSummary: z.string().describe("A multi-line string summarizing the user's meals over the last 7 days, including food items, quantities, and CO2e values, formatted day by day."),
  // pastTips: z.array(z.string()).optional().describe("An optional list of previously generated tips to avoid repetition."),
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

// Re-exporting existing weekly tip schemas for clarity, though they are now generalized to GenerateTipInputSchema/OutputSchema
export { GenerateTipInputSchema as GenerateWeeklyTipInputSchema, GenerateTipOutputSchema as GenerateWeeklyTipOutputSchema};
export type { GenerateTipInput as GenerateWeeklyTipInput, GenerateTipOutput as GenerateWeeklyTipOutput };
