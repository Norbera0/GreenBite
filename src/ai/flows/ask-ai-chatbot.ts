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
import type { MessageData } from 'genkit';


const chatbotPrompt = ai.definePrompt({
  name: 'askAIChatbotPrompt',
  input: {schema: AskAIChatbotInputSchema},
  output: {schema: AskAIChatbotOutputSchema},
  prompt: `You are a helpful AI assistant for the EcoPlate app, specializing in low-carbon eating.
The user's meal logs for the past 7 days are:
{{{mealLogsSummary}}}

Use this meal data as context to answer the user's questions. Keep your answers concise, friendly, and focused on sustainable food choices.
If the question is unrelated to food, diet, or sustainability, politely state that you can only answer questions on those topics.

{{#if chatHistory}}
Previous conversation:
{{#each chatHistory}}
{{#ifCond this.role "===" "user"}}User: {{this.parts.0.text}}{{/ifCond}}
{{#ifCond this.role "===" "model"}}AI: {{this.parts.0.text}}{{/ifCond}}
{{/each}}
{{/if}}

Current user question: {{{userQuestion}}}

Provide your answer.
`,
  // Helper for conditional rendering in Handlebars based on role
  templateHelpers: {
    ifCond: function (v1: string, operator: string, v2: string, options: any) {
      switch (operator) {
        case '===':
          return v1 === v2 ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    },
  },
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
    // Prepare history for Genkit if present
    const history: MessageData[] | undefined = input.chatHistory?.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({text: p.text})),
    }));

    try {
      // The prompt function itself can handle history if it's part of the input schema and template
      // Alternatively, one could pass history to `ai.generate` directly if not using a pre-defined prompt object that handles it.
      const result = await chatbotPrompt(input, {history}); // Pass history if prompt structure supports it
                                                       // Or, construct prompt with history for ai.generate()
      
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
