
'use server';
/**
 * @fileOverview AI agent for kickstarting a new project.
 *
 * This flow takes a user prompt and generates a comprehensive project plan,
 * including a name, description, and a detailed README file.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const GenerateProjectKickstartInputSchema = z.object({
  prompt: z.string().describe('A prompt from the user describing their project idea.'),
});
export type GenerateProjectKickstartInput = z.infer<typeof GenerateProjectKickstartInputSchema>;

// Output Schema
const GenerateProjectKickstartOutputSchema = z.object({
  name: z.string().describe("A catchy and relevant name for the project."),
  description: z.string().describe("A one-sentence description of the project, suitable for a project list."),
  readmeContent: z.string().describe("A full, well-structured README.md file in Markdown format, including sections like Introduction, Features, Getting Started, etc."),
});
export type GenerateProjectKickstartOutput = z.infer<typeof GenerateProjectKickstartOutputSchema>;

// The main function exported for use in server actions.
export async function generateProjectKickstart(
  input: GenerateProjectKickstartInput
): Promise<GenerateProjectKickstartOutput> {
  return generateProjectKickstartFlow(input);
}

// Genkit Prompt Definition
const prompt = ai.definePrompt({
  name: 'generateProjectKickstartPrompt',
  input: { schema: GenerateProjectKickstartInputSchema },
  output: { schema: GenerateProjectKickstartOutputSchema },
  prompt: `You are an expert project planner and technical writer.
Based on the user's prompt, generate a complete project plan.

Your response MUST be a JSON object that includes three fields:
1.  \`name\`: A creative and concise name for the project.
2.  \`description\`: A single, compelling sentence that describes the project's purpose.
3.  \`readmeContent\`: A detailed, well-formatted README.md file in Markdown. The README should include sections like a project title, a summary, key features, a "Getting Started" guide with potential commands, and a "Technologies Used" section.

User Prompt: {{{prompt}}}
`,
});

// Genkit Flow Definition
const generateProjectKickstartFlow = ai.defineFlow(
  {
    name: 'generateProjectKickstartFlow',
    inputSchema: GenerateProjectKickstartInputSchema,
    outputSchema: GenerateProjectKickstartOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate a project plan.");
    }
    return output;
  }
);

    