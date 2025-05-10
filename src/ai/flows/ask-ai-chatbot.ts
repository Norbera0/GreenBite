
'use server';
/**
 * @fileOverview AI Chatbot for answering questions about low-carbon eating, using user's meal history.
 *
 * - askAIChatbot - A function that handles the chatbot interaction.
 * - AskAIChatbotInput - The input type.
 * - AskAIChatbotOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {
  AskAIChatbotInputSchema,
  type AskAIChatbotInput,
  AskAIChatbotOutputSchema,
  type AskAIChatbotOutput,
} from '@/ai/schemas';
// import type { MessageData } from 'genkit'; // No longer needed for direct history passing


const chatbotPrompt = ai.definePrompt({
  name: 'askAIChatbotPrompt',
  input: {schema: AskAIChatbotInputSchema}, // Will use the updated schema with formattedChatHistory
  output: {schema: AskAIChatbotOutputSchema},
  prompt: `You are a helpful AI assistant for the EcoPlate app, specializing in low-carbon eating.
The user's meal logs for the past 7 days are:
{{{mealLogsSummary}}}

Use this meal data as context to answer the user's questions. Keep your answers concise, friendly, and focused on sustainable food choices.
If the question is unrelated to food, diet, or sustainability, politely state that you can only answer questions on those topics.

{{#if formattedChatHistory}}
Previous conversation:
{{{formattedChatHistory}}}
{{/if}}

Current user question: {{{userQuestion}}}

Provide your answer.
`,
  // templateHelpers removed as ifCond is no longer used
});


// Exported function to be called by the application
export async function askAIChatbot(
  input: AskAIChatbotInput
): Promise<AskAIChatbotOutput> {
  return askAIChatbotFlow(input);
}

// The Genkit flow definition
const askAIChatbotFlow = ai.defineFlow(
  {
    name: 'askAIChatbotFlow',
    inputSchema: AskAIChatbotInputSchema,
    outputSchema: AskAIChatbotOutputSchema,
  },
  async (input) => {
    console.log("Calling askAIChatbotFlow with question:", input.userQuestion);

    let formattedHistoryString = "";
    if (input.chatHistory && input.chatHistory.length > 0) {
      formattedHistoryString = input.chatHistory.map(h => {
        const prefix = h.role === 'user' ? 'User:' : 'AI:';
        // Ensure all parts' text are joined if multiple parts exist, though typically it's one.
        const text = h.parts.map(p => p.text).join(' '); 
        return `${prefix} ${text}`;
      }).join('\n');
    }

    // Prepare the input for the prompt, including the pre-formatted history
    const promptInput: AskAIChatbotInput = {
      ...input,
      formattedChatHistory: formattedHistoryString,
    };

    try {
      const result = await chatbotPrompt(promptInput); 
      
      if (!result.output || !result.output.answer) {
        throw new Error('AI did not return the expected answer format.');
      }
      console.log("AI Chatbot Flow Result:", result.output);
      return result.output;
    } catch (error) {
      console.error("Error in AI chatbot flow:", error);
      return { answer: `I encountered an issue trying to answer that. Please try rephrasing or ask something else. Error: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
);

// Export types for external use
export type { AskAIChatbotInput, AskAIChatbotOutput };
