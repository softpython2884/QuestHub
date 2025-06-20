
'use server';
/**
 * @fileOverview AI agent for editing file content.
 *
 * - editFileContentWithAI - A function that modifies existing file content based on a user prompt.
 * - EditFileContentAIInput - The input type for the editFileContentWithAI function.
 * - EditFileContentAIOutput - The return type for the editFileContentWithAI function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const EditFileContentAIInputSchema = z.object({
  currentContent: z.string().describe('The current content of the file.'),
  userPrompt: z.string().describe('A prompt from the user describing the desired changes.'),
});
export type EditFileContentAIInput = z.infer<typeof EditFileContentAIInputSchema>;

export const EditFileContentAIOutputSchema = z.object({
  newContent: z
    .string()
    .describe('The complete, new content of the file after applying the edits.'),
});
export type EditFileContentAIOutput = z.infer<typeof EditFileContentAIOutputSchema>;

export async function editFileContentWithAI(
  input: EditFileContentAIInput
): Promise<EditFileContentAIOutput> {
  return editFileContentAIFlow(input);
}

const prompt = ai.definePrompt({
  name: 'editFileContentAIPrompt',
  input: {schema: EditFileContentAIInputSchema},
  output: {schema: EditFileContentAIOutputSchema},
  prompt: `You are an expert code and text editor.
The user will provide you with the current content of a file and a prompt describing the changes they want to make.
Your task is to return the ENTIRE new content of the file with the requested changes applied.
Do not just provide the changes or a diff. Provide the complete, final file content.

Current File Content:
\`\`\`
{{{currentContent}}}
\`\`\`

User's Edit Request: {{{userPrompt}}}

Return the new, complete file content below:
`,
});

const editFileContentAIFlow = ai.defineFlow(
  {
    name: 'editFileContentAIFlow',
    inputSchema: EditFileContentAIInputSchema,
    outputSchema: EditFileContentAIOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.newContent) {
        // Fallback or error handling if AI doesn't return expected output
        console.error("AI did not return the expected new content for file editing.");
        // Optionally, return original content or throw an error
        return { newContent: input.currentContent }; 
    }
    return output;
  }
);
