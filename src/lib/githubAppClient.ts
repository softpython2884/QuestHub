
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit';
import fs from 'fs';
import path from 'path';

function getGitHubAppCredentialsOrThrow() {
  const appId = process.env.GITHUB_APP_ID;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
  const privateKeyEnvVar = process.env.GITHUB_PRIVATE_KEY;

  if (!appId) throw new Error('GITHUB_APP_ID is not defined in environment variables.');
  if (!clientId) throw new Error('GITHUB_CLIENT_ID is not defined in environment variables.');
  if (!clientSecret) throw new Error('GITHUB_CLIENT_SECRET is not defined in environment variables.');

  let privateKey: string | undefined;

  if (privateKeyPath) {
    const absolutePath = path.resolve(process.cwd(), privateKeyPath);
    if (fs.existsSync(absolutePath)) {
      try {
        privateKey = fs.readFileSync(absolutePath, 'utf8');
        console.log(`[GitHubAppClient] Loaded private key from path: ${absolutePath}`);
      } catch (err: any) {
        throw new Error(`Error reading GitHub private key from file ${absolutePath}: ${err.message}`);
      }
    } else {
      // Path is defined, but file not found. Try GITHUB_PRIVATE_KEY env var as a fallback.
      console.warn(`[GitHubAppClient] Private key file not found at specified GITHUB_PRIVATE_KEY_PATH: ${absolutePath}. Attempting to use GITHUB_PRIVATE_KEY env var.`);
    }
  }

  // If privateKey is still not set (either path wasn't provided, or file not found at path)
  if (!privateKey && privateKeyEnvVar) {
    privateKey = privateKeyEnvVar.replace(/\\n/g, '\n');
    console.log('[GitHubAppClient] Loaded private key from GITHUB_PRIVATE_KEY environment variable.');
  }

  // Final check if privateKey was successfully loaded either way
  if (!privateKey) {
    let errorMessage = 'Failed to load GitHub private key. ';
    if (privateKeyPath) {
      errorMessage += `Checked GITHUB_PRIVATE_KEY_PATH (${privateKeyPath}) but file was not found or was unreadable, and GITHUB_PRIVATE_KEY environment variable was not set as a fallback.`;
    } else {
      errorMessage += 'Neither GITHUB_PRIVATE_KEY_PATH nor GITHUB_PRIVATE_KEY environment variable was set.';
    }
    throw new Error(errorMessage);
  }

  return {
    appId: Number(appId),
    privateKey,
    clientId,
    clientSecret,
  };
}

let appInstance: App | null = null;

async function getOctokitApp(): Promise<App> {
  if (appInstance) {
    return appInstance;
  }
  const { appId, privateKey, clientId, clientSecret } = getGitHubAppCredentialsOrThrow();
  console.log('[getOctokitApp] Initializing GitHub App client instance.');
  appInstance = new App({
    appId,
    privateKey,
    oauth: { clientId, clientSecret },
    Octokit: Octokit, // Explicitly pass the Octokit class
  });
  if (!appInstance || typeof appInstance.getInstallationOctokit !== 'function') {
    console.error('[getOctokitApp] Failed to instantiate GitHub App properly.');
    throw new Error('Failed to instantiate GitHub App client.');
  }
  console.log('[getOctokitApp] GitHub App client instantiated.');
  return appInstance;
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = await getOctokitApp();
  console.log(`[getInstallationOctokit] Attempting to get Octokit for installation ID: ${installationId}`);
  try {
    const installationOctokit = await app.getInstallationOctokit(installationId);
    console.log('[getInstallationOctokit] Successfully obtained installation Octokit instance from app.getInstallationOctokit.');
    console.log('[getInstallationOctokit] typeof installationOctokit:', typeof installationOctokit);
    
    if (installationOctokit && typeof installationOctokit === 'object') {
        console.log('[getInstallationOctokit] installationOctokit (keys):', Object.keys(installationOctokit));
        console.log('[getInstallationOctokit] typeof installationOctokit.request:', typeof (installationOctokit as any).request);
        console.log('[getInstallationOctokit] typeof installationOctokit.graphql:', typeof (installationOctokit as any).graphql);
        console.log('[getInstallationOctokit] typeof installationOctokit.log:', typeof (installationOctokit as any).log);
        console.log('[getInstallationOctokit] typeof installationOctokit.hook:', typeof (installationOctokit as any).hook);
        console.log('[getInstallationOctokit] typeof installationOctokit.auth:', typeof (installationOctokit as any).auth);
        console.log('[getInstallationOctokit] typeof installationOctokit.rest:', typeof (installationOctokit as any).rest);
    }

    if (!installationOctokit) {
        console.error('[getInstallationOctokit] app.getInstallationOctokit returned null or undefined!');
        throw new Error('app.getInstallationOctokit returned a falsy value, cannot proceed.');
    }
     if (!(installationOctokit as any).rest) {
        console.error('[getInstallationOctokit] CRITICAL: installationOctokit.rest is undefined AFTER AWAIT and explicit Octokit class passing!');
        console.error('[getInstallationOctokit] This suggests a deeper issue with Octokit plugin loading in this environment or with the @octokit/app library version.');
         throw new Error('Octokit instance from GitHub App is missing .rest property.');
    }
    return installationOctokit as Octokit;
  } catch (error: any) {
    console.error(`[getInstallationOctokit] Error during app.getInstallationOctokit or subsequent checks for installation ID ${installationId}:`, error.message, error.stack);
    throw new Error(`Failed to get a valid Octokit instance for installation ID ${installationId}. Original error: ${error.message}`);
  }
}

// For operations that the app performs on its own behalf (e.g., listing installations)
export async function getAppAuthOctokit(): Promise<Octokit> {
    const app = await getOctokitApp();
    const octokit = await app.octokit() 
    if (!octokit) {
        console.error('[getAppAuthOctokit] app.octokit() returned undefined after App instantiation.');
        throw new Error('Failed to get app-authenticated Octokit instance: app.octokit() is undefined.');
    }
     if (!(octokit as any).rest) {
        console.error('[getAppAuthOctokit] CRITICAL: App-authenticated Octokit instance is missing .rest property!');
    }
    console.log('[getAppAuthOctokit] Returning app.octokit()');
    return octokit as Octokit;
}
