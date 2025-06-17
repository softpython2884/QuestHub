
'use server';

import type { Project, ProjectMember, ProjectMemberRole } from '@/types';
import {
  getProjectByUuid as dbGetProjectByUuid,
  getUserByUuid as dbGetUserByUuid,
  updateProjectDetails as dbUpdateProjectDetails,
  addProjectMember as dbAddProjectMember,
  getProjectMembers as dbGetProjectMembers,
  getUserByEmail as dbGetUserByEmail,
  removeProjectMember as dbRemoveProjectMember
} from '@/lib/db';
import { z } from 'zod';

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
    // TODO: Add permission check here - ensure current user is the owner
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


// Invite User Action
export interface InviteUserFormState {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  invitedMember?: ProjectMember;
}

const InviteUserSchema = z.object({
  projectUuid: z.string().uuid("Invalid project UUID."),
  email: z.string().email("Invalid email address."),
  role: z.enum(['co-owner', 'editor', 'viewer'] as [ProjectMemberRole, ...ProjectMemberRole[]]), // Ensure all ProjectMemberRole values except 'owner' are here
});


export async function inviteUserToProjectAction(
  prevState: InviteUserFormState,
  formData: FormData
): Promise<InviteUserFormState> {
  const validatedFields = InviteUserSchema.safeParse({
    projectUuid: formData.get('projectUuid'),
    email: formData.get('emailToInvite'), // Make sure this matches the input name in the form
    role: formData.get('roleToInvite'),   // Make sure this matches the select name in the form
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }
  const { projectUuid, email, role } = validatedFields.data;

  try {
    // TODO: Implement robust permission check: only project owner/co-owner can invite
    const project = await dbGetProjectByUuid(projectUuid);
    if (!project) return { error: "Project not found." };
    // Example: const { user } = useAuth(); // This hook cannot be used in server actions. Get current user differently.
    // if (project.ownerUuid !== currentUserId /* && !isCoOwner(currentUserId, projectUuid) */) {
    //   return { error: "You do not have permission to invite users to this project." };
    // }

    const userToInvite = await dbGetUserByEmail(email);
    if (!userToInvite) {
      return { error: "User with this email not found." };
    }

    if (userToInvite.uuid === project.ownerUuid) {
      return { error: "Cannot invite the project owner with a different role. Owner role is fixed."};
    }
    
    // Check if user is already a member
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
    if (!projectUuid || !userUuidToRemove) {
        return { error: "Project UUID and User UUID are required." };
    }
    // Add permission check: only owner/co-owner can remove. Owner cannot remove themselves.
    try {
        const project = await dbGetProjectByUuid(projectUuid);
        if (!project) return { error: "Project not found." };

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
