
'use server';

import type { Project, ProjectMember, ProjectMemberRole, Task, TaskStatus } from '@/types';
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
} from '@/lib/db';
import { z } from 'zod';
import { auth } from '@/lib/authEdge'; // Assuming you'll create this for getting current user

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
  description: z.string().max(500, "Description cannot exceed 500 characters.").optional().or(z.literal('')),
  projectUuid: z.string().uuid("Invalid project UUID."),
});

export async function updateProjectAction(
  prevState: { error?: string; errors?: Record<string, string[] | undefined>; message?: string },
  formData: FormData
): Promise<{ error?: string; errors?: Record<string, string[] | undefined>; message?: string; project?: Project }> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

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
    if (project.ownerUuid !== session.user.uuid) {
        return { error: "You do not have permission to edit this project." };
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
  if (!session?.user?.uuid) return { error: "Authentication required." };
  
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
    
    if (project.ownerUuid !== session.user.uuid) { // Simplified: only owner can invite for now
      return { error: "You do not have permission to invite users to this project." };
    }

    const userToInvite = await dbGetUserByEmail(email);
    if (!userToInvite) {
      return { error: "User with this email not found." };
    }

    if (userToInvite.uuid === project.ownerUuid) {
      return { error: "Cannot invite the project owner with a different role. Owner role is fixed."};
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
    if (!session?.user?.uuid) return { error: "Authentication required." };

    if (!projectUuid || !userUuidToRemove) {
        return { error: "Project UUID and User UUID are required." };
    }
    try {
        const project = await dbGetProjectByUuid(projectUuid);
        if (!project) return { error: "Project not found." };

        if (project.ownerUuid !== session.user.uuid) { // Simplified: only owner can remove
            return { error: "You do not have permission to remove users." };
        }
        if (project.ownerUuid === userUuidToRemove) {
            return { error: "Project owner cannot be removed. Transfer ownership first." };
        }

        const success = await dbRemoveProjectMember(projectUuid, userUuidToRemove);
        if (success) {
            return { success: true, message: "User removed from project successfully." };
        }
        return { error: "Failed to remove user from project." };
    } catch (error: any) {
        console.error("Error removing user from project:", error);
        return { error: error.message || "An unexpected error occurred." };
    }
}


// Task Actions
const CreateTaskSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  title: z.string().min(1, "Title is required.").max(255),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
  assigneeUuid: z.string().uuid("Invalid assignee UUID.").optional().or(z.literal('')), // Empty string for "unassigned"
});

export interface CreateTaskFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  createdTask?: Task;
}

export async function createTaskAction(prevState: CreateTaskFormState, formData: FormData): Promise<CreateTaskFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

  const validatedFields = CreateTaskSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status'),
    assigneeUuid: formData.get('assigneeUuid'),
  });

  if (!validatedFields.success) {
    return { error: "Invalid input.", fieldErrors: validatedFields.error.flatten().fieldErrors };
  }

  const { projectUuid, title, description, status, assigneeUuid } = validatedFields.data;

  try {
    const userRole = await dbGetProjectMemberRole(projectUuid, session.user.uuid);
    if (!userRole || !['owner', 'co-owner', 'editor'].includes(userRole)) {
      return { error: "You do not have permission to create tasks in this project." };
    }

    const taskData = {
      projectUuid,
      title,
      description: description || undefined,
      status,
      assigneeUuid: assigneeUuid || null, // Convert empty string to null for DB
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
  projectUuid: z.string().uuid("Invalid project UUID."), // Needed for permission check
  status: z.enum(['To Do', 'In Progress', 'Done', 'Archived'] as [TaskStatus, ...TaskStatus[]]),
});

export interface UpdateTaskStatusFormState {
  message?: string;
  error?: string;
  updatedTask?: Task;
}

export async function updateTaskStatusAction(prevState: UpdateTaskStatusFormState, formData: FormData): Promise<UpdateTaskStatusFormState> {
  const session = await auth();
  if (!session?.user?.uuid) return { error: "Authentication required." };

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
    // Anyone in the project can update status as per initial simplified requirement
    if (!userRole) { 
      return { error: "You are not a member of this project or do not have permission to update task status." };
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
