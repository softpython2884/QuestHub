
'use server';
/**
 * @fileOverview AI agent for generating a list of tasks for a project.
 *
 * This flow takes a user prompt describing a goal and generates a structured
 * list of tasks, including sub-tasks in Markdown checklist format.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const GenerateTasksInputSchema = z.object({
  prompt: z.string().describe('A prompt from the user describing a feature, epic, or goal.'),
});
export type GenerateTasksInput = z.infer<typeof GenerateTasksInputSchema>;

// Schema for a single task
const TaskSchema = z.object({
  title: z.string().describe('A concise, action-oriented title for the task.'),
  description: z.string().optional().describe('A brief, one-sentence description of the task.'),
  todoListMarkdown: z.string().optional().describe('A Markdown checklist of sub-tasks, like `- [ ] Sub-task 1`.'),
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
  input: { schema: GenerateTasksInputSchema },
  output: { schema: GenerateTasksOutputSchema },
  prompt: `You are an expert project manager who is excellent at breaking down large goals into actionable tasks.
Based on the user's prompt, generate a list of tasks. For each task, provide a clear title, a short description, and a checklist of sub-tasks.

**CRITICAL**: The 'todoListMarkdown' field MUST be a valid Markdown checklist. Each item must start with \`- [ ] \` for an open task.

Example of a good sub-task list in the 'todoListMarkdown' field:
- [ ] Design the database schema for users.
- [ ] Implement user registration endpoint.
- [ ] Add password hashing.

Do NOT use asterisks (\`*\`) or simple hyphens (\`-\`) for the checklist. Use exactly the \`- [ ] \` format.

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
    const { output } = await prompt(input);
    if (!output || !output.tasks) {
      throw new Error("AI failed to generate tasks.");
    }
    return output;
  }
);
