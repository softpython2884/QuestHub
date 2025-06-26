
'use server';
/**
 * @fileOverview A conversational AI assistant for the FlowUp workspace.
 *
 * - workspaceAssistant - A function that responds to user queries in a conversational context.
 * - WorkspaceAssistantInput - The input type for the workspaceAssistant function.
 * - WorkspaceAssistantOutput - The return type for the workspaceAssistant function.
 */

import { ai } from '@/ai/genkit';
import * as genkit from 'genkit';
import { z } from 'genkit';
import type { ChatMessage, Task } from '@/types';
import { getCurrentUserUuid, auth } from '@/lib/authEdge';
import { getProjectsForUser, createTask as dbCreateTask, createProjectAnnouncement as dbCreateProjectAnnouncement, getProjectMemberRole, getTaskByTitleInProject, updateTask as dbUpdateTask, getTasksForProject, getProjectByUuid, getProjectMembers } from '@/lib/db';
import { summarizeDocumentation } from './summarize-project-documentation';

// Schemas for context, input, and output
const WorkspaceContextSchema = z.object({
  pathname: z.string().optional().describe("The user's current URL pathname."),
  projectUuid: z.string().uuid().optional().describe("The UUID of the project the user is currently viewing, if any."),
  projectName: z.string().optional().describe("The name of the project the user is currently viewing, if any."),
  filePath: z.string().optional().describe("The path of the file the user is currently viewing, if any."),
  fileContent: z.string().optional().describe("The content of the file the user is currently viewing, if any."),
});

const WorkspaceAssistantInputSchema = z.object({
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      content: z.string(),
    })
  ).describe("The conversation history between the user and the AI assistant."),
  context: WorkspaceContextSchema.optional(),
});
export type WorkspaceAssistantInput = z.infer<typeof WorkspaceAssistantInputSchema>;

const WorkspaceAssistantOutputSchema = z.object({
  response: z.string().describe("The AI's response to the user's latest message."),
});
export type WorkspaceAssistantOutput = z.infer<typeof WorkspaceAssistantOutputSchema>;

// +++ Tools Definition +++

const listUserProjectsTool = ai.defineTool(
  {
    name: 'listUserProjects',
    description: 'Lists all the projects the current user is a member of.',
    inputSchema: z.object({}),
    outputSchema: z.array(z.object({ uuid: z.string(), name: z.string() })),
  },
  async () => {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) throw new Error("User not authenticated.");
    return getProjectsForUser(userUuid);
  }
);

const listTasksInProjectTool = ai.defineTool(
    {
        name: 'listTasksInProject',
        description: 'Lists all tasks for a given project.',
        inputSchema: z.object({
            projectUuid: z.string().uuid().describe("The UUID of the project to get tasks for."),
        }),
        outputSchema: z.array(z.object({
            title: z.string(),
            status: z.string(),
            assigneeName: z.string().nullable(),
        })),
    },
    async ({ projectUuid }) => {
        const tasks = await getTasksForProject(projectUuid);
        return tasks.map(task => ({
            title: task.title,
            status: task.status,
            assigneeName: task.assigneeName || null,
        }));
    }
);

const getProjectDetailsTool = ai.defineTool(
    {
        name: 'getProjectDetails',
        description: 'Gets details for a specific project, such as its description and members.',
        inputSchema: z.object({
            projectUuid: z.string().uuid().describe("The UUID of the project."),
        }),
        outputSchema: z.object({
            name: z.string(),
            description: z.string().nullable(),
            ownerName: z.string().nullable(),
            members: z.array(z.string()),
        }),
    },
    async ({ projectUuid }) => {
        const project = await getProjectByUuid(projectUuid);
        if (!project) throw new Error("Project not found.");
        const members = await getProjectMembers(projectUuid);
        return {
            name: project.name,
            description: project.description || null,
            ownerName: project.ownerName || null,
            members: members.map(m => m.user?.name || 'Unknown User'),
        };
    }
);


const createTaskInProjectTool = ai.defineTool(
  {
    name: 'createTaskInProject',
    description: 'Creates a new task in a specified project.',
    inputSchema: z.object({
      projectUuid: z.string().uuid().describe("The UUID of the project where the task should be created."),
      title: z.string().describe("The title of the task."),
      description: z.string().optional().describe("An optional description for the task."),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      taskUuid: z.string().uuid(),
      title: z.string(),
    }),
  },
  async ({ projectUuid, title, description }) => {
    const session = await auth();
    if (!session?.user) throw new Error("User not authenticated.");

    const userRole = await getProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      throw new Error(`You do not have permission to create tasks in this project.`);
    }

    const newTask = await dbCreateTask({ projectUuid, title, description, status: 'To Do' });
    return { success: true, taskUuid: newTask.uuid, title: newTask.title };
  }
);

const updateTaskInProjectTool = ai.defineTool(
    {
        name: 'updateTaskInProject',
        description: 'Updates an existing task in a project, for example to add sub-tasks. You MUST provide the full, final markdown content for the sub-tasks.',
        inputSchema: z.object({
            projectUuid: z.string().uuid().describe("The UUID of the project where the task exists."),
            taskTitle: z.string().describe("The exact title of the task to update."),
            newSubTasksMarkdown: z.string().describe("A markdown checklist of sub-tasks, like `- [ ] Sub-task 1`. This will be appended to any existing sub-tasks."),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            updatedTaskTitle: z.string(),
        }),
    },
    async ({ projectUuid, taskTitle, newSubTasksMarkdown }) => {
        const session = await auth();
        if (!session?.user) throw new Error("User not authenticated.");

        const userRole = await getProjectMemberRole(projectUuid, session.user.uuid);
        if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
            throw new Error(`You do not have permission to update tasks in this project.`);
        }

        const taskToUpdate = await getTaskByTitleInProject(projectUuid, taskTitle);
        if (!taskToUpdate) {
            throw new Error(`Task with title "${taskTitle}" not found in this project.`);
        }
        
        const existingSubtasks = taskToUpdate.todoListMarkdown || '';
        const combinedSubtasks = (existingSubtasks ? `${existingSubtasks}\n` : '') + newSubTasksMarkdown;

        const updatedTask = await dbUpdateTask(taskToUpdate.uuid, { todoListMarkdown: combinedSubtasks });
        if (!updatedTask) {
             throw new Error(`Failed to update task "${taskTitle}".`);
        }

        return { success: true, updatedTaskTitle: updatedTask.title };
    }
);


const createProjectAnnouncementTool = ai.defineTool(
  {
    name: 'createProjectAnnouncement',
    description: 'Creates and publishes a new announcement for a specific project.',
    inputSchema: z.object({
      projectUuid: z.string().uuid().describe("The UUID of the project for the announcement."),
      title: z.string().describe("The title of the announcement."),
      content: z.string().describe("The full Markdown content of the announcement."),
    }),
    outputSchema: z.object({ success: z.boolean(), announcementUuid: z.string().uuid() }),
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
    inputSchema: z.object({
      fileContent: z.string().describe("The content of the file to summarize."),
      filePath: z.string().optional().describe("The path of the file, for context.")
    }),
    outputSchema: z.object({ summary: z.string() }),
  },
  async ({ fileContent, filePath }) => {
    return summarizeDocumentation({ content: fileContent, title: filePath });
  }
);

// +++ Main Assistant Flow +++

export async function workspaceAssistant(
  input: WorkspaceAssistantInput
): Promise<WorkspaceAssistantOutput> {
  const flow = ai.defineFlow(
    {
      name: 'workspaceAssistantFlow',
      inputSchema: WorkspaceAssistantInputSchema,
      outputSchema: WorkspaceAssistantOutputSchema,
    },
    async (flowInput) => {
      if (flowInput.history.length === 0) {
        return { response: "Hello! I'm Flowy. How can I help you with your workspace today? You can ask me to list your projects, create tasks, and more." };
      }

      const context = flowInput.context;
      let contextDescription = "The user is currently not on a specific page that provides context.";
      let toolsToUse: any[] = [listUserProjectsTool, createTaskInProjectTool, updateTaskInProjectTool, createProjectAnnouncementTool, listTasksInProjectTool, getProjectDetailsTool];
      const latestMessage = flowInput.history[flowInput.history.length - 1].content;
      let promptWithContext = latestMessage;

      if (context) {
          contextDescription = `The user is currently on the page: '${context.pathname}'.`;
          if (context.projectName) {
              contextDescription += ` They are inside the project named "${context.projectName}" (UUID: ${context.projectUuid}).`;
          }
          if (context.filePath) {
              contextDescription += ` They are viewing the file at path: "${context.filePath}".`;
              toolsToUse.push(summarizeCurrentFileTool);
              promptWithContext = `Considering the file content below, respond to the user's request:
--- FILE CONTENT ---
${context.fileContent}
--------------------
User Request: ${latestMessage}`;
          }
      }

      const user = await auth();
      if (user?.user?.uuid) {
        const userProjects = await getProjectsForUser(user.user.uuid);
        const mentionedProject = userProjects.find(p => latestMessage.toLowerCase().includes(p.name.toLowerCase()));
        if (mentionedProject && !context?.projectUuid) {
          contextDescription += ` The user mentioned the project "${mentionedProject.name}" (UUID: ${mentionedProject.uuid}).`;
        }
      }

      const systemPrompt = `You are Flowy, an intelligent and friendly AI assistant integrated into the FlowUp project management platform. Your purpose is to help users manage their work efficiently by understanding their requests and using available tools to perform actions.

**Your Capabilities (Tools):**
You have access to a set of tools to perform actions. You should decide to use a tool when the user's request matches a tool's capability. Your available tools are:
- \`listUserProjects\`: To list all projects the current user is a member of.
- \`listTasksInProject\`: To list all tasks for a given project. Requires a projectUuid.
- \`getProjectDetails\`: To get more information about a project like its description or members. Requires a projectUuid.
- \`createTaskInProject\`: To create a new task in a specified project. Requires a projectUuid and a title.
- \`updateTaskInProject\`: To update a task, for example by adding sub-tasks. Requires a projectUuid and the task's title. You MUST append to existing sub-tasks if any, not replace them.
- \`createProjectAnnouncement\`: To create an announcement in a project. Requires a projectUuid.
- \`summarizeCurrentFile\`: To summarize the content of the file the user is currently viewing. Requires fileContent.

**Interaction Style & Rules:**
- **Language**: You MUST detect the language of the user's last message and respond in the same language.
- **Context Awareness**: Use the provided context to inform your actions. If the user says "create a task for this project" and the context includes a project UUID, you should use it.
- **Clarification**: If context is missing for an action (e.g., creating a task without a project context), you MUST ask the user for the missing information. Do not guess.
- **Permissions**: Actions are protected by user permissions. If a tool call fails, it's likely due to a permission error. Inform the user clearly and politely.
- **Confirmation**: After a tool is used successfully, confirm the successful outcome to the user. For example: "I've created the task for you." or "OK, I've added those sub-tasks."

**Current User Context:**
${contextDescription}
`;

      try {
        const { text } = await ai.generate({
          model: 'googleai/gemini-2.0-flash',
          prompt: promptWithContext,
          system: systemPrompt,
          history: flowInput.history.slice(0, -1) as ChatMessage[],
          tools: toolsToUse,
        });

        return { response: text };
      } catch (error: any) {
        console.error("[WorkspaceAssistant] Error during AI generation or tool execution:", error);
        let errorMessage = "I encountered an issue and couldn't complete your request.";
        if (error.message) {
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
  );

  return flow(input);
}
