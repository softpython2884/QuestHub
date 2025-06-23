'use server';

import { 
    getProjectByNameForUser,
    createProject,
    getUserGithubOAuthToken,
    updateProjectGithubRepo,
    updateProjectVisibility,
} from '@/lib/db';
import { getCurrentUserUuid } from '@/lib/authEdge';
import { Octokit } from 'octokit';
import type { Project } from '@/types';


const VAULT_PROJECT_NAME = "My Secure Vault";
const VAULT_REPO_NAME = "FlowUp-Secure-Vault";

async function findOrCreateGithubRepoForVault(octokit: Octokit, owner: string, projectDescription: string): Promise<{ html_url: string, full_name: string }> {
    try {
        console.log(`[Vault] Checking for existing repository '${owner}/${VAULT_REPO_NAME}'...`);
        const { data: repo } = await octokit.rest.repos.get({
            owner,
            repo: VAULT_REPO_NAME,
        });
        console.log(`[Vault] Repository '${VAULT_REPO_NAME}' already exists.`);
        return { html_url: repo.html_url, full_name: repo.full_name };
    } catch (error: any) {
        if (error.status === 404) {
            console.log(`[Vault] Repository '${VAULT_REPO_NAME}' does not exist. Creating...`);
            const { data: createdRepo } = await octokit.rest.repos.createForAuthenticatedUser({
                name: VAULT_REPO_NAME,
                private: true,
                description: projectDescription,
                auto_init: true,
            });
            console.log(`[Vault] Successfully created repository: ${createdRepo.html_url}`);
            return { html_url: createdRepo.html_url, full_name: createdRepo.full_name };
        } else {
            console.error(`[Vault] GitHub API error checking/creating repository:`, error);
            throw new Error(`GitHub API Error: ${error.message}`);
        }
    }
}


export async function getOrCreateSecureVaultProjectAction(): Promise<{ projectUuid?: string; error?: string }> {
    const userUuid = await getCurrentUserUuid();
    if (!userUuid) {
        return { error: 'Authentication required. Please log in.' };
    }

    try {
        let project = await getProjectByNameForUser(VAULT_PROJECT_NAME, userUuid);
        const oauthToken = await getUserGithubOAuthToken(userUuid);
        
        if (!oauthToken?.accessToken) {
            return { error: 'Your GitHub account is not connected. Please connect it on your profile page to use the Secure Vault.' };
        }
        
        const octokit = new Octokit({ auth: oauthToken.accessToken });
        const { data: { login: githubOwner } } = await octokit.rest.users.getAuthenticated();
        
        if (project && !project.githubRepoName) {
             console.log(`[Vault] Existing vault project is not linked to GitHub. Linking now...`);
             const repoDetails = await findOrCreateGithubRepoForVault(octokit, githubOwner, `Secure storage for FlowUp project: ${VAULT_PROJECT_NAME}`);
             project = await updateProjectGithubRepo(project.uuid, repoDetails.html_url, repoDetails.full_name);
             if (!project) throw new Error("Failed to link GitHub repo to existing vault project.");
             return { projectUuid: project.uuid };
        }

        if (project) {
            console.log(`[Vault] Found existing vault project for user ${userUuid}`);
            return { projectUuid: project.uuid };
        }

        console.log(`[Vault] No vault project found for user ${userUuid}. Creating new one.`);
        
        const newProject = await createProject(
            VAULT_PROJECT_NAME,
            "A secure, private repository for storing sensitive credentials, API keys, and notes, managed by FlowUp.",
            userUuid
        );
        // Ensure it's private (createProject sets it to private by default, this is a safeguard)
        await updateProjectVisibility(newProject.uuid, true);
        
        const repoDetails = await findOrCreateGithubRepoForVault(octokit, githubOwner, `Secure storage for FlowUp project: ${newProject.name}`);
        const finalProject = await updateProjectGithubRepo(newProject.uuid, repoDetails.html_url, repoDetails.full_name);

        if (!finalProject) {
            throw new Error("Failed to link GitHub repository after creating the vault project.");
        }
        
        console.log(`[Vault] Successfully created and linked vault project ${finalProject.uuid}`);
        return { projectUuid: finalProject.uuid };

    } catch (error: any) {
        console.error('[Vault] Error in getOrCreateSecureVaultProjectAction:', error);
        return { error: error.message || 'An unexpected error occurred while initializing the Secure Vault.' };
    }
}
