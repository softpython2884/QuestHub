
'use server';

import type { Project } from "@/types";
import { 
    getProjectsForUser as dbGetProjectsForUser,
    getUserGithubOAuthToken,
    createProject,
    updateProjectGithubRepo,
    updateProjectVisibility
} from "@/lib/db";
import { auth } from "@/lib/authEdge";
import { Octokit } from "octokit";
import { revalidatePath } from "next/cache";

export async function fetchProjectsAction(userUuid: string | undefined): Promise<Project[]> {
  if (!userUuid) return [];
  try {
    return await dbGetProjectsForUser(userUuid);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}

export async function importProjectsFromGithubAction(): Promise<{
  success: boolean;
  error?: string;
  importedCount?: number;
}> {
  const session = await auth();
  if (!session?.user?.uuid) {
    return { success: false, error: "Authentication required." };
  }
  const userUuid = session.user.uuid;

  try {
    const oauthToken = await getUserGithubOAuthToken(userUuid);
    if (!oauthToken?.accessToken) {
      return { success: false, error: "Your GitHub account is not connected. Please connect it on your profile page." };
    }

    const octokit = new Octokit({ auth: oauthToken.accessToken });
    const { data: githubRepos } = await octokit.rest.repos.listForAuthenticatedUser({
      type: 'owner',
      per_page: 100,
    });

    const existingFlowUpProjects = await dbGetProjectsForUser(userUuid);
    const existingRepoNames = new Set(existingFlowUpProjects.map(p => p.githubRepoName).filter(Boolean));

    const reposToImport = githubRepos.filter(repo => 
      repo.name.toLowerCase().startsWith('flowup') && 
      !existingRepoNames.has(repo.full_name)
    );

    if (reposToImport.length === 0) {
      return { success: true, importedCount: 0 };
    }

    let importedCount = 0;
    for (const repo of reposToImport) {
      const newProject = await createProject(
        repo.name,
        repo.description || undefined,
        userUuid
      );
      
      await updateProjectGithubRepo(
        newProject.uuid,
        repo.html_url,
        repo.full_name
      );
      
      await updateProjectVisibility(newProject.uuid, repo.private);
      
      importedCount++;
    }

    revalidatePath('/projects');
    return { success: true, importedCount };

  } catch (error: any) {
    console.error("Error importing projects from GitHub:", error);
    let errorMessage = "An unexpected error occurred while importing from GitHub.";
    if (error.status === 401) {
        errorMessage = "GitHub authentication failed. Your token might be invalid or expired. Please try reconnecting your GitHub account from your profile page."
    } else if (error.message) {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
