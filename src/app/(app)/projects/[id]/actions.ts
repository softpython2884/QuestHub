
'use server';

import type { Project, ProjectMember, ProjectMemberRole, Task, TaskStatus, Tag, Document as ProjectDocumentType } from '@/types';
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
  updateTaskStatus as dbUpdateTaskStatus,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  getProjectTags as dbGetProjectTags,
  updateProjectReadme as dbUpdateProjectReadme,
  updateProjectUrgency as dbUpdateProjectUrgency,
  updateProjectVisibility as dbUpdateProjectVisibility,
  toggleTaskPinStatus as dbToggleTaskPinStatus,
  createProjectTag as dbCreateProjectTag,
  createDocument as dbCreateDocument,
  getDocumentsForProject as dbGetDocumentsForProject,
  updateDocumentContent as dbUpdateDocumentContent,
  deleteDocument as dbDeleteDocument,
} from '@/lib/db';
import { z } from 'zod';
import { auth } from '@/lib/authEdge';

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
  if (!session?.user?.uuid) {
    console.error("[inviteUserToProjectAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
  console.log("[inviteUserToProjectAction] Authenticated user for permission check:", session.user.uuid);

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

    const inviterRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[inviteUserToProjectAction] Inviter role check for project ${projectUuid} (user ${session.user.uuid}): ${inviterRole}`);
     if (!inviterRole || !['owner', 'co-owner'].includes(inviterRole)) {
      return { error: `You do not have permission to invite users to this project. Your role: ${inviterRole || 'not a member'}. UUID: ${session.user.uuid}` };
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
    return { message: `${userToInvite.name} has been successfully ${existingMembership ? 'updated to role' : 'invited as'} ${role}.`, invitedMember: newOrUpdatedMember };
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
  if (!session?.user?.uuid) {
    console.error("[createTaskAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
  console.log("[createTaskAction] Authenticated user:", session.user.uuid);

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
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[createTaskAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
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

const UpdateTaskStatusSchema = z.object({
  taskUuid: z.string().uuid("Invalid task UUID."),
  projectUuid: z.string().uuid("Invalid project UUID."),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
});

export interface UpdateTaskStatusFormState {
  message?: string;
  error?: string;
  updatedTask?: Task;
}

export async function updateTaskStatusAction(prevState: UpdateTaskStatusFormState, formData: FormData): Promise<UpdateTaskStatusFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
     console.error("[updateTaskStatusAction] Authentication required. No session user UUID.");
     return { error: "Authentication required." };
    }
  console.log("[updateTaskStatusAction] Authenticated user for permission check:", session.user.uuid);

  const validatedFields = UpdateTaskStatusSchema.safeParse({
    taskUuid: formData.get('taskUuid'),
    projectUuid: formData.get('projectUuid'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input: " + JSON.stringify(validatedFields.error.flatten().fieldErrors) };
  }
  const { taskUuid, projectUuid, status } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[updateTaskStatusAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole) { 
      return { error: `You are not a member of this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }

    const updatedTask = await dbUpdateTaskStatus(taskUuid, status);
    if (!updatedTask) {
      return { error: "Failed to update task status." };
    }
    return { message: "Task status updated successfully!", updatedTask };
  } catch (error: any) {
    console.error("Error updating task status:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

const UpdateTaskSchema = z.object({
  taskUuid: z.string().uuid("Invalid task UUID."),
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255),
  description: z.string().optional(),
  todoListMarkdown: z.string().optional().default(''),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
  assigneeUuid: z.string().uuid("Invalid Assignee UUID format.").optional().or(z.literal('')),
  tagsString: z.string().optional(),
});

export interface UpdateTaskFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  updatedTask?: Task;
}

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
    title: formData.get('title'),
    description: formData.get('description') || '', 
    todoListMarkdown: formData.get('todoListMarkdown') || '',
    status: formData.get('status'),
    assigneeUuid: formData.get('assigneeUuid') || '', 
    tagsString: formData.get('tagsString'),
  });

  if (!validatedFields.success) {
    console.error("[updateTaskAction] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { taskUuid, projectUuid, title, description, todoListMarkdown, status, assigneeUuid: rawAssigneeUuid, tagsString } = validatedFields.data;
  
  let finalAssigneeUuid: string | null = null;
    if (rawAssigneeUuid && rawAssigneeUuid !== '' && rawAssigneeUuid !== '__UNASSIGNED__') {
        finalAssigneeUuid = rawAssigneeUuid;
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[updateTaskAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to update tasks in this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }
    
    const taskData: Partial<Omit<Task, 'uuid' | 'projectUuid' | 'createdAt' | 'updatedAt' | 'tags' | 'assigneeName'>> & { tagsString?: string } = {};
    
    if (formData.has('title')) taskData.title = title;
    if (formData.has('description')) taskData.description = description || undefined; 
    if (formData.has('todoListMarkdown')) taskData.todoListMarkdown = todoListMarkdown || undefined; 
    if (formData.has('status')) taskData.status = status;
    if (formData.has('assigneeUuid')) taskData.assigneeUuid = finalAssigneeUuid;
    if (formData.has('tagsString')) taskData.tagsString = tagsString || undefined; 
    

    const updatedTask = await dbUpdateTask(taskUuid, taskData);
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


// Project Settings Actions
export interface SaveProjectReadmeFormState {
  message?: string;
  error?: string;
  project?: Project;
}

export async function saveProjectReadmeAction(prevState: SaveProjectReadmeFormState, formData: FormData): Promise<SaveProjectReadmeFormState> {
  const session = await auth();
  if (!session?.user?.uuid) {
    console.error("[saveProjectReadmeAction] Authentication required. No session user UUID.");
    return { error: "Authentication required." };
  }
  console.log("[saveProjectReadmeAction] Authenticated user for permission check:", session.user.uuid);


  const projectUuid = formData.get('projectUuid') as string;
  const readmeContent = formData.get('readmeContent') as string;

  if (!projectUuid || readmeContent === null || readmeContent === undefined) {
    return { error: "Project UUID and README content are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[saveProjectReadmeAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to edit the README for this project. Your role: ${userRole || 'not a member'}. UUID: ${session.user.uuid}` };
    }
    const updatedProject = await dbUpdateProjectReadme(projectUuid, readmeContent);
    if (!updatedProject) {
      return { error: "Failed to save README." };
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
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    const globalUser = await dbGetUserByUuid(session.user.uuid); 
    console.log(`[toggleProjectVisibilityAction] User role check for project ${projectUuid} (user ${session.user.uuid}): ${userRole}, Global role: ${globalUser?.role}`);

    if (userRole !== 'owner' && globalUser?.role !== 'admin') { 
      return { error: `Only project owners or admins can change project visibility. Your project role: ${userRole || 'not a member'}, global role: ${globalUser?.role || 'unknown'}. UUID: ${session.user.uuid}` };
    }
    const updatedProject = await dbUpdateProjectVisibility(projectUuid, isPrivate);
    if (!updatedProject) {
      return { error: "Failed to update project visibility." };
    }
    return { message: `Project visibility set to ${isPrivate ? 'Private' : 'Public'}.`, project: updatedProject };
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
  fileType: z.enum(['markdown', 'txt', 'html', 'pdf', 'other'] as [ProjectDocumentType['fileType'], ...ProjectDocumentType['fileType'][]]),
  filePath: z.string().optional(), // For PDF path, actual file name for others if needed
  fileName: z.string().optional(), // For original file name from upload
});

export async function createDocumentAction(prevState: CreateDocumentFormState, formData: FormData): Promise<CreateDocumentFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const validatedFields = CreateDocumentSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    content: formData.get('content') || '',
    fileType: formData.get('fileType'),
    filePath: formData.get('filePath'),
    fileName: formData.get('fileName'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }
  const { projectUuid, title, content, fileType, filePath, fileName } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: "You do not have permission to create documents in this project." };
    }
    
    let finalFilePath = filePath;
    if (fileType === 'pdf' && fileName && !filePath) { // If PDF and only fileName is present
        finalFilePath = fileName; // Use fileName as filePath for PDF links
    }

    const createdDocument = await dbCreateDocument({
      projectUuid,
      title,
      content: (fileType === 'markdown' || fileType === 'txt' || fileType === 'html') ? content : undefined,
      fileType,
      filePath: finalFilePath, // Use the potentially modified filePath
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
  fileType: z.enum(['markdown', 'txt', 'html', 'pdf', 'other']), // Keep for consistency, but only content of certain types is editable
});


export async function updateDocumentAction(prevState: UpdateDocumentFormState, formData: FormData): Promise<UpdateDocumentFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const validatedFields = UpdateDocumentSchema.safeParse({
    documentUuid: formData.get('documentUuid'),
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    content: formData.get('content') || '',
    fileType: formData.get('fileType'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }
  const { documentUuid, projectUuid, title, content, fileType } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: "You do not have permission to update documents in this project." };
    }
    
    // Only allow content update for specific types
    let newContent: string | undefined = undefined;
    if (fileType === 'markdown' || fileType === 'txt' || fileType === 'html') {
        newContent = content;
    } else if (fileType === 'pdf' || fileType === 'other') {
        // For PDFs or 'other', content is not directly editable via this form. Title might be.
        // If you want to allow changing PDF file links, that's a different flow.
    }


    const updatedDocument = await dbUpdateDocumentContent(documentUuid, title, newContent);
    if (!updatedDocument) {
        return { error: "Failed to update document or document not found."};
    }
    return { message: "Document updated successfully!", updatedDocument };
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
    const projectUuid = formData.get('projectUuid') as string; // Optional, for permission check context

    if (!documentUuid) return { error: "Document UUID is required."};
    
    try {
        if (projectUuid) { // If projectUuid is provided, perform role check
            const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
            if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
                return { error: "You do not have permission to delete documents in this project." };
            }
        } else {
            // Potentially check if user is creator if projectUuid is not available, or disallow if no project context
            // For now, assume if projectUuid is not passed, it's a broader admin action or handled differently.
            // Let's require projectUuid for now for simplicity and security.
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
