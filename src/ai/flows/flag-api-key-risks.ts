
'use server';

/**
 * @fileOverview AI agent to flag potential API key risks in text.
 * THIS FLOW IS CURRENTLY NOT USED AND HAS BEEN REMOVED FROM ACTIVE CODE.
 *
 * - flagApiKeyRisks - A function that analyzes text for potential API keys and flags them.
 * - FlagApiKeyRisksInput - The input type for the flagApiKeyRisks function.
 * - FlagApiKeyRisksOutput - The return type for the flagApiKeyRisks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlagApiKeyRisksInputSchema = z.object({
  text: z
    .string()
    .describe('The text to analyze for potential API keys or secrets.'),
});
export type FlagApiKeyRisksInput = z.infer<typeof FlagApiKeyRisksInputSchema>;

const FlagApiKeyRisksOutputSchema = z.object({
  flagged: z
    .boolean()
    .describe(
      'Whether the input text is flagged as potentially containing an API key or secret.'
    ),
  reason: z
    .string()
    .optional()
    .describe(
      'The reason the text was flagged, detailing the potential API key patterns found.'
    ),
});
export type FlagApiKeyRisksOutput = z.infer<typeof FlagApiKeyRisksOutputSchema>;

export async function flagApiKeyRisks(input: FlagApiKeyRisksInput): Promise<FlagApiKeyRisksOutput> {
  // This flow is disabled. Returning a non-flagged response.
  // return flagApiKeyRisksFlow(input);
  return { flagged: false };
}

const prompt = ai.definePrompt({
  name: 'flagApiKeyRisksPrompt',
  input: {schema: FlagApiKeyRisksInputSchema},
  output: {schema: FlagApiKeyRisksOutputSchema},
  prompt: `You are a security expert analyzing text for potential API keys or secrets.

  Your task is to determine if the given text contains any patterns resembling API keys, secret keys, or other sensitive information that should be stored securely.

  Respond with flagged: true if you detect any potential API keys or secrets, and provide a reason explaining what patterns you found.
  Otherwise, respond with flagged: false.

  Text to analyze: {{{text}}}
  `,
});

const flagApiKeyRisksFlow = ai.defineFlow(
  {
    name: 'flagApiKeyRisksFlow',
    inputSchema: FlagApiKeyRisksInputSchema,
    outputSchema: FlagApiKeyRisksOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

