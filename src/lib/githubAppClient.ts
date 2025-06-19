
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit';

function getGitHubAppCredentialsOrThrow() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;

  if (!appId) throw new Error('GITHUB_APP_ID is not defined in environment variables.');
  if (!privateKey) throw new Error('GITHUB_PRIVATE_KEY is not defined in environment variables.');
  
  return {
    appId: Number(appId),
    privateKey: privateKey.replace(/\\n/g, '\n'),
  };
}

export async function getOctokitApp(): Promise<App> {
  const { appId, privateKey } = getGitHubAppCredentialsOrThrow();
  return new App({
    appId,
    privateKey,
  });
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = await getOctokitApp();
   if (!installationId) {
    console.error('[getInstallationOctokit] installationId is required.');
    throw new Error('GitHub App installation ID is required to get an installation Octokit instance.');
  }
  console.log(`[getInstallationOctokit] Getting Octokit for installation ID: ${installationId}`);
  try {
    // Correction: app.getInstallationOctokit est aussi async et doit être attendue
    const installationOctokit = await app.getInstallationOctokit(installationId);
    console.log('[getInstallationOctokit] Successfully obtained installation Octokit.');
    return installationOctokit;
  } catch (error) {
    console.error(`[getInstallationOctokit] Error getting Octokit for installation ID ${installationId}:`, error);
    throw new Error(`Failed to get Octokit instance for installation ID ${installationId}.`);
  }
}


// For operations that the app performs on its own behalf (e.g., listing installations)
export async function getAppAuthOctokit(): Promise<Octokit> {
    const { appId, privateKey } = getGitHubAppCredentialsOrThrow();
    const app = new App({
        appId,
        privateKey,
    });
    return app.octokit; // This is an Octokit instance authenticated as the app itself using its JWT
}
