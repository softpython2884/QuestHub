
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit';

function getGitHubAppCredentialsOrThrow() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = process.env.GITHUB_PRIVATE_KEY;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!appId) throw new Error('GITHUB_APP_ID is not defined in environment variables.');
  if (!privateKey) throw new Error('GITHUB_PRIVATE_KEY is not defined in environment variables.');
  if (!clientId) throw new Error('GITHUB_CLIENT_ID is not defined in environment variables.');
  if (!clientSecret) throw new Error('GITHUB_CLIENT_SECRET is not defined in environment variables.');
  
  return {
    appId: Number(appId),
    privateKey: privateKey.replace(/\\n/g, '\n'),
    clientId,
    clientSecret,
  };
}

export async function getOctokitApp(): Promise<App> {
  const { appId, privateKey, clientId, clientSecret } = getGitHubAppCredentialsOrThrow();
  // Ensure OAuth config is passed, though not directly used for installation tokens for repo actions yet
  const app = new App({
    appId,
    privateKey,
    oauth: { clientId, clientSecret },
  });
   if (!app || typeof app.getInstallationOctokit !== 'function') { 
    console.error('[getOctokitApp] Failed to instantiate GitHub App properly.');
    throw new Error('Failed to instantiate GitHub App client.');
  }
  console.log('[getOctokitApp] GitHub App client instantiated.');
  return app;
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app: App = await getOctokitApp();
  if (!installationId) {
    console.error('[getInstallationOctokit] installationId is required.');
    throw new Error('GitHub App installation ID is required to get an installation Octokit instance.');
  }
  console.log(`[getInstallationOctokit] Attempting to get Octokit for installation ID: ${installationId}`);
  try {
    const installationOctokit: Octokit = await app.getInstallationOctokit(installationId);
    console.log('[getInstallationOctokit] Successfully obtained installation Octokit instance from app.getInstallationOctokit.');
    
    // Enhanced Debugging:
    if (!installationOctokit) {
        console.error('[getInstallationOctokit] app.getInstallationOctokit returned null or undefined!');
        // This case should ideally be caught by an error from app.getInstallationOctokit if it fails,
        // but this explicit check handles unexpected falsy returns.
        throw new Error('app.getInstallationOctokit returned a falsy value, cannot proceed.');
    }
    console.log('[getInstallationOctokit] typeof installationOctokit:', typeof installationOctokit);
    console.log('[getInstallationOctokit] installationOctokit (keys):', Object.keys(installationOctokit));
    console.log('[getInstallationOctokit] typeof installationOctokit.request:', typeof installationOctokit.request);
    console.log('[getInstallationOctokit] typeof installationOctokit.rest:', typeof installationOctokit.rest);

    if (installationOctokit.rest) {
        console.log('[getInstallationOctokit] installationOctokit.rest (keys):', Object.keys(installationOctokit.rest));
        console.log('[getInstallationOctokit] typeof installationOctokit.rest.repos:', typeof installationOctokit.rest.repos);
        if (installationOctokit.rest.repos) {
            console.log('[getInstallationOctokit] typeof installationOctokit.rest.repos.createForAuthenticatedUser:', typeof installationOctokit.rest.repos.createForAuthenticatedUser);
            console.log('[getInstallationOctokit] typeof installationOctokit.rest.repos.createInOrg:', typeof installationOctokit.rest.repos.createInOrg);
        } else {
            console.error('[getInstallationOctokit] CRITICAL: installationOctokit.rest.repos is undefined!');
        }
    } else {
        console.error('[getInstallationOctokit] CRITICAL: installationOctokit.rest is undefined!');
    }
    
    return installationOctokit;
  } catch (error: any) {
    console.error(`[getInstallationOctokit] Error during app.getInstallationOctokit or subsequent checks for installation ID ${installationId}:`, error.message, error.stack);
    // Re-throw a more specific error or the original one
    throw new Error(`Failed to get a valid Octokit instance for installation ID ${installationId}. Original error: ${error.message}`);
  }
}


// For operations that the app performs on its own behalf (e.g., listing installations)
export async function getAppAuthOctokit(): Promise<Octokit> {
    const app = await getOctokitApp();
    if (!app.octokit) { 
        console.error('[getAppAuthOctokit] app.octokit is undefined after App instantiation.');
        throw new Error('Failed to get app-authenticated Octokit instance: app.octokit is undefined.');
    }
    console.log('[getAppAuthOctokit] Returning app.octokit');
    return app.octokit; 
}

