
'use server';

import type { Project, ProjectMember, ProjectMemberRole, Task, TaskStatus, Tag } from '@/types';
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
        return { error: `You do not have permission to edit this project. Your role: ${userRole || 'not a member'}.` };
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
  console.log("[inviteUserToProjectAction] Authenticated user:", session.user.uuid);

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
    console.log(`[inviteUserToProjectAction] Inviter role for project ${projectUuid} (user ${session.user.uuid}): ${inviterRole}`);
     if (!inviterRole || !['owner', 'co-owner'].includes(inviterRole)) {
      return { error: `You do not have permission to invite users to this project. Your role: ${inviterRole || 'not a member'}.` };
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
     console.log("[removeUserFromProjectAction] Authenticated user:", session.user.uuid);


    if (!projectUuid || !userUuidToRemove) {
        return { error: "Project UUID and User UUID are required." };
    }
    try {
        const project = await dbGetProjectByUuid(projectUuid);
        if (!project) return { error: "Project not found." };

        const removerRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
        console.log(`[removeUserFromProjectAction] Remover role for project ${projectUuid} (user ${session.user.uuid}): ${removerRole}`);
        if (!removerRole || !['owner', 'co-owner'].includes(removerRole)) {
            return { error: `You do not have permission to remove users from this project. Your role: ${removerRole || 'not a member'}.` };
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
  todoListMarkdown: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
  assigneeUuid: z.string().optional(), // Will handle empty string for "Everyone"
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
    description: formData.get('description'),
    todoListMarkdown: formData.get('todoListMarkdown'),
    status: formData.get('status'),
    assigneeUuid: formData.get('assigneeUuid'), // Can be empty string
    tagsString: formData.get('tagsString'),
  });

  if (!validatedFields.success) {
    console.error("[createTaskAction] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { projectUuid, title, description, todoListMarkdown, status, assigneeUuid: rawAssigneeUuid, tagsString } = validatedFields.data;

  let finalAssigneeUuid: string | null = null;
  if (rawAssigneeUuid && rawAssigneeUuid !== '' && rawAssigneeUuid !== '__UNASSIGNED__') { // Check UNASSIGNED_VALUE too
    const uuidValidation = z.string().uuid().safeParse(rawAssigneeUuid);
    if (!uuidValidation.success) {
      return { error: "Invalid Assignee UUID format.", fieldErrors: { assigneeUuid: ["Invalid UUID format for assignee."] } };
    }
    finalAssigneeUuid = rawAssigneeUuid;
  } else {
    finalAssigneeUuid = null; 
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[createTaskAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to create tasks in this project. Your role: ${userRole || 'not a member'}.` };
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
  console.log("[updateTaskStatusAction] Authenticated user:", session.user.uuid);

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
    console.log(`[updateTaskStatusAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole) { 
      return { error: `You are not a member of this project. Your role: ${userRole || 'not a member'}.` };
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
  todoListMarkdown: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
  assigneeUuid: z.string().optional(),
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
   console.log("[updateTaskAction] Authenticated user:", session.user.uuid);


  const validatedFields = UpdateTaskSchema.safeParse({
    taskUuid: formData.get('taskUuid'),
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    description: formData.get('description'),
    todoListMarkdown: formData.get('todoListMarkdown'),
    status: formData.get('status'),
    assigneeUuid: formData.get('assigneeUuid'),
    tagsString: formData.get('tagsString'),
  });

  if (!validatedFields.success) {
    console.error("[updateTaskAction] Validation failed:", validatedFields.error.flatten().fieldErrors);
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { taskUuid, projectUuid, title, description, todoListMarkdown, status, assigneeUuid: rawAssigneeUuid, tagsString } = validatedFields.data;
  
  let finalAssigneeUuid: string | null = null;
    if (rawAssigneeUuid && rawAssigneeUuid !== '' && rawAssigneeUuid !== '__UNASSIGNED__') {
    const uuidValidation = z.string().uuid().safeParse(rawAssigneeUuid);
    if (!uuidValidation.success) {
      return { error: "Invalid Assignee UUID format.", fieldErrors: { assigneeUuid: ["Invalid UUID format for assignee."] } };
    }
    finalAssigneeUuid = rawAssigneeUuid;
  } else {
    finalAssigneeUuid = null; 
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[updateTaskAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to update tasks in this project. Your role: ${userRole || 'not a member'}.` };
    }
    
    const taskData: Partial<Task> & { tagsString?: string } = {};
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
    console.log("[deleteTaskAction] Authenticated user:", session.user.uuid);

    const taskUuid = formData.get('taskUuid') as string;
    const projectUuid = formData.get('projectUuid') as string;

    if (!taskUuid || !projectUuid) {
        return { error: "Task UUID and Project UUID are required."};
    }
    
    try {
        const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
        console.log(`[deleteTaskAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
        if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
            return { error: `You do not have permission to delete tasks in this project. Your role: ${userRole || 'not a member'}.` };
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
  console.log("[saveProjectReadmeAction] Authenticated user:", session.user.uuid);


  const projectUuid = formData.get('projectUuid') as string;
  const readmeContent = formData.get('readmeContent') as string;

  if (!projectUuid || readmeContent === null || readmeContent === undefined) {
    return { error: "Project UUID and README content are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[saveProjectReadmeAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to edit the README for this project. Your role: ${userRole || 'not a member'}.` };
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
   console.log("[toggleProjectUrgencyAction] Authenticated user:", session.user.uuid);

  const projectUuid = formData.get('projectUuid') as string;
  const isUrgent = formData.get('isUrgent') === 'true';

  if (!projectUuid) {
    return { error: "Project UUID is required." };
  }
  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[toggleProjectUrgencyAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
     if (!userRole || !['owner', 'co-owner'].includes(userRole)) {
      return { error: `You do not have permission to change urgency for this project. Your role: ${userRole || 'not a member'}.` };
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
  console.log("[toggleProjectVisibilityAction] Authenticated user:", session.user.uuid);

  const projectUuid = formData.get('projectUuid') as string;
  const isPrivate = formData.get('isPrivate') === 'true';

  if (!projectUuid) {
    return { error: "Project UUID is required." };
  }
  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    const globalUser = await dbGetUserByUuid(session.user.uuid); // Fetch full user details for global role check
    console.log(`[toggleProjectVisibilityAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}, Global role: ${globalUser?.role}`);

    if (userRole !== 'owner' && globalUser?.role !== 'admin') { 
      return { error: `Only project owners or admins can change project visibility. Your project role: ${userRole || 'not a member'}, global role: ${globalUser?.role || 'unknown'}.` };
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
   console.log("[toggleTaskPinAction] Authenticated user:", session.user.uuid);


  const taskUuid = formData.get('taskUuid') as string;
  const projectUuid = formData.get('projectUuid') as string; // Needed for permission check
  const isPinned = formData.get('isPinned') === 'true';

  if (!taskUuid || !projectUuid) {
    return { error: "Task UUID and Project UUID are required." };
  }

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    console.log(`[toggleTaskPinAction] User role for project ${projectUuid} (user ${session.user.uuid}): ${userRole}`);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: `You do not have permission to pin/unpin tasks in this project. Your role: ${userRole || 'not a member'}.` };
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
