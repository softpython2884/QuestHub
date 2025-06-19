
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

export async function getInstallationOctokit(installationIdProvided?: number): Promise<Octokit> {
  const app = await getOctokitApp();
  let installationIdToUse = installationIdProvided;

  if (!installationIdToUse) {
    console.log('[getInstallationOctokit] No installationId provided, attempting to find the first available one for the app.');
    try {
      const installations = await app.octokit.request('GET /app/installations');
      if (installations.data.length > 0) {
        installationIdToUse = installations.data[0].id;
        console.log(`[getInstallationOctokit] Found and using installation ID: ${installationIdToUse} for account: ${installations.data[0].account?.login}`);
      } else {
        console.error('[getInstallationOctokit] GitHub App is not installed on any account.');
        throw new Error('FlowUp GitHub App does not seem to be installed on any account.');
      }
    } catch (error) {
      console.error('[getInstallationOctokit] Error fetching installations:', error);
      throw new Error('Failed to fetch GitHub App installations.');
    }
  }
  if (!installationIdToUse) {
    throw new Error('Could not determine a GitHub App installation ID to use.');
  }
  return app.getInstallationOctokit(installationIdToUse);
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
