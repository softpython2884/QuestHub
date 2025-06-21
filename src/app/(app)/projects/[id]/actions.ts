
'use server';

import type { Project, ProjectMember, ProjectMemberRole, Task, TaskStatus, Tag, Document as ProjectDocumentType, Announcement as ProjectAnnouncement, UserGithubOAuthToken, GithubRepoContentItem, User } from '@/types';
import {
  getProjectByUuid as dbGetProjectByUuid,
  getUserByUuid as dbGetUserByUuid,
  updateProjectDetails as dbUpdateProjectDetails,
  addProjectMember as dbAddProjectMember,
  getProjectMembers as dbGetProjectMembers,
  getUserByEmail as dbGetUserByEmail,
  removeProjectMember as dbRemoveProjectMember,
  getProjectMemberRole as dbGetProjectMemberRole,
  createTask as dbCreateTask,
  getTasksForProject as dbGetTasksForProject,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  getProjectTags as dbGetProjectTags,
  updateProjectReadme as dbUpdateProjectReadme,
  updateProjectUrgency as dbUpdateProjectUrgency,
  updateProjectVisibility as dbUpdateProjectVisibility,
  toggleTaskPinStatus as dbToggleTaskPinStatus,
  createProjectTag as dbCreateProjectTag,
  deleteProjectTag as dbDeleteProjectTag,
  createDocument as dbCreateDocument,
  getDocumentsForProject as dbGetDocumentsForProject,
  updateDocumentContent as dbUpdateDocumentContent,
  deleteDocument as dbDeleteDocument,
  getDocumentByUuid as dbGetDocumentByUuid,
  createProjectAnnouncement as dbCreateProjectAnnouncement,
  getProjectAnnouncements as dbGetProjectAnnouncements,
  deleteProjectAnnouncement as dbDeleteProjectAnnouncement,
  updateProjectGithubRepo as dbUpdateProjectGithubRepo,
  getUserGithubOAuthToken as dbGetUserGithubOAuthToken,
  deleteUserGithubOAuthToken as dbDeleteUserGithubOAuthToken,
  getTaskByUuid as dbGetTaskByUuid,
  updateProjectDiscordSettings as dbUpdateProjectDiscordSettings,
  deleteProject as dbDeleteProject,
} from '@/lib/db';
import { z } from 'zod';
import { auth } from '@/lib/authEdge';
import { Octokit } from 'octokit';
import { Buffer } from 'buffer';
import { generateProjectScaffold, type GenerateProjectScaffoldInput, type GenerateProjectScaffoldOutput } from '@/ai/flows/generate-project-scaffold';
import { editFileContentWithAI, type EditFileContentAIInput, type EditFileContentAIOutput } from '@/ai/flows/edit-file-content-ai';
import { sendDiscordNotification } from '@/lib/discord';


export async function fetchProjectAction(uuid: string | undefined): Promise<Project | null> {
  if (!uuid) return null;
  try {
    const project = await dbGetProjectByUuid(uuid);
    if (!project) return null;
    return project;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
}

export async function fetchProjectOwnerNameAction(ownerUuid: string | undefined): Promise<string | null> {
  if (!ownerUuid) return null;
  const owner = await dbGetUserByUuid(ownerUuid);
  return owner?.name || null;
}

const UpdateProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters.").max(100),
  description: z.string().max(5000, "Description cannot exceed 5000 characters.").optional().or(z.literal('')),
  projectUuid: z.string().uuid("Invalid project UUID."),
});

export async function updateProjectAction(
  prevState: { error?: string; errors?: Record<string, string[] | undefined>; message?: string },
  formData: FormData
): Promise<{ error?: string; errors?: Record<string, string[] | undefined>; message?: string; project?: Project }> {
  const session = await auth();
  if (!session?.user?.uuid) {
     console.error("[updateProjectAction] Authentication required. No session user UUID.");
     return { error: "Authentication required." };
  }
  console.log("[updateProjectAction] Authenticated user:", session.user.uuid);


  const validatedFields = UpdateProjectSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    projectUuid: formData.get('projectUuid'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { projectUuid, name, description } = validatedFields.data;

  try {
    const project = await dbGetProjectByUuid(projectUuid);
    if (!project) return { error: "Project not found." };

    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[updateProjectAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
        return { error: `You do not have permission to edit this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }
    const updatedProject = await dbUpdateProjectDetails(projectUuid, name, description || undefined);
    if (!updatedProject) {
      return { error: 'Failed to update project or project not found.' };
    }
    return { message: 'Project updated successfully!', project: updatedProject };
  } catch (error: any) {
    console.error('Failed to update project (server action):', error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}


export interface InviteUserFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  invitedMember?: ProjectMember;
}

const InviteUserSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  email: z.string().email("Invalid email address."),
  role: z.enum(['co-owner', 'editor', 'viewer'] as [ProjectMemberRole, ...ProjectMemberRole[]]),
});


export async function inviteUserToProjectAction(
  prevState: InviteUserFormState,
  formData: FormData
): Promise<InviteUserFormState> {
  const session = await auth();
  if (!session?.user?.uuid || !session.user.name) {
    console.error("[inviteUserToProjectAction] Authentication required. No session user UUID or name.");
    return { error: "Authentication required." };
  }
  const inviterUserUuid = session.user.uuid;
  const inviterName = session.user.name;

  const validatedFields = InviteUserSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    email: formData.get('emailToInvite'),
    role: formData.get('roleToInvite'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  const { projectUuid, email, role } = validatedFields.data;

  try {
    const project = await dbGetProjectByUuid(projectUuid);
    if (!project) return { error: "Project not found." };

    const inviterRole = await dbGetProjectMemberRole(projectUuid, inviterUserUuid);
     if (!inviterRole || !['owner', 'co-owner'].includes(inviterRole)) {
      return { error: `You do not have permission to invite users to this project. Your role: ${inviterRole || 'not a member'}. UUID: ${inviterUserUuid}` };
    }

    const userToInvite = await dbGetUserByEmail(email);
    if (!userToInvite) {
      return { error: "User with this email not found." };
    }

    if (userToInvite.uuid === project.ownerUuid && role !== 'owner') {
      return { error: "Cannot change the project owner's role through invitation. Ownership must be transferred explicitly."};
    }
    if (userToInvite.uuid === project.ownerUuid && role === 'owner') {
      return { error: "This user is already the project owner."};
    }

    const currentMembers = await dbGetProjectMembers(projectUuid);
    const existingMembership = currentMembers.find(member => member.userUuid === userToInvite.uuid);

    if (existingMembership && existingMembership.role === role) {
      return { error: `${userToInvite.name} is already a ${role} in this project.` };
    }

    const newOrUpdatedMember = await dbAddProjectMember(projectUuid, userToInvite.uuid, role);
    if (!newOrUpdatedMember) {
        return { error: "Failed to add or update user in the project."};
    }

    let githubMessage = "";
    if (project.githubRepoName && project.githubRepoUrl) {
      console.log("[inviteUserToProjectAction] Project is linked to GitHub. Attempting to add collaborator.");
      const inviterOAuthToken = await dbGetUserGithubOAuthToken(inviterUserUuid);
      
      let invitedUserGithubLogin: string | undefined;
      const invitedUserOAuthDetails = await fetchGithubUserDetailsAction(userToInvite.uuid); // Fetch details for invited user
      if (invitedUserOAuthDetails?.login) {
         invitedUserGithubLogin = invitedUserOAuthDetails.login;
         console.log(`[inviteUserToProjectAction] Fetched GitHub login for invited user: ${invitedUserGithubLogin}`);
      } else {
          console.log(`[inviteUserToProjectAction] Invited user ${userToInvite.email} has not connected their GitHub account or login not found.`);
      }


      if (inviterOAuthToken?.accessToken && invitedUserGithubLogin) {
        const octokit = new Octokit({ auth: inviterOAuthToken.accessToken });
        const [owner, repo] = project.githubRepoName.split('/');
        if (owner && repo) {
          try {
            let githubPermission: 'pull' | 'push' | 'admin' | 'maintain' | 'triage' = 'pull'; 
            if (role === 'editor' || role === 'co-owner') githubPermission = 'push'; 
            if (role === 'owner' && project.ownerUuid !== userToInvite.uuid) githubPermission = 'admin'; 
            
            await octokit.rest.repos.addCollaborator({
              owner,
              repo,
              username: invitedUserGithubLogin,
              permission: githubPermission,
            });
            githubMessage = ` User also invited as a collaborator to the GitHub repository with '${githubPermission}' permission.`;
            console.log(`[inviteUserToProjectAction] Successfully added ${invitedUserGithubLogin} to ${owner}/${repo} with ${githubPermission} permission.`);
          } catch (githubError: any) {
            githubMessage = ` Failed to add user to GitHub repository: ${githubError.message}. Please add them manually if needed.`;
            console.error(`[inviteUserToProjectAction] Error adding collaborator to GitHub: ${githubError.status} ${githubError.message}`, githubError.response?.data);
          }
        } else {
            githubMessage = " Could not determine GitHub repository owner/name to add collaborator.";
            console.warn("[inviteUserToProjectAction] Invalid project.githubRepoName format:", project.githubRepoName);
        }
      } else if (!inviterOAuthToken?.accessToken) {
        githubMessage = " Inviter has not connected their GitHub account, cannot add collaborator to repository.";
        console.warn("[inviteUserToProjectAction] Inviter has no GitHub OAuth token.");
      } else if (!invitedUserGithubLogin) {
         githubMessage = ` Invited user (${userToInvite.email}) has not connected their GitHub account or their GitHub login could not be determined. Cannot add as collaborator automatically.`;
         console.warn("[inviteUserToProjectAction] Could not determine GitHub login for invited user.");
      }
    }

    if (project.discordWebhookUrl && project.discordNotificationsEnabled && project.discordNotifyMembers) {
      await sendDiscordNotification(project.discordWebhookUrl, {
        embeds: [{
          title: "👥 New Member Invited",
          description: `**${userToInvite.name}** was invited to the project as a **${role}** by **${inviterName}**.`,
          color: 3447003, // Blue
          timestamp: new Date().toISOString(),
          footer: { text: `Project: ${project.name}` }
        }]
      });
    }

    return { message: `${userToInvite.name} has been successfully ${existingMembership ? 'updated to role' : 'invited as'} ${role}.${githubMessage}`, invitedMember: newOrUpdatedMember };
  } catch (error: any) {
    console.error("Error inviting user:", error);
    return { error: error.message || "An unexpected error occurred while inviting the user." };
  }
}


export async function fetchProjectMembersAction(projectUuid: string | undefined): Promise<ProjectMember[]> {
  if (!projectUuid) return [];
  try {
    return await dbGetProjectMembers(projectUuid);
  } catch (error) {
    console.error("Failed to fetch project members:", error);
    return [];
  }
}

export async function removeUserFromProjectAction(projectUuid: string, userUuidToRemove: string): Promise<{success?: boolean, error?: string, message?: string}> {
    const session = await auth();
    if (!session?.user?.uuid) {
      console.error("[removeUserFromProjectAction] Authentication required. No session user UUID.");
      return { error: "Authentication required." };
    }
     console.log("[removeUserFromProjectAction] Authenticated user for permission check:", session.user.uuid);


    if (!projectUuid || !userUuidToRemove) {
        return { error: "Project UUID and User UUID are required." };
    }
    try {
        const project = await dbGetProjectByUuid(projectUuid);
        if (!project) return { error: "Project not found." };

        const removerRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
        console.log(`[removeUserFromProjectAction] Remover role check for project ${projectUuid} (user ${session.user.uuid}): ${removerRole}`);
        if (!removerRole || !['owner', 'co-owner'].includes(removerRole)) {
            return { error: `You do not have permission to remove users from this project. Your role: ${removerRole || 'not a member'}. UUID: ${session.user.uuid}` };
        }
        if (project.ownerUuid === userUuidToRemove) {
            return { error: "Project owner cannot be removed. Transfer ownership first." };
        }

        const success = await dbRemoveProjectMember(projectUuid, userUuidToRemove);
        if (success) {
            return { success: true, message: "User removed from project successfully." };
        }
        return { error: "Failed to remove user from project." };
    } catch (error: any)
{
        console.error("Error removing user from project:", error);
        return { error: error.message || "An unexpected error occurred." };
    }
}


// Task Actions
const CreateTaskSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255),
  description: z.string().optional(),
  todoListMarkdown: z.string().optional().default(''),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
  assigneeUuid: z.string().uuid("Invalid Assignee UUID format.").optional().or(z.literal('')),
  tagsString: z.string().optional(),
});

export interface CreateTaskFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  createdTask?: Task;
}

export async function createTaskAction(prevState: CreateTaskFormState, formData: FormData): Promise<CreateTaskFormState> {
  const session = await auth();
  if (!session?.user?.uuid || !session.user.name) {
    console.error("[createTaskAction] Authentication required. No session user UUID or name.");
    return { error: "Authentication required." };
  }
  const creatorName = session.user.name;

  const validatedFields = CreateTaskSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    description: formData.get('description') || '',
    todoListMarkdown: formData.get('todoListMarkdown') || '',
    status: formData.get('status'),
    assigneeUuid: formData.get('assigneeUuid') || '',
    tagsString: formData.get('tagsString'),
  });

  if (!validatedFields.success) {
    console.error("[createTaskAction] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { projectUuid, title, description, todoListMarkdown, status, assigneeUuid: rawAssigneeUuid, tagsString } = validatedFields.data;

  let finalAssigneeUuid: string | null = null;
  if (rawAssigneeUuid && rawAssigneeUuid !== '' && rawAssigneeUuid !== '__UNASSIGNED__') {
    finalAssigneeUuid = rawAssigneeUuid;
  }

  try {
    const project = await dbGetProjectByUuid(projectUuid);
    if (!project) return { error: "Project not found." };
    
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to create tasks in this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }

    const taskData = {
      projectUuid,
      title,
      description: description || undefined,
      todoListMarkdown: todoListMarkdown || undefined,
      status,
      assigneeUuid: finalAssigneeUuid,
      tagsString: tagsString || undefined,
    };
    const createdTask = await dbCreateTask(taskData);

    if (project.discordWebhookUrl && project.discordNotificationsEnabled && project.discordNotifyTasks) {
      await sendDiscordNotification(project.discordWebhookUrl, {
        embeds: [{
          title: `✅ New Task Created: ${createdTask.title}`,
          description: `A new task has been added by **${creatorName}**.`,
          color: 5763719, // Green
          fields: [
            { name: "Status", value: createdTask.status, inline: true },
            { name: "Assigned To", value: createdTask.assigneeName || "Everyone", inline: true },
          ],
          timestamp: new Date().toISOString(),
          footer: { text: `Project: ${project.name}` }
        }]
      });
    }

    return { message: "Task created successfully!", createdTask };
  } catch (error: any) {
    console.error("Error creating task:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function fetchTasksAction(projectUuid: string | undefined): Promise<Task[]> {
  if (!projectUuid) return [];
  try {
    return await dbGetTasksForProject(projectUuid);
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
    return [];
  }
}


export interface UpdateTaskFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  updatedTask?: Task;
}

const UpdateTaskSchema = z.object({
  taskUuid: z.string().uuid("Invalid task UUID."),
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255).optional(),
  description: z.string().optional(),
  todoListMarkdown: z.string().optional().default(''),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]).optional(),
  assigneeUuid: z.string().uuid("Invalid Assignee UUID format.").optional().or(z.literal('')),
  tagsString: z.string().optional(),
});


export async function updateTaskAction(prevState: UpdateTaskFormState, formData: FormData): Promise<UpdateTaskFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[updateTaskAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
   console.log("[updateTaskAction] Authenticated user for permission check:", session.user.uuid);

  const validatedFields = UpdateTaskSchema.safeParse({
    taskUuid: formData.get('taskUuid'),
    projectUuid: formData.get('projectUuid'),
    title: formData.has('title') ? formData.get('title') : undefined,
    description: formData.has('description') ? (formData.get('description') || '') : undefined,
    todoListMarkdown: formData.has('todoListMarkdown') ? (formData.get('todoListMarkdown') || '') : undefined,
    status: formData.has('status') ? formData.get('status') : undefined,
    assigneeUuid: formData.has('assigneeUuid') ? (formData.get('assigneeUuid') || '') : undefined,
    tagsString: formData.has('tagsString') ? formData.get('tagsString') : undefined,
  });

  if (!validatedFields.success) {
    console.error("[updateTaskAction] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { taskUuid, projectUuid, ...taskUpdateData } = validatedFields.data;

  let finalAssigneeUuid: string | null | undefined = taskUpdateData.assigneeUuid;
  if (taskUpdateData.assigneeUuid === '__UNASSIGNED__') {
    finalAssigneeUuid = null;
  } else if (taskUpdateData.assigneeUuid === '') {
    finalAssigneeUuid = undefined; 
  }


  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[updateTaskAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);

    const canUpdateStatusOnly = userRole && !['owner', 'co-owner', 'editor'].includes(userRole);
    const canUpdateFull = userRole && ['owner', 'co-owner', 'editor'].includes(userRole);

    if (!canUpdateFull && !canUpdateStatusOnly) {
       return { error: `You do not have permission to update tasks in this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }

    const dataToUpdate: Partial<Omit<Task, 'uuid' | 'projectUuid' | 'createdAt' | 'updatedAt' | 'tags' | 'assigneeName'>> & { tagsString?: string } = {};

    if (canUpdateFull) {
        if (taskUpdateData.title !== undefined) dataToUpdate.title = taskUpdateData.title;
        if (taskUpdateData.description !== undefined) dataToUpdate.description = taskUpdateData.description || undefined;
        if (taskUpdateData.todoListMarkdown !== undefined) dataToUpdate.todoListMarkdown = taskUpdateData.todoListMarkdown || undefined;
        if (finalAssigneeUuid !== undefined) dataToUpdate.assigneeUuid = finalAssigneeUuid; 
        if (taskUpdateData.tagsString !== undefined) dataToUpdate.tagsString = taskUpdateData.tagsString || undefined;
    }

    if (taskUpdateData.status !== undefined) dataToUpdate.status = taskUpdateData.status;


    if (Object.keys(dataToUpdate).length === 0) {
        const currentTaskData = await dbGetTaskByUuid(taskUuid);
        return { message: "No changes to update.", updatedTask: currentTaskData || undefined };
    }

    const updatedTask = await dbUpdateTask(taskUuid, dataToUpdate);
    if (!updatedTask) {
      return { error: "Failed to update task."};
    }
    return { message: "Task updated successfully!", updatedTask };
  } catch (error: any) {
    console.error("Error updating task:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export interface DeleteTaskFormState {
    message?: string;
    error?: string;
}

export async function deleteTaskAction(prevState: DeleteTaskFormState, formData: FormData): Promise<DeleteTaskFormState> {
    const session = await auth();
    if (!session?.user?.uuid) {
      console.error("[deleteTaskAction] Authentication required. No session user UUID.");
      return { error: "Authentication required." };
    }
    console.log("[deleteTaskAction] Authenticated user for permission check:", session.user.uuid);

    const taskUuid = formData.get('taskUuid') as string;
    const projectUuid = formData.get('projectUuid') as string;

    if (!taskUuid || !projectUuid) {
        return { error: "Task UUID and Project UUID are required."};
    }

    try {
        const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
        console.log(`[deleteTaskAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
        if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
            return { error: `You do not have permission to delete tasks in this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
        }
        const success = await dbDeleteTask(taskUuid);
        if (success) {
            return { message: "Task deleted successfully." };
        }
        return { error: "Failed to delete task." };
    } catch (error: any) {
        console.error("Error deleting task:", error);
        return { error: error.message || "An unexpected error occurred." };
    }
}


// Tag Actions
export async function fetchProjectTagsAction(projectUuid: string): Promise<Tag[]> {
  if (!projectUuid) return [];
  try {
    return await dbGetProjectTags(projectUuid);
  } catch (error) {
    console.error("Failed to fetch project tags:", error);
    return [];
  }
}

export interface CreateProjectTagFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  createdTag?: Tag;
}

const CreateProjectTagSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  tagName: z.string().min(1, "Tag name is required.").max(50, "Tag name too long."),
  tagColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format. Must be #RRGGBB."),
});

export async function createProjectTagAction(prevState: CreateProjectTagFormState, formData: FormData): Promise<CreateProjectTagFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[createProjectTagAction] Authentication required.");
    return { error: "Authentication required." };
  }

  const validatedFields = CreateProjectTagSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    tagName: formData.get('tagName'),
    tagColor: formData.get('tagColor'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { projectUuid, tagName, tagColor } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      return { error: "You do not have permission to create tags for this project." };
    }

    const existingTag = await dbGetProjectTags(projectUuid).then(tags => tags.find(t => t.name.toLowerCase() === tagName.toLowerCase()));
    if (existingTag) {
      return { error: `Tag "${tagName}" already exists in this project.`};
    }

    const newTag = await dbCreateProjectTag(projectUuid, tagName, tagColor);
    return { message: `Tag "${newTag.name}" created successfully!`, createdTag: newTag };
  } catch (error: any) {
    console.error("Error creating project tag:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export interface DeleteProjectTagFormState {
  success?: boolean;
  message?: string;
  error?: string;
}

export async function deleteProjectTagAction(prevState: DeleteProjectTagFormState, formData: FormData): Promise<DeleteProjectTagFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }

  const projectUuid = formData.get('projectUuid') as string;
  const tagUuid = formData.get('tagUuid') as string;

  if (!projectUuid || !tagUuid) {
    return { error: "Project UUID and Tag UUID are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      return { error: "You do not have permission to delete tags for this project." };
    }
    const success = await dbDeleteProjectTag(projectUuid, tagUuid);
    if (success) {
      return { success: true, message: "Tag deleted successfully." };
    }
    return { error: "Failed to delete tag." };
  } catch (error: any) {
    console.error("Error deleting project tag:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}


// Project Settings Actions
export interface SaveProjectReadmeFormState {
  message?: string;
  error?: string;
  project?: Project;
}

async function updateReadmeOnGithub(octokit: Octokit, owner: string, repo: string, content: string, existingSha?: string | null) {
  const paramsForUpdate: any = { 
    owner,
    repo,
    path: 'README.md',
    message: 'Update README.md from FlowUp',
    content: Buffer.from(content).toString('base64'),
    committer: {
      name: 'FlowUp Bot', 
      email: 'bot@flowup.app', 
    },
  };
  if (existingSha) {
    paramsForUpdate.sha = existingSha;
  }

  try {
    await octokit.rest.repos.createOrUpdateFileContents(paramsForUpdate);
    console.log(`[updateReadmeOnGithub] README.md updated/created successfully on GitHub for ${owner}/${repo}`);
  } catch (error: any) {
     if (error.status === 404 && !existingSha) {
        console.log(`[updateReadmeOnGithub] README.md not found for ${owner}/${repo}, creating it.`);
        const paramsForCreation = {...paramsForUpdate};
        delete paramsForCreation.sha; 
        try {
            await octokit.rest.repos.createOrUpdateFileContents(paramsForCreation);
            console.log(`[updateReadmeOnGithub] README.md created successfully on GitHub for ${owner}/${repo} after initial 404.`);
        } catch (creationError: any) {
            console.error(`[updateReadmeOnGithub] Failed to create README.md on GitHub for ${owner}/${repo} after initial 404:`, creationError.status, creationError.message, creationError.response?.data);
            throw new Error(`Failed to create README on GitHub after initial 404: ${creationError.message}`);
        }
    } else {
        console.error(`[updateReadmeOnGithub] Failed to update README.md on GitHub for ${owner}/${repo}:`, error.status, error.message, error.response?.data);
        throw new Error(`Failed to update README on GitHub: ${error.message}`);
    }
  }
}


export async function saveProjectReadmeAction(prevState: SaveProjectReadmeFormState, formData: FormData): Promise<SaveProjectReadmeFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }

  const projectUuid = formData.get('projectUuid') as string;
  const readmeContent = formData.get('readmeContent') as string;

  if (!projectUuid || readmeContent === null || readmeContent === undefined) {
    return { error: "Project UUID and README content are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: "You do not have permission to edit the README for this project." };
    }

    const updatedProject = await dbUpdateProjectReadme(projectUuid, readmeContent);
    if (!updatedProject) {
      return { error: "Failed to save README in FlowUp." };
    }

    if (updatedProject.githubRepoUrl && updatedProject.githubRepoName) {
      const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
      if (oauthToken?.accessToken) {
        const octokit = new Octokit({ auth: oauthToken.accessToken });

        const repoParts = updatedProject.githubRepoName.split('/');
        if (repoParts.length !== 2) {
             console.error(`[saveProjectReadmeAction] Invalid githubRepoName format: ${updatedProject.githubRepoName}`);
             return { message: "README saved in FlowUp, but GitHub repo name format is invalid for GitHub update.", project: updatedProject };
        }
        const [owner, repo] = repoParts;
         if (!owner || !repo) {
            console.error(`[saveProjectReadmeAction] Invalid owner or repo after splitting githubRepoName: ${updatedProject.githubRepoName}`);
            return { message: "README saved in FlowUp, but GitHub owner or repo name is invalid for GitHub update.", project: updatedProject };
        }

        let existingSha: string | null = null;
        try {
          const { data: readmeData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: 'README.md',
          });
          // @ts-ignore 
          if ('sha' in readmeData && readmeData.type === 'file') {
             // @ts-ignore
             existingSha = readmeData.sha;
          }
        } catch (error: any) {
          if (error.status !== 404) {
            console.warn(`[saveProjectReadmeAction] Could not fetch existing README SHA for ${owner}/${repo}:`, error.message);
          }
        }

        await updateReadmeOnGithub(octokit, owner, repo, readmeContent, existingSha);
        return { message: "README saved in FlowUp and updated on GitHub.", project: updatedProject };
      } else {
        return { message: "README saved in FlowUp. GitHub not linked or token missing for GitHub update.", project: updatedProject };
      }
    }

    return { message: "README saved successfully.", project: updatedProject };
  } catch (error: any) {
    console.error("Error saving README:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export interface ToggleProjectUrgencyFormState {
  message?: string;
  error?: string;
  project?: Project;
}

export async function toggleProjectUrgencyAction(prevState: ToggleProjectUrgencyFormState, formData: FormData): Promise<ToggleProjectUrgencyFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[toggleProjectUrgencyAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
   console.log("[toggleProjectUrgencyAction] Authenticated user for permission check:", session.user.uuid);

  const projectUuid = formData.get('projectUuid') as string;
  const isUrgent = formData.get('isUrgent') === 'true';

  if (!projectUuid) {
    return { error: "Project UUID is required." };
  }
  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[toggleProjectUrgencyAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
     if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      return { error: `You do not have permission to change urgency for this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }
    const updatedProject = await dbUpdateProjectUrgency(projectUuid, isUrgent);
    if (!updatedProject) {
      return { error: "Failed to update project urgency." };
    }
    return { message: `Project urgency ${isUrgent ? 'set' : 'unset'}.`, project: updatedProject };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred." };
  }
}

export interface ToggleProjectVisibilityFormState {
  message?: string;
  error?: string;
  project?: Project;
}

export async function toggleProjectVisibilityAction(prevState: ToggleProjectVisibilityFormState, formData: FormData): Promise<ToggleProjectVisibilityFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[toggleProjectVisibilityAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
  console.log("[toggleProjectVisibilityAction] Authenticated user for permission check:", session.user.uuid);

  const projectUuid = formData.get('projectUuid') as string;
  const isPrivate = formData.get('isPrivate') === 'true';

  if (!projectUuid) {
    return { error: "Project UUID is required." };
  }
  try {
    const projectFromDb = await dbGetProjectByUuid(projectUuid);
    if (!projectFromDb) return { error: "Project not found." };

    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    const globalUser = await dbGetUserByUuid(session.user.uuid);
    console.log(`[toggleProjectVisibilityAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}, Global role: ${globalUser?.role}`);

    if (userRole !== 'owner' && globalUser?.role !== 'admin') {
      return { error: `Only project owners or admins can change project visibility. Your project role: ${userRole || 'not a member'}, global role: ${globalUser?.role || 'unknown'}. UUID: ${session.user.uuid}` };
    }

    const updatedProjectInDb = await dbUpdateProjectVisibility(projectUuid, isPrivate);
    if (!updatedProjectInDb) {
      return { error: "Failed to update project visibility in FlowUp." };
    }

    if (updatedProjectInDb.githubRepoUrl && updatedProjectInDb.githubRepoName) {
        const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
        if (oauthToken?.accessToken) {
            const octokit = new Octokit({ auth: oauthToken.accessToken });
            const repoParts = updatedProjectInDb.githubRepoName.split('/');
            if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) { 
                console.error(`[toggleProjectVisibilityAction] Invalid githubRepoName format: ${updatedProjectInDb.githubRepoName}`);
                return { error: `Project visibility updated in FlowUp, but GitHub repo name format is invalid.`, project: updatedProjectInDb };
            }
            const [owner, repo] = repoParts;

            try {
                await octokit.rest.repos.update({
                    owner,
                    repo,
                    private: isPrivate,
                });
                console.log(`[toggleProjectVisibilityAction] GitHub repository ${owner}/${repo} visibility updated to ${isPrivate ? 'Private' : 'Public'}.`);
                return { message: `Project visibility set to ${isPrivate ? 'Private' : 'Public'} in FlowUp and on GitHub.`, project: updatedProjectInDb };
            } catch (githubError: any) {
                console.error(`[toggleProjectVisibilityAction] Failed to update GitHub repository visibility for ${owner}/${repo}:`, githubError.status, githubError.message, githubError.response?.data);
                let detailedError = githubError.message;
                if (githubError.status === 404) detailedError = `Repository ${owner}/${repo} not found or access denied. Check repository name and token permissions.`;
                else if (githubError.status === 403) detailedError = `Permission denied to update ${owner}/${repo}. Ensure your token has sufficient scopes.`;
                return { error: `Project visibility updated in FlowUp, but failed to update on GitHub: ${detailedError}`, project: updatedProjectInDb };
            }
        } else {
             return { message: `Project visibility set to ${isPrivate ? 'Private' : 'Public'} in FlowUp. GitHub token missing for GitHub update.`, project: updatedProjectInDb };
        }
    }

    return { message: `Project visibility set to ${isPrivate ? 'Private' : 'Public'}.`, project: updatedProjectInDb };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred." };
  }
}

// Task Pinning Action
export interface ToggleTaskPinState {
  message?: string;
  error?: string;
  updatedTask?: Task;
}

export async function toggleTaskPinAction(prevState: ToggleTaskPinState, formData: FormData): Promise<ToggleTaskPinState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[toggleTaskPinAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
   console.log("[toggleTaskPinAction] Authenticated user for permission check:", session.user.uuid);


  const taskUuid = formData.get('taskUuid') as string;
  const projectUuid = formData.get('projectUuid') as string;
  const isPinned = formData.get('isPinned') === 'true';

  if (!taskUuid || !projectUuid) {
    return { error: "Task UUID and Project UUID are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[toggleTaskPinAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to pin/unpin tasks in this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }

    const updatedTask = await dbToggleTaskPinStatus(taskUuid, isPinned);
    if (!updatedTask) {
      return { error: "Failed to update task pin status." };
    }
    return { message: `Task ${isPinned ? 'pinned' : 'unpinned'} successfully.`, updatedTask };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred." };
  }
}

// Document Actions

export async function fetchProjectMemberRoleAction(
  projectUuid: string,
  userUuid: string
): Promise<{ role: ProjectMemberRole | null; error?: string }> {
  if (!projectUuid || !userUuid) {
    return { role: null, error: "Project UUID and User UUID are required." };
  }
  try {
    const role = await dbGetProjectMemberRole(projectUuid, userUuid);
    return { role };
  } catch (error: any) {
    console.error("Failed to fetch project member role:", error);
    return { role: null, error: "Failed to fetch project member role." };
  }
}

export async function fetchDocumentAction(documentUuid: string | undefined): Promise<ProjectDocumentType | null> {
    if (!documentUuid) return null;
    try {
        const doc = await dbGetDocumentByUuid(documentUuid);
        return doc;
    } catch (error) {
        console.error("Failed to fetch document:", error);
        return null;
    }
}


export interface CreateDocumentFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  createdDocument?: ProjectDocumentType;
}

const CreateDocumentSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255),
  content: z.string().optional(),
});

export async function createDocumentAction(prevState: CreateDocumentFormState, formData: FormData): Promise<CreateDocumentFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const validatedFields = CreateDocumentSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    content: formData.get('content') || '',
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }
  const { projectUuid, title, content } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: "You do not have permission to create documents in this project." };
    }

    const createdDocument = await dbCreateDocument({
      projectUuid,
      title,
      content: content,
      fileType: 'markdown',
      createdByUuid: session.user.uuid,
    });
    return { message: "Document created successfully!", createdDocument };
  } catch (error: any) {
    console.error("Error creating document:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function fetchDocumentsAction(projectUuid: string | undefined): Promise<ProjectDocumentType[]> {
  if (!projectUuid) return [];
  try {
    return await dbGetDocumentsForProject(projectUuid);
  } catch (error) {
    console.error("Failed to fetch documents:", error);
    return [];
  }
}


export interface UpdateDocumentFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  updatedDocument?: ProjectDocumentType;
}

const UpdateDocumentSchema = z.object({
  documentUuid: z.string().uuid("Invalid document UUID."),
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255),
  content: z.string().optional(),
});


export async function updateDocumentAction(prevState: UpdateDocumentFormState, formData: FormData): Promise<UpdateDocumentFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const validatedFields = UpdateDocumentSchema.safeParse({
    documentUuid: formData.get('documentUuid'),
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    content: formData.get('content') || '',
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }
  const { documentUuid, projectUuid, title, content } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: "You do not have permission to update documents in this project." };
    }

    const docToUpdate = await dbGetDocumentByUuid(documentUuid);
    if (!docToUpdate) {
        return { error: "Document not found." };
    }
    if (docToUpdate.fileType !== 'markdown') {
        const updatedDoc = await dbUpdateDocumentContent(documentUuid, title, undefined);
        if (!updatedDoc) return { error: "Failed to update document title." };
        return { message: "Document title updated successfully!", updatedDocument: updatedDoc };
    }

    const updatedDocument = await dbUpdateDocumentContent(documentUuid, title, content);
    if (!updatedDocument) {
        return { error: "Failed to update document or document not found."};
    }
    return { message: "Document updated successfully!", updatedDocument: updatedDocument };
  } catch (error: any) {
    console.error("Error updating document:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export interface DeleteDocumentFormState {
    message?: string;
    error?: string;
}
export async function deleteDocumentAction(prevState: DeleteDocumentFormState, formData: FormData): Promise<DeleteDocumentFormState> {
    const session = await auth();
    if (!session?.user?.uuid) return { error: "Authentication required." };

    const documentUuid = formData.get('documentUuid') as string;
    const projectUuid = formData.get('projectUuid') as string;

    if (!documentUuid) return { error: "Document UUID is required."};

    try {
        if (projectUuid) {
            const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
            if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
                return { error: "You do not have permission to delete documents in this project." };
            }
        } else {
             return { error: "Project context is required for permission check." };
        }

        const success = await dbDeleteDocument(documentUuid);
        if (success) {
            return { message: "Document deleted successfully." };
        }
        return { error: "Failed to delete document." };
    } catch (error: any) {
        console.error("Error deleting document:", error);
        return { error: error.message || "An unexpected error occurred." };
    }
}

// Project Announcement Actions
const CreateProjectAnnouncementSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255),
  content: z.string().min(1, "Content is required."),
});

export interface CreateProjectAnnouncementFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  createdAnnouncement?: ProjectAnnouncement;
}

export async function createProjectAnnouncementAction(
  prevState: CreateProjectAnnouncementFormState,
  formData: FormData
): Promise<CreateProjectAnnouncementFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }

  const validatedFields = CreateProjectAnnouncementSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    content: formData.get('content'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }
  const { projectUuid, title, content } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      return { error: "You do not have permission to create announcements for this project." };
    }

    const createdAnnouncement = await dbCreateProjectAnnouncement({
      projectUuid,
      title,
      content,
      authorUuid: session.user.uuid,
    });
    const project = await dbGetProjectByUuid(projectUuid);
    if (project?.discordWebhookUrl && project.discordNotificationsEnabled && project.discordNotifyAnnouncements) {
      await sendDiscordNotification(project.discordWebhookUrl, {
        embeds: [{
          title: `📢 New Announcement: ${createdAnnouncement.title}`,
          description: createdAnnouncement.content.substring(0, 200) + (createdAnnouncement.content.length > 200 ? '...' : ''),
          color: 16729344, // Orange
          timestamp: new Date().toISOString(),
          author: {
            name: createdAnnouncement.authorName || 'FlowUp',
            icon_url: createdAnnouncement.authorAvatar
          },
          footer: { text: `Project: ${project.name}` }
        }]
      });
    }


    return { message: "Announcement created successfully!", createdAnnouncement };
  } catch (error: any) {
    console.error("Error creating project announcement:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function fetchProjectAnnouncementsAction(projectUuid: string | undefined): Promise<ProjectAnnouncement[]> {
  if (!projectUuid) return [];
  try {
    return await dbGetProjectAnnouncements(projectUuid);
  } catch (error) {
    console.error("Failed to fetch project announcements:", error);
    return [];
  }
}

export interface DeleteProjectAnnouncementFormState {
  message?: string;
  error?: string;
}

export async function deleteProjectAnnouncementAction(
  prevState: DeleteProjectAnnouncementFormState,
  formData: FormData
): Promise<DeleteProjectAnnouncementFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }

  const announcementUuid = formData.get('announcementUuid') as string;
  const projectUuid = formData.get('projectUuid') as string;
  const authorUuid = formData.get('authorUuid') as string;


  if (!announcementUuid || !projectUuid) {
    return { error: "Announcement UUID and Project UUID are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    const canDelete = userRole === 'owner' || userRole === 'co-owner' || session.user.uuid === authorUuid;

    if (!canDelete) {
      return { error: "You do not have permission to delete this announcement." };
    }

    const success = await dbDeleteProjectAnnouncement(announcementUuid);
    if (success) {
      return { message: "Announcement deleted successfully." };
    }
    return { error: "Failed to delete announcement." };
  } catch (error: any) {
    console.error("Error deleting project announcement:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

// GitHub OAuth and Repo Actions
export async function fetchUserGithubOAuthTokenAction(): Promise<UserGithubOAuthToken | null> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[fetchUserGithubOAuthTokenAction] Authentication required.");
    return null;
  }
  try {
    const token = await dbGetUserGithubOAuthToken(session.user.uuid);
    return token;
  } catch (error) {
    console.error("[fetchUserGithubOAuthTokenAction] Error fetching OAuth token:", error);
    return null;
  }
}

export interface GithubUserDetails {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
}

export async function fetchGithubUserDetailsAction(targetUserUuid?: string): Promise<GithubUserDetails | null> {
  const session = await auth(); 
  const userUuidForToken = targetUserUuid || session?.user?.uuid;

  if (!userUuidForToken) {
    console.error("[fetchGithubUserDetailsAction] User UUID for token not determined (no session or target).");
    return null;
  }
  
  const oauthToken = await dbGetUserGithubOAuthToken(userUuidForToken);
  if (!oauthToken?.accessToken) {
    console.log(`[fetchGithubUserDetailsAction] No GitHub OAuth token found for user ${userUuidForToken}.`);
    return null;
  }

  try {
    const octokit = new Octokit({ auth: oauthToken.accessToken });
    const { data } = await octokit.rest.users.getAuthenticated(); 
    return { login: data.login, avatar_url: data.avatar_url, html_url: data.html_url, name: data.name };
  } catch (error: any) {
    console.error(`[fetchGithubUserDetailsAction] Error fetching GitHub user details for user ${userUuidForToken}:`, error.status, error.message);
    if (error.status === 401 && userUuidForToken === session?.user?.uuid) { 
      await dbDeleteUserGithubOAuthToken(session.user.uuid); 
      console.warn(`[fetchGithubUserDetailsAction] GitHub token was invalid (401) for current user ${session.user.uuid}, removed from DB.`);
    }
    return null;
  }
}


export async function disconnectGithubAction(prevState: { success: boolean; error?: string; message?: string }, formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { success: false, error: "Authentication required." };
  }
  try {
    const success = await dbDeleteUserGithubOAuthToken(session.user.uuid);
    if (success) {
      return { success: true, message: "GitHub account disconnected successfully." };
    }
    return { success: false, error: "Failed to disconnect GitHub account from database." };
  } catch (error: any) {
    console.error("[disconnectGithubAction] Error:", error);
    return { success: false, error: error.message || "An unexpected error occurred." };
  }
}


function sanitizeRepoName(name: string | null | undefined): string {
  if (!name) {
    return '';
  }
  const trimmedName = name.trim();
  if (trimmedName === '') {
    return '';
  }

  let sanitized = trimmedName
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^\.+|\.$/g, '') 
    .replace(/^-+|-+$/g, ''); 

  return sanitized.substring(0, 100); 
}


export interface LinkProjectToGithubFormState {
  message?: string;
  error?: string;
  project?: Project;
}

export async function linkProjectToGithubAction(
  prevState: LinkProjectToGithubFormState,
  formData: FormData
): Promise<LinkProjectToGithubFormState> {
  const session = await auth();
  if (!session?.user?.uuid || !session.user.name || !session.user.email) { 
    return { error: "Authentication required, or user name/email missing in session." };
  }

  const projectUuid = formData.get('projectUuid') as string;
  const flowUpProjectNameValue = formData.get('flowUpProjectName') as string | null;
  const githubRepoNameValue = formData.get('githubRepoName') as string | null;
  const useDefaultRepoName = formData.get('useDefaultRepoName') === 'true';

  let nameForRepoCreation: string;

  if (useDefaultRepoName) {
    if (flowUpProjectNameValue && flowUpProjectNameValue.trim() !== '') {
      nameForRepoCreation = `FlowUp - ${flowUpProjectNameValue}`;
    } else {
      return { error: "FlowUp Project Name is required to generate the default repository name." };
    }
  } else {
    if (githubRepoNameValue && githubRepoNameValue.trim() !== '') {
      nameForRepoCreation = githubRepoNameValue;
    } else {
      return { error: "Custom repository name cannot be empty when not using the default." };
    }
  }

  const repoSlug = sanitizeRepoName(nameForRepoCreation);
  if (!repoSlug) {
    return { error: "Resulting repository name is invalid after sanitization. Please provide a valid name (e.g., 'my-repo', 'My_Project-123'). Avoid special characters or names that are too short or only dots/hyphens." };
  }

  const projectFromDb = await dbGetProjectByUuid(projectUuid);
  if (!projectFromDb) {
    return { error: "FlowUp project not found." };
  }
  const repoIsPrivate = projectFromDb.isPrivate !== undefined ? projectFromDb.isPrivate : true;


  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      return { error: "You do not have permission to link this project to GitHub." };
    }

    const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
    if (!oauthToken || !oauthToken.accessToken) {
      return { error: "GitHub account not linked or token missing. Please connect your GitHub account via your Profile page or the CodeSpace tab." };
    }

    const octokit = new Octokit({ auth: oauthToken.accessToken });
    console.log('[linkProjectToGithubAction] Octokit instance created with user OAuth token.');

    let createdRepo;
    try {
      console.log(`Attempting to create repository '${repoSlug}' for authenticated user. Private: ${repoIsPrivate}`);
      createdRepo = await octokit.rest.repos.createForAuthenticatedUser({
        name: repoSlug,
        private: repoIsPrivate,
        description: `Repository for FlowUp project: ${projectFromDb.name}`,
        auto_init: true, 
      });
      console.log(`Successfully created repository: ${createdRepo.data.html_url}`);

      if (projectFromDb.readmeContent && projectFromDb.readmeContent.trim() !== '') {
         let existingReadmeSha: string | undefined = undefined;
        try {
            const { data: readmeData } = await octokit.rest.repos.getContent({
                owner: createdRepo.data.owner.login,
                repo: createdRepo.data.name,
                path: 'README.md',
            });
            // @ts-ignore
            if ('sha' in readmeData && readmeData.type === 'file') {
                // @ts-ignore
                existingReadmeSha = readmeData.sha;
            }
        } catch (getContentError: any) {
            if (getContentError.status !== 404) {
                console.warn(`[linkProjectToGithubAction] Could not fetch existing README SHA for ${createdRepo.data.owner.login}/${createdRepo.data.name}:`, getContentError.message);
            }
        }
        await updateReadmeOnGithub(octokit, createdRepo.data.owner.login, createdRepo.data.name, projectFromDb.readmeContent, existingReadmeSha);
      }

    } catch (apiError: any) {
      console.error(`GitHub API error creating repository: ${apiError.status} ${apiError.message}`, apiError.response?.data);
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Unknown GitHub API error.';
      if (apiError.status === 403) { 
          return { error: `GitHub Permission Denied: ${errorMessage}. Ensure your GitHub OAuth token has the 'repo' scope and necessary permissions.`};
      }
      if (apiError.status === 422) { 
        return { error: `Failed to create GitHub repository '${repoSlug}'. It might already exist or there's a naming conflict. GitHub's message: ${errorMessage}` };
      }
      return { error: `GitHub API Error (${apiError.status || 'unknown'}): ${errorMessage} - ${apiError.documentation_url || ''}` };
    }

    const repoUrl = createdRepo.data.html_url;
    const actualRepoName = createdRepo.data.full_name; 

    const updatedProject = await dbUpdateProjectGithubRepo(projectUuid, repoUrl, actualRepoName);

    if (!updatedProject) {
        return { error: "Failed to save GitHub repository details to FlowUp project after creation on GitHub. Please check project settings or contact support." };
    }

    return { message: `GitHub repository '${actualRepoName}' created and linked successfully!`, project: updatedProject };

  } catch (error: any) {
    console.error("Error in linkProjectToGithubAction:", error);
    return { error: error.message || "An unexpected error occurred while linking to GitHub." };
  }
}

// GitHub File Management Actions
export async function getRepoContentsAction(projectUuid: string, path: string = ''): Promise<GithubRepoContentItem[] | { error: string }> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const project = await dbGetProjectByUuid(projectUuid);
  if (!project || !project.githubRepoName) {
    return { error: "Project not found or not linked to GitHub." };
  }

  const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
  if (!oauthToken || !oauthToken.accessToken) {
    return { error: "GitHub account not linked or token missing. Please connect your GitHub account from your Profile page or the CodeSpace tab." };
  }

  const [owner, repo] = project.githubRepoName.split('/');
  if (!owner || !repo) return { error: "Invalid GitHub repository name format in FlowUp project data." };

  const octokit = new Octokit({ auth: oauthToken.accessToken });

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    if (Array.isArray(data)) {
      return data as GithubRepoContentItem[];
    }
    return [data as GithubRepoContentItem];
  } catch (error: any) {
    console.error(`[getRepoContentsAction] Error fetching content for ${owner}/${repo}/${path}:`, error.status, error.message, error.response?.data);
    let userMessage = "Failed to fetch repository contents.";
    if (error.status === 404) {
        userMessage = `Path '${path}' not found in repository '${project.githubRepoName}'.`;
    } else if (error.status === 403) { 
        userMessage = `Access denied to repository '${project.githubRepoName}'. Check your GitHub token permissions (requires 'repo' scope) or the repository's existence and your access rights.`;
    } else if (error.status === 401) { 
        userMessage = `GitHub authentication failed. Your token might be invalid or expired. Please try reconnecting your GitHub account.`;
        await dbDeleteUserGithubOAuthToken(session.user.uuid); 
    } else if (error.response?.data?.message){
        userMessage = error.response.data.message;
    } else if (error.message) {
        userMessage = error.message;
    }
    return { error: userMessage };
  }
}

export async function getFileContentAction(
  projectUuid: string,
  filePath: string
): Promise<{ content: string; sha: string; name: string; path: string; html_url?: string | null; download_url?: string | null; encoding?: string; size: number } | { error: string }> {
    const session = await auth();
    if (!session?.user?.uuid) return { error: "Authentication required." };

    const project = await dbGetProjectByUuid(projectUuid);
    if (!project || !project.githubRepoName) {
        return { error: "Project not found or not linked to GitHub." };
    }

    const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
    if (!oauthToken || !oauthToken.accessToken) {
        return { error: "GitHub account not linked or token missing. Please connect your GitHub account from your Profile page or the CodeSpace tab." };
    }

    const [owner, repo] = project.githubRepoName.split('/');
    if (!owner || !repo) return { error: "Invalid GitHub repository name format." };

    const octokit = new Octokit({ auth: oauthToken.accessToken });

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath,
        });

        // @ts-ignore 
        if (data.type !== 'file' || typeof data.content !== 'string' || typeof data.sha !== 'string') {
            return { error: "Path does not point to a valid file or content is missing." };
        }
        // @ts-ignore
        const content = Buffer.from(data.content, data.encoding as BufferEncoding || 'base64').toString('utf8');
        // @ts-ignore
        return { content, sha: data.sha, name: data.name, path: data.path, html_url: data.html_url, download_url: data.download_url, encoding: data.encoding, size: data.size };
    } catch (error: any) {
        console.error(`[getFileContentAction] Error fetching file content for ${owner}/${repo}/${filePath}:`, error.status, error.message, error.response?.data);
        let userMessage = "Failed to fetch file content.";
        if (error.status === 404) {
            userMessage = `File '${filePath}' not found in repository '${project.githubRepoName}'.`;
        } else if (error.status === 403) {
            userMessage = `Access denied to file '${filePath}' in repository '${project.githubRepoName}'. Check token permissions.`;
        } else if (error.status === 401) { 
            userMessage = `GitHub authentication failed. Your token might be invalid or expired. Please try reconnecting your GitHub account.`;
            await dbDeleteUserGithubOAuthToken(session.user.uuid); 
        } else if (error.response?.data?.message) {
            userMessage = error.response.data.message;
        } else if (error.message) {
            userMessage = error.message;
        }
        return { error: userMessage };
    }
}


export async function saveFileContentAction(
  projectUuid: string,
  filePath: string,
  content: string,
  sha: string,
  commitMessage?: string
): Promise<{ success: boolean; newSha?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.uuid || !session.user.name || !session.user.email) {
    return { success: false, error: "Authentication required, or user name/email missing in session." };
  }

  const project = await dbGetProjectByUuid(projectUuid);
  if (!project || !project.githubRepoName) {
    return { success: false, error: "Project not found or not linked to GitHub." };
  }

  const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
  if (!oauthToken || !oauthToken.accessToken) {
    return { success: false, error: "GitHub account not linked or token missing." };
  }

  const [owner, repo] = project.githubRepoName.split('/');
  if (!owner || !repo) {
    return { success: false, error: "Invalid GitHub repository name format." };
  }

  const octokit = new Octokit({ auth: oauthToken.accessToken });

  try {
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage || `Update ${filePath} via FlowUp`,
      content: Buffer.from(content).toString('base64'),
      sha,
      committer: { 
        name: session.user.name,
        email: session.user.email, 
      },
      author: {
        name: session.user.name,
        email: session.user.email,
      }
    });
    
    if (response.status === 200 || response.status === 201) { 
      return { success: true, newSha: response.data.content?.sha };
    } else {
      return { success: false, error: `GitHub API returned status ${response.status}` };
    }
  } catch (error: any) {
    console.error(`[saveFileContentAction] Error saving file ${filePath}:`, error.status, error.message, error.response?.data);
    let userMessage = `Failed to save file: ${error.message || 'Unknown error'}`;
    if (error.status === 409) { 
        userMessage = "File has been modified since you opened it. Please refresh and try again.";
    } else if (error.status === 403) { 
        userMessage = "Permission denied. Ensure you have write access to this repository and your token has 'repo' scope.";
    } else if (error.status === 404) { 
        userMessage = "File not found. It might have been deleted or moved.";
    } else if (error.status === 401) { 
        userMessage = `GitHub authentication failed. Your token might be invalid or expired. Please try reconnecting your GitHub account.`;
        await dbDeleteUserGithubOAuthToken(session.user.uuid); 
    } else if (error.status === 422 && error.response?.data?.message?.includes("committer email is not associated with the committer")) {
        userMessage = `Failed to save file: Your FlowUp email ('${session.user.email}') is not associated with your GitHub account or is not verified. Please ensure your FlowUp email matches a verified email on GitHub.`;
    } else if (error.response?.data?.message) {
      userMessage = `Failed to save file: ${error.response.data.message}`;
    }
    return { success: false, error: userMessage };
  }
}

export async function createGithubFileAction(
  projectUuid: string,
  filePath: string, 
  initialContent: string,
  commitMessage?: string
): Promise<{ success: boolean; error?: string; file?: GithubRepoContentItem }> {
  const session = await auth();
  if (!session?.user?.uuid || !session.user.name || !session.user.email) {
    return { success: false, error: "Authentication required, or user name/email missing." };
  }

  const project = await dbGetProjectByUuid(projectUuid);
  if (!project || !project.githubRepoName) {
    return { success: false, error: "Project not found or not linked to GitHub." };
  }

  const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
  if (!oauthToken || !oauthToken.accessToken) {
    return { success: false, error: "GitHub account not linked or token missing." };
  }

  const [owner, repo] = project.githubRepoName.split('/');
  if (!owner || !repo) return { success: false, error: "Invalid GitHub repository name." };

  const octokit = new Octokit({ auth: oauthToken.accessToken });

  try {
    try {
      await octokit.rest.repos.getContent({ owner, repo, path: filePath });
      return { success: false, error: `File already exists at path: ${filePath}` };
    } catch (error: any) {
      if (error.status !== 404) { 
        throw error; 
      }
    }

    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage || `Create ${filePath} via FlowUp`,
      content: Buffer.from(initialContent).toString('base64'),
      committer: { name: session.user.name, email: session.user.email },
      author: { name: session.user.name, email: session.user.email },
    });

    if (response.status === 201) { 
      return { success: true, file: response.data.content as GithubRepoContentItem };
    }
    return { success: false, error: `GitHub API returned status ${response.status} for file creation.` };
  } catch (error: any) {
    console.error(`[createGithubFileAction] Error creating file ${filePath}:`, error);
    return { success: false, error: `Failed to create file: ${error.message || 'Unknown error'}` };
  }
}


export async function createGithubFolderAction(
  projectUuid: string,
  folderPath: string, 
  commitMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.uuid || !session.user.name || !session.user.email) {
    return { success: false, error: "Authentication required." };
  }
  const gitkeepPath = `${folderPath.replace(/\/$/, '')}/.gitkeep`;
  
  const result = await createGithubFileAction(
    projectUuid, 
    gitkeepPath, 
    '', 
    commitMessage || `Create folder ${folderPath} via FlowUp`
  );

  if (result.success) {
    return { success: true };
  } else {
    if (result.error?.includes("File already exists")) {
        console.warn(`[createGithubFolderAction] Attempted to create folder '${folderPath}' but it (or .gitkeep) might already exist. Error: ${result.error}`);
        return { success: false, error: `Folder '${folderPath}' or its .gitkeep file might already exist. Original error: ${result.error}`};
    }
    return { success: false, error: result.error || "Failed to create .gitkeep file for folder." };
  }
}

export async function deleteGithubFileAction(
  projectUuid: string,
  filePath: string,
  sha: string,
  commitMessage?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
   if (!session?.user?.uuid || !session.user.name || !session.user.email) {
    return { success: false, error: "Authentication required or user details missing." };
  }

  const project = await dbGetProjectByUuid(projectUuid);
  if (!project || !project.githubRepoName) {
    return { success: false, error: "Project not found or not linked to GitHub." };
  }

  const oauthToken = await dbGetUserGithubOAuthToken(session.user.uuid);
  if (!oauthToken || !oauthToken.accessToken) {
    return { success: false, error: "GitHub account not linked or token missing." };
  }

  const [owner, repo] = project.githubRepoName.split('/');
  if (!owner || !repo) return { success: false, error: "Invalid GitHub repository name format." };

  const octokit = new Octokit({ auth: oauthToken.accessToken });

  try {
    const response = await octokit.rest.repos.deleteFile({
      owner,
      repo,
      path: filePath,
      message: commitMessage || `Delete ${filePath} via FlowUp`,
      sha,
      committer: { name: session.user.name, email: session.user.email },
      author: { name: session.user.name, email: session.user.email },
    });

    if (response.status === 200) { 
      return { success: true };
    }
    return { success: false, error: `GitHub API returned status ${response.status} for file deletion.` };
  } catch (error: any) {
    console.error(`[deleteGithubFileAction] Error deleting file ${filePath}:`, error);
    return { success: false, error: `Failed to delete file: ${error.message || 'Unknown error'}` };
  }
}


export interface GenerateProjectFilesAIFormState {
  message?: string;
  error?: string;
  fieldErrors?: { prompt?: string[] };
  createdFiles?: string[];
}

const GenerateProjectFilesAISchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  prompt: z.string().min(10, "Prompt must be at least 10 characters.").max(2000),
  basePath: z.string().optional(),
});

export async function generateProjectFilesWithAIAction(
  prevState: GenerateProjectFilesAIFormState,
  formData: FormData
): Promise<GenerateProjectFilesAIFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const validatedFields = GenerateProjectFilesAISchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    prompt: formData.get('prompt'),
    basePath: formData.get('basePath') || '',
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input for AI generation.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { projectUuid, prompt, basePath } = validatedFields.data;

  const project = await dbGetProjectByUuid(projectUuid);
  if (!project || !project.githubRepoName) {
    return { error: "Project not found or not linked to GitHub." };
  }

  const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
  if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
    return { error: "You do not have permission to generate files in this project." };
  }

  try {
    const aiInput: GenerateProjectScaffoldInput = { prompt };
    const aiOutput: GenerateProjectScaffoldOutput = await generateProjectScaffold(aiInput);

    if (!aiOutput.files || aiOutput.files.length === 0) {
      return { error: "AI did not generate any files. Try a different prompt." };
    }

    const createdFiles: string[] = [];
    for (const file of aiOutput.files) {
      const fullFilePath = basePath ? `${basePath}/${file.filePath}`.replace(/\/\//g, '/') : file.filePath;
      const result = await createGithubFileAction(
        projectUuid,
        fullFilePath,
        file.content,
        `AI Generated: ${file.filePath}`
      );
      if (result.success && result.file) {
        createdFiles.push(result.file.path);
      } else {
        // Collect errors or stop on first error? For now, continue and report first error.
        return { error: `Failed to create file '${fullFilePath}': ${result.error}. Some files may not have been created.` , createdFiles};
      }
    }
    return { message: `${createdFiles.length} files generated successfully by AI.`, createdFiles };
  } catch (error: any) {
    console.error("Error generating project files with AI:", error);
    return { error: `AI Generation Failed: ${error.message || "An unexpected error occurred."}` };
  }
}

export async function editFileWithAIAction(
  projectUuid: string,
  currentContent: string,
  userPrompt: string
): Promise<EditFileContentAIOutput | { error: string }> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }

  const project = await dbGetProjectByUuid(projectUuid);
  if (!project || !project.githubRepoName) {
    return { error: "Project not found or not linked to GitHub." };
  }

  const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
  if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
    return { error: "You do not have permission to edit files in this project using AI." };
  }

  try {
    const aiInput: EditFileContentAIInput = { currentContent, userPrompt };
    const aiOutput = await editFileContentWithAI(aiInput);
    return aiOutput;
  } catch (error: any) {
    console.error("Error editing file with AI:", error);
    return { error: `AI file editing failed: ${error.message || "An unexpected error occurred."}` };
  }
}


export interface UpdateProjectDiscordSettingsFormState {
  message?: string;
  error?: string;
  project?: Project;
}

const updateDiscordSettingsSchema = z.object({
  projectUuid: z.string().uuid(),
  discordWebhookUrl: z.string().url("Please enter a valid Discord webhook URL.").or(z.literal('')),
  discordNotificationsEnabled: z.enum(['true', 'false']).transform(v => v === 'true'),
  discordNotifyTasks: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  discordNotifyMembers: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  discordNotifyAnnouncements: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});


export async function updateProjectDiscordSettingsAction(
  prevState: UpdateProjectDiscordSettingsFormState,
  formData: FormData
): Promise<UpdateProjectDiscordSettingsFormState> {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { error: "Authentication required." };
    }

    const validatedFields = updateDiscordSettingsSchema.safeParse({
        projectUuid: formData.get('projectUuid'),
        discordWebhookUrl: formData.get('discordWebhookUrl'),
        discordNotificationsEnabled: formData.get('discordNotificationsEnabled'),
        discordNotifyTasks: formData.get('discordNotifyTasks'),
        discordNotifyMembers: formData.get('discordNotifyMembers'),
        discordNotifyAnnouncements: formData.get('discordNotifyAnnouncements'),
    });

    if (!validatedFields.success) {
        return { error: "Invalid input: " + validatedFields.error.flatten().fieldErrors.discordWebhookUrl?.join(', ') };
    }

    const { projectUuid, discordWebhookUrl, discordNotificationsEnabled, discordNotifyTasks, discordNotifyMembers, discordNotifyAnnouncements } = validatedFields.data;
    
    try {
        const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
        if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
            return { error: "You do not have permission to change Discord settings for this project." };
        }

        const updatedProject = await dbUpdateProjectDiscordSettings(projectUuid, discordWebhookUrl, discordNotificationsEnabled, discordNotifyTasks, discordNotifyMembers, discordNotifyAnnouncements);

        if (!updatedProject) {
            return { error: "Failed to update project settings in the database." };
        }

        return { message: "Discord settings updated successfully.", project: updatedProject };

    } catch (error: any) {
        return { error: error.message || "An unexpected error occurred." };
    }
}

export interface DeleteProjectFormState {
  success?: boolean;
  message?: string;
  error?: string;
}

export async function deleteProjectAction(
  prevState: DeleteProjectFormState,
  formData: FormData
): Promise<DeleteProjectFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }

  const projectUuid = formData.get('projectUuid') as string;
  if (!projectUuid) {
    return { error: "Project UUID is required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (userRole !== 'owner') {
      return { error: "Only the project owner can delete this project." };
    }

    const success = await dbDeleteProject(projectUuid);
    if (success) {
      return { success: true, message: "Project deleted successfully." };
    }
    return { error: "Failed to delete project from the database." };
  } catch (error: any) {
    console.error(`Error deleting project ${projectUuid}:`, error);
    return { error: error.message || "An unexpected error occurred." };
  }
}
