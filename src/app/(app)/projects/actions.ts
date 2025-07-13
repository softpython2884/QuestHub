
'use server';

import type { Project } from "@/types";
import { 
    getProjectsForUser as dbGetProjectsForUser,
    getUserGithubOAuthToken,
    createProject,
    updateProjectGithubRepo,
    updateProjectVisibility,
    deleteProject,
    getProjectMemberRole,
    getProjectByUuid,
} from "@/lib/db";
import { auth } from "@/lib/authEdge";
import { Octokit } from "octokit";
import { revalidatePath } from "next/cache";


export interface LinkableGithubRepo {
  fullName: string;
  name: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
}

export async function fetchProjectsAction(userUuid: string | undefined): Promise<Project[]> {
  if (!userUuid) return [];
  try {
    return await dbGetProjectsForUser(userUuid);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}

export async function getLinkableGithubReposAction(): Promise<{ repos?: LinkableGithubRepo[]; error?: string }> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { error: "Authentication required." };
  }
  
  const oauthToken = await getUserGithubOAuthToken(session.user.uuid);
  if (!oauthToken?.accessToken) {
    return { error: "Your GitHub account is not connected. Please connect it on your profile page." };
  }

  try {
    const octokit = new Octokit({ auth: oauthToken.accessToken });
    const { data: githubRepos } = await octokit.rest.repos.listForAuthenticatedUser({
      type: 'owner', // Or 'all' if you want to include repos they are collaborators on
      per_page: 100,
      sort: 'updated',
    });

    const existingFlowUpProjects = await dbGetProjectsForUser(session.user.uuid);
    const existingRepoNames = new Set(existingFlowUpProjects.map(p => p.githubRepoName).filter(Boolean));

    const linkableRepos = githubRepos
      .filter(repo => !existingRepoNames.has(repo.full_name))
      .map(repo => ({
        fullName: repo.full_name,
        name: repo.name,
        description: repo.description,
        private: repo.private,
        htmlUrl: repo.html_url,
      }));
    
    return { repos: linkableRepos };

  } catch (error: any) {
    console.error("Error getting linkable repos from GitHub:", error);
    let errorMessage = "An unexpected error occurred while fetching repositories from GitHub.";
     if (error.status === 401) {
        errorMessage = "GitHub authentication failed. Your token might be invalid or expired. Please try reconnecting your GitHub account from your profile page."
    } else if (error.message) {
        errorMessage = error.message;
    }
    return { error: errorMessage };
  }
}

export async function createProjectFromRepoAction(repo: LinkableGithubRepo): Promise<{ project?: Project; error?: string }> {
    const session = await auth();
    if (!session?.user?.uuid) {
        return { error: "Authentication required." };
    }
    try {
        const newProject = await createProject(
            repo.name,
            repo.description || undefined,
            session.user.uuid
        );

        const updatedProjectWithRepo = await updateProjectGithubRepo(
            newProject.uuid,
            repo.htmlUrl,
            repo.fullName
        );
        if (!updatedProjectWithRepo) throw new Error("Failed to link GitHub repo.");
        
        const finalProject = await updateProjectVisibility(newProject.uuid, repo.private);
        if (!finalProject) throw new Error("Failed to set project visibility.");

        revalidatePath('/projects');
        return { project: finalProject };
    } catch (error: any) {
        console.error(`Error creating project from repo ${repo.fullName}:`, error);
        return { error: error.message || "An unexpected error occurred." };
    }
}

export async function importFlowUpProjectsAction(): Promise<{
  success: boolean;
  successCount: number;
  errorCount: number;
  error?: string;
}> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { success: false, successCount: 0, errorCount: 0, error: "Authentication required." };
  }

  try {
    const reposResult = await getLinkableGithubReposAction();
    if (reposResult.error || !reposResult.repos) {
      return { success: false, successCount: 0, errorCount: 0, error: reposResult.error || "Could not fetch repositories." };
    }
    
    const flowupRepos = reposResult.repos.filter(repo => 
      repo.name.toLowerCase().includes('flowup')
    );

    if (flowupRepos.length === 0) {
      return { success: true, successCount: 0, errorCount: 0, error: "No new 'FlowUp' repositories found to import." };
    }

    let successCount = 0;
    let errorCount = 0;

    for (const repo of flowupRepos) {
      const result = await createProjectFromRepoAction(repo);
      if (result.project) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Failed to import repo ${repo.fullName}:`, result.error);
      }
    }
    
    revalidatePath('/projects');
    return { success: true, successCount, errorCount };

  } catch (error: any) {
    console.error("Error during bulk import:", error);
    return { success: false, successCount: 0, errorCount: 0, error: error.message || "An unexpected error occurred during bulk import." };
  }
}

export async function batchUpdateProjectsAction(
  projectUuids: string[],
  action: 'makePrivate' | 'makePublic' | 'delete'
): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
  const session = await auth();
  if (!session?.user?.uuid) {
    throw new Error("Authentication required.");
  }
  const userUuid = session.user.uuid;

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (const uuid of projectUuids) {
    try {
      const project = await getProjectByUuid(uuid);
      if (!project) {
        errors.push(`Project with ID ${uuid} not found.`);
        errorCount++;
        continue;
      }
      
      const role = await getProjectMemberRole(uuid, userUuid);
      if (role !== 'owner') {
        errors.push(`You do not have permission to modify "${project.name}".`);
        errorCount++;
        continue;
      }

      if (action === 'makePrivate') {
        await updateProjectVisibility(uuid, true);
        successCount++;
      } else if (action === 'makePublic') {
        await updateProjectVisibility(uuid, false);
        successCount++;
      } else if (action === 'delete') {
        await deleteProject(uuid);
        successCount++;
      }
    } catch (e: any) {
      errors.push(`Failed to update project ${uuid}: ${e.message}`);
      errorCount++;
    }
  }

  if (successCount > 0) {
    revalidatePath('/projects');
  }

  return { successCount, errorCount, errors };
}
