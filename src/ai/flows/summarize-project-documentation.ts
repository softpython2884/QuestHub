
'use server';
/**
 * @fileOverview An AI agent for summarizing document content.
 *
 * - summarizeDocumentation - A function that takes text content and returns a concise summary.
 * - SummarizeDocumentationInput - The input type for the function.
 * - SummarizeDocumentationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeDocumentationInputSchema = z.object({
  content: z.string().describe('The document content to be summarized.'),
  title: z.string().optional().describe('The title of the document, for context.'),
});
export type SummarizeDocumentationInput = z.infer<typeof SummarizeDocumentationInputSchema>;

const SummarizeDocumentationOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise, well-structured summary of the document content in Markdown format.'),
});
export type SummarizeDocumentationOutput = z.infer<typeof SummarizeDocumentationOutputSchema>;


export async function summarizeDocumentation(
  input: SummarizeDocumentationInput
): Promise<SummarizeDocumentationOutput> {
  return summarizeDocumentationFlow(input);
}


const prompt = ai.definePrompt({
  name: 'summarizeDocumentationPrompt',
  input: {schema: SummarizeDocumentationInputSchema},
  output: {schema: SummarizeDocumentationOutputSchema},
  prompt: `You are an expert at technical writing and summarization.
Your task is to create a concise, easy-to-read summary of the provided document content.
The summary should be in Markdown format.
Focus on the key points, purpose, and main takeaways of the document.

Document Title (for context): {{{title}}}

Document Content to Summarize:
---
{{{content}}}
---
`,
});

const summarizeDocumentationFlow = ai.defineFlow(
  {
    name: 'summarizeDocumentationFlow',
    inputSchema: SummarizeDocumentationInputSchema,
    outputSchema: SummarizeDocumentationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output?.summary) {
        throw new Error("AI failed to generate a summary.");
    }
    return output;
  }
);
