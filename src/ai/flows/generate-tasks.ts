
'use server';
/**
 * @fileOverview AI agent for generating a list of tasks for a project.
 *
 * This flow takes a user prompt describing a goal and generates a structured
 * list of tasks, including sub-tasks in Markdown checklist format and relevant tags.
 */

import { ai } from '@/ai/genkit';
import { getProjectTags } from '@/lib/db';
import { z } from 'genkit';

// Input Schema
const GenerateTasksInputSchema = z.object({
  prompt: z.string().describe('A prompt from the user describing a feature, epic, or goal.'),
  projectUuid: z.string().uuid().describe('The UUID of the project to fetch available tags from.'),
});
export type GenerateTasksInput = z.infer<typeof GenerateTasksInputSchema>;

// Schema for a single task
const TaskSchema = z.object({
  title: z.string().describe('A concise, action-oriented title for the task.'),
  description: z.string().optional().describe('A brief, one-sentence description of the task.'),
  todoListMarkdown: z.string().optional().describe('A Markdown checklist of sub-tasks, like `- [ ] Sub-task 1`.'),
  tags: z.array(z.string()).optional().describe('A list of relevant tags for the task, chosen from the available tags.'),
});

// Output Schema: A list of tasks
const GenerateTasksOutputSchema = z.object({
  tasks: z.array(TaskSchema).describe('A list of generated tasks.'),
});
export type GenerateTasksOutput = z.infer<typeof GenerateTasksOutputSchema>;

// The main function exported for use in server actions.
export async function generateTasks(input: GenerateTasksInput): Promise<GenerateTasksOutput> {
  return generateTasksFlow(input);
}

// Genkit Prompt Definition
const prompt = ai.definePrompt({
  name: 'generateTasksPrompt',
  input: { schema: z.object({ prompt: z.string(), availableTags: z.string() }) },
  output: { schema: GenerateTasksOutputSchema },
  prompt: `You are an expert project manager who is excellent at breaking down large goals into actionable tasks.
Based on the user's prompt, generate a list of tasks. For each task, provide a clear title, a short description, an optional checklist of sub-tasks, and relevant tags.

You will be provided a list of available tags for the project. For each task you generate, select a few relevant tags from this list. If no tags seem relevant, you can leave the tags array empty.

**CRITICAL RULE**: The 'todoListMarkdown' field, if used, MUST be a valid GitHub-flavored Markdown checklist.
Each checklist item MUST start with \`- [ ] \` for an open task.
Do NOT use asterisks (\`*\`) or simple hyphens (\`-\`) for the checklist. You MUST use the precise \`- [ ] \` format.

Available Tags: {{availableTags}}

User Prompt: {{{prompt}}}
`,
});

// Genkit Flow Definition
const generateTasksFlow = ai.defineFlow(
  {
    name: 'generateTasksFlow',
    inputSchema: GenerateTasksInputSchema,
    outputSchema: GenerateTasksOutputSchema,
  },
  async (input) => {
    const tags = await getProjectTags(input.projectUuid);
    const tagNames = tags.map(t => t.name);

    const { output } = await prompt({
        prompt: input.prompt,
        availableTags: tagNames.join(', '),
    });

    if (!output || !output.tasks) {
      throw new Error("AI failed to generate tasks.");
    }
    return output;
  }
);
