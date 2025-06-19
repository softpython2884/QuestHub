
'use server';
/**
 * @fileOverview AI agent for generating document content in Markdown.
 *
 * - generateDocumentContent - A function that generates Markdown content based on a prompt.
 * - GenerateDocumentContentInput - The input type for the generateDocumentContent function.
 * - GenerateDocumentContentOutput - The return type for the generateDocumentContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentContentInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the desired document content.'),
});
export type GenerateDocumentContentInput = z.infer<typeof GenerateDocumentContentInputSchema>;

const GenerateDocumentContentOutputSchema = z.object({
  markdownContent: z
    .string()
    .describe('The generated document content in Markdown format.'),
});
export type GenerateDocumentContentOutput = z.infer<typeof GenerateDocumentContentOutputSchema>;

export async function generateDocumentContent(
  input: GenerateDocumentContentInput
): Promise<GenerateDocumentContentOutput> {
  return generateDocumentContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDocumentContentPrompt',
  input: {schema: GenerateDocumentContentInputSchema},
  output: {schema: GenerateDocumentContentOutputSchema},
  prompt: `You are an expert technical writer and documentation specialist.
Your task is to generate comprehensive and well-structured document content in Markdown format based on the user's prompt.
Ensure the output is clean Markdown, suitable for direct use.
Consider common documentation sections like introduction, usage, examples, API reference (if applicable), troubleshooting, etc., based on the prompt.

User Prompt: {{{prompt}}}

Generated Markdown Content:`,
});

const generateDocumentContentFlow = ai.defineFlow(
  {
    name: 'generateDocumentContentFlow',
    inputSchema: GenerateDocumentContentInputSchema,
    outputSchema: GenerateDocumentContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
