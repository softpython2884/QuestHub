'use server';

/**
 * @fileOverview Summarizes project documentation using AI.
 *
 * - summarizeProjectDocumentation - A function that summarizes project documentation.
 * - SummarizeProjectDocumentationInput - The input type for the summarizeProjectDocumentation function.
 * - SummarizeProjectDocumentationOutput - The return type for the summarizeProjectDocumentation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeProjectDocumentationInputSchema = z.object({
  documentation: z
    .string()
    .describe('The project documentation to be summarized.'),
});
export type SummarizeProjectDocumentationInput = z.infer<
  typeof SummarizeProjectDocumentationInputSchema
>;

const SummarizeProjectDocumentationOutputSchema = z.object({
  summary: z.string().describe('The summary of the project documentation.'),
});
export type SummarizeProjectDocumentationOutput = z.infer<
  typeof SummarizeProjectDocumentationOutputSchema
>;

export async function summarizeProjectDocumentation(
  input: SummarizeProjectDocumentationInput
): Promise<SummarizeProjectDocumentationOutput> {
  return summarizeProjectDocumentationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeProjectDocumentationPrompt',
  input: {schema: SummarizeProjectDocumentationInputSchema},
  output: {schema: SummarizeProjectDocumentationOutputSchema},
  prompt: `Summarize the following project documentation: {{{documentation}}}`,
});

const summarizeProjectDocumentationFlow = ai.defineFlow(
  {
    name: 'summarizeProjectDocumentationFlow',
    inputSchema: SummarizeProjectDocumentationInputSchema,
    outputSchema: SummarizeProjectDocumentationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
