
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
import { getCurrentUserUuid, auth } from '@/lib/authEdge';
import { getProjectsForUser, getProjectByUuid, createTask as dbCreateTask, createProjectAnnouncement as dbCreateProjectAnnouncement, getProjectMemberRole } from '@/lib/db';
import { summarizeDocumentation } from './summarize-project-documentation';
import { run } from 'genkit';

// Schemas for context, input, and output
const WorkspaceContextSchema = z.object({
  pathname: z.string().optional().describe("The user's current URL pathname."),
  projectUuid: z.string().uuid().optional().describe("The UUID of the project the user is currently viewing, if any."),
  projectName: z.string().optional().describe("The name of the project the user is currently viewing, if any."),
  filePath: z.string().optional().describe("The path of the file the user is currently viewing, if any."),
  fileContent: z.string().optional().describe("The content of the file the user is currently viewing, if any."),
});

export const WorkspaceAssistantInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ).describe("The conversation history between the user and the AI assistant."),
  context: WorkspaceContextSchema.optional(),
});
export type WorkspaceAssistantInput = z.infer<typeof WorkspaceAssistantInputSchema>;

export const WorkspaceAssistantOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user's latest message."),
});
export type WorkspaceAssistantOutput = z.infer<typeof WorkspaceAssistantOutputSchema>;

// +++ Tools Definition +++

const listUserProjectsTool = ai.defineTool(
  {
    name: 'listUserProjects',
    description: 'Lists all the projects the current user is a member of.',
    input: z.object({}),
    output: z.array(z.object({ uuid: z.string(), name: z.string() })),
  },
  async () => {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) throw new Error("User not authenticated.");
    return getProjectsForUser(userUuid);
  }
);

const createTaskInProjectTool = ai.defineTool(
  {
    name: 'createTaskInProject',
    description: 'Creates a new task in a specified project.',
    input: z.object({
      projectName: z.string().describe("The name of the project where the task should be created. If not provided, the AI should use the project from the current context or ask the user."),
      title: z.string().describe("The title of the task."),
      description: z.string().optional().describe("An optional description for the task."),
    }),
    output: z.object({
      success: z.boolean(),
      taskUuid: z.string().uuid(),
      title: z.string(),
    }),
  },
  async ({ projectName, title, description }, { context }) => {
    const session = await auth();
    if (!session?.user) throw new Error("User not authenticated.");

    const projects = await getProjectsForUser(session.user.uuid);
    const project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
    if (!project) throw new Error(`Project "${projectName}" not found or you are not a member.`);

    const userRole = await getProjectMemberRole(project.uuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      throw new Error(`You do not have permission to create tasks in the project "${projectName}".`);
    }

    const newTask = await dbCreateTask({ projectUuid: project.uuid, title, description, status: 'To Do' });
    return { success: true, taskUuid: newTask.uuid, title: newTask.title };
  }
);

const createProjectAnnouncementTool = ai.defineTool(
  {
    name: 'createProjectAnnouncement',
    description: 'Creates and publishes a new announcement for a specific project.',
    input: z.object({
      projectUuid: z.string().uuid().describe("The UUID of the project for the announcement."),
      title: z.string().describe("The title of the announcement."),
      content: z.string().describe("The full Markdown content of the announcement."),
    }),
    output: z.object({ success: z.boolean(), announcementUuid: z.string().uuid() }),
  },
  async ({ projectUuid, title, content }) => {
    const session = await auth();
    if (!session?.user) throw new Error("User not authenticated.");

    const userRole = await getProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      throw new Error("You do not have permission to create announcements in this project.");
    }

    const newAnnouncement = await dbCreateProjectAnnouncement({ projectUuid, authorUuid: session.user.uuid, title, content });
    return { success: true, announcementUuid: newAnnouncement.uuid };
  }
);

const summarizeCurrentFileTool = ai.defineTool(
  {
    name: 'summarizeCurrentFile',
    description: 'Summarizes the content of the file the user is currently viewing. Fails if the user is not viewing a file.',
    input: z.object({}),
    output: z.object({ summary: z.string() }),
  },
  async (_, { context }) => {
    const flowContext = context as WorkspaceAssistantInput['context'];
    if (!flowContext?.fileContent) {
      throw new Error("I can't summarize because you are not currently viewing a file. Please navigate to a file in the CodeSpace.");
    }
    return summarizeDocumentation({ content: flowContext.fileContent, title: flowContext.filePath });
  }
);

// +++ Main Assistant Flow +++
export async function workspaceAssistant(input: WorkspaceAssistantInput): Promise<WorkspaceAssistantOutput> {
  if (input.history.length === 0) {
    return { response: "Hello! I'm Flowy. How can I help you with your workspace today? You can ask me to list your projects, create tasks, and more." };
  }

  const context = input.context;
  let contextDescription = "The user is currently not on a specific page that provides context.";
  if (context) {
    contextDescription = `The user is currently on the page: '${context.pathname}'.`;
    if (context.projectName) {
      contextDescription += ` They are inside the project named "${context.projectName}" (UUID: ${context.projectUuid}).`;
    }
    if (context.filePath) {
      contextDescription += ` They are viewing the file at path: "${context.filePath}".`;
    }
  }

  const systemPrompt = `You are Flowy, an intelligent and friendly AI assistant integrated into the FlowUp project management platform. Your purpose is to help users manage their work efficiently.

**Your Capabilities (Tools):**
You have access to a set of tools to perform actions on behalf of the user. You should decide to use a tool when the user's request matches a tool's capability. Your available tools are:
- \`listUserProjects\`: To list all projects the current user is a member of.
- \`createTaskInProject\`: To create a new task in a specified project.
- \`createProjectAnnouncement\`: To create an announcement in a project.
- \`summarizeCurrentFile\`: To summarize the content of the file the user is currently viewing.

**Context Awareness & Permissions:**
- You will be provided with the user's current context. Use this to inform your actions. For example, if they say "create a task for this project", use the project from the context.
- If context is missing for an action (e.g., creating a task without a project context), you MUST ask the user for the missing information.
- Actions are protected by user permissions. If a tool fails because of permissions, inform the user clearly and politely.

**Interaction Style:**
- Be concise and helpful. Use markdown for formatting when it improves readability.
- Before using a tool that makes a significant change (like creating a task or announcement), briefly confirm the action with the user unless their request is very explicit. For example: "Okay, creating a task titled 'X' in project 'Y'. Is that correct?"
- After a tool is used successfully, confirm the successful outcome to the user. For example: "I've created the task for you."

**Current User Context:**
${contextDescription}
`;

  try {
    const { text } = await run('workspace-assistant-run', { context: input.context }, async () =>
      ai.generate({
        model: 'googleai/gemini-2.0-flash',
        prompt: input.history[input.history.length - 1].content,
        system: systemPrompt,
        history: input.history.slice(0, -1) as ChatMessage[],
        tools: [listUserProjectsTool, createTaskInProjectTool, createProjectAnnouncementTool, summarizeCurrentFileTool],
      })
    );

    return { response: text };
  } catch (error: any) {
    console.error("[WorkspaceAssistant] Error during AI generation or tool execution:", error);
    // Provide a user-friendly error message
    let errorMessage = "I encountered an issue and couldn't complete your request.";
    if (error.message) {
        // Sanitize error messages before showing to user.
        if (error.message.includes("User not authenticated")) {
            errorMessage = "It seems you're not authenticated. Please log in.";
        } else if (error.message.includes("not found or you are not a member")) {
            errorMessage = `I couldn't find the project you mentioned, or you might not be a member of it.`;
        } else if (error.message.includes("permission")) {
            errorMessage = `It looks like you don't have the required permissions for that action. ${error.message}`;
        } else {
             errorMessage = `An error occurred: ${error.message}`;
        }
    }
    return { response: errorMessage };
  }
}
