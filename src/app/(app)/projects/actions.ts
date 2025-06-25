
'use server';

import type { Project } from "@/types";
import { 
    getProjectsForUser as dbGetProjectsForUser,
    getUserGithubOAuthToken,
    createProject,
    updateProjectGithubRepo,
    updateProjectVisibility,
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
