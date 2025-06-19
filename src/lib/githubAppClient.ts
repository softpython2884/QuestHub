
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit';

function getGitHubAppCredentialsOrThrow() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;
  // const clientId = process.env.GITHUB_CLIENT_ID; // Not directly used by App auth for server-to-server
  // const clientSecret = process.env.GITHUB_CLIENT_SECRET; // Not directly used by App auth for server-to-server

  if (!appId) throw new Error('GITHUB_APP_ID is not defined in environment variables.');
  if (!privateKey) throw new Error('GITHUB_PRIVATE_KEY is not defined in environment variables.');
  // if (!clientId) throw new Error('GITHUB_CLIENT_ID is not defined in environment variables.'); // Optional for now
  // if (!clientSecret) throw new Error('GITHUB_CLIENT_SECRET is not defined in environment variables.'); // Optional for now

  return {
    appId: Number(appId),
    privateKey: privateKey.replace(/\\n/g, '\n'), // Ensure newlines are correctly formatted if passed via env
    // clientId,
    // clientSecret,
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
    return app.getInstallationOctokit(installationId);
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

