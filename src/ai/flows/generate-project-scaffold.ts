
'use server';
/**
 * @fileOverview AI agent for generating project file structures and content.
 *
 * - generateProjectScaffold - A function that generates a list of files (path and content) based on a prompt.
 * - GenerateProjectScaffoldInput - The input type for the generateProjectScaffold function.
 * - GenerateProjectScaffoldOutput - The return type for the generateProjectScaffold function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateProjectScaffoldInputSchema = z.object({
  prompt: z.string().describe('A prompt describing the desired project structure and functionality.'),
});
export type GenerateProjectScaffoldInput = z.infer<typeof GenerateProjectScaffoldInputSchema>;

const FileScaffoldSchema = z.object({
  filePath: z.string().describe('The relative path for the file (e.g., "src/index.js" or "README.md").'),
  content: z.string().describe('The content of the file.'),
});

const GenerateProjectScaffoldOutputSchema = z.object({
  files: z.array(FileScaffoldSchema).describe('A list of files with their paths and content.'),
});
export type GenerateProjectScaffoldOutput = z.infer<typeof GenerateProjectScaffoldOutputSchema>;

export async function generateProjectScaffold(
  input: GenerateProjectScaffoldInput
): Promise<GenerateProjectScaffoldOutput> {
  return generateProjectScaffoldFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateProjectScaffoldPrompt',
  input: {schema: GenerateProjectScaffoldInputSchema},
  output: {schema: GenerateProjectScaffoldOutputSchema},
  prompt: `You are an expert software architect and developer. Your task is to generate a complete file structure and content for a small project based on the user's prompt.

User Prompt: {{{prompt}}}

You MUST respond with a JSON object matching the following Zod schema:
\`\`\`json
{
  "files": [
    {
      "filePath": "string (e.g., 'index.html', 'src/app.js', 'styles/main.css')",
      "content": "string (the full content of the file)"
    }
    // ... more files
  ]
}
\`\`\`

Ensure all file paths are relative (e.g., 'index.html', not '/index.html').
Generate appropriate content for each file. For example, if asked for a simple web page, generate HTML, CSS, and JS files.
If the user asks for a Python script, generate the .py file.

Provide the complete project structure as a flat list of files, where \`filePath\` includes any necessary subdirectories.
Example for a simple website:
[
  { "filePath": "index.html", "content": "<!DOCTYPE html>..." },
  { "filePath": "css/style.css", "content": "body { font-family: sans-serif; }" },
  { "filePath": "js/script.js", "content": "console.log('Hello');" }
]

Do not include any explanations or conversational text outside the JSON output.
Focus on creating a functional and logical set of files.
`,
});

const generateProjectScaffoldFlow = ai.defineFlow(
  {
    name: 'generateProjectScaffoldFlow',
    inputSchema: GenerateProjectScaffoldInputSchema,
    outputSchema: GenerateProjectScaffoldOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Ensure the output is not null and adheres to the schema.
    // If output is null or doesn't fit, return an empty files array or throw an error.
    if (!output || !output.files) {
        console.error("AI did not return the expected file structure.");
        return { files: [] };
    }
    return output;
  }
);

