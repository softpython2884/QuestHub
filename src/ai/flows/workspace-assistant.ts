
'use server';
/**
 * @fileOverview A conversational AI assistant for the FlowUp workspace.
 *
 * - workspaceAssistant - A function that responds to user queries in a conversational context.
 * - WorkspaceAssistantInput - The input type for the workspaceAssistant function.
 * - WorkspaceAssistantOutput - The return type for the workspaceAssistant function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ChatMessage } from '@/types';

const WorkspaceAssistantInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ).describe("The conversation history between the user and the AI assistant."),
});
export type WorkspaceAssistantInput = z.infer<typeof WorkspaceAssistantInputSchema>;

const WorkspaceAssistantOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user's latest message."),
});
export type WorkspaceAssistantOutput = z.infer<typeof WorkspaceAssistantOutputSchema>;

export async function workspaceAssistant(
  input: WorkspaceAssistantInput
): Promise<WorkspaceAssistantOutput> {
  if (input.history.length === 0) {
    return { response: "Hello! I'm Flowy. How can I help you with your workspace today?" };
  }

  const lastUserMessage = input.history[input.history.length - 1];

  // We are using a preview model that might not support system prompts in the same way.
  // We prepend the system instructions to the main prompt for better compatibility.
  const fullPrompt = `System Instructions: You are Flowy, a friendly and extremely helpful AI assistant for the FlowUp project management platform. Your goal is to assist users with their tasks, answer questions about the platform, and help them be more productive. Be concise and clear in your answers. Use markdown for formatting when it improves readability. You can suggest project ideas, summarize text, explain concepts, and help with planning. Start the first conversation by greeting the user and asking how you can help.

User's question: ${lastUserMessage.content}`;

  const llmResponse = await ai.generate({
    prompt: fullPrompt,
    history: input.history.slice(0, -1) as ChatMessage[],
  });

  return { response: llmResponse.text };
}
