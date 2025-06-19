
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit'; // Ensure we are using the full Octokit
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

  let privateKey: string;
  if (privateKeyPath) {
    const absolutePath = path.resolve(process.cwd(), privateKeyPath);
    if (fs.existsSync(absolutePath)) {
      privateKey = fs.readFileSync(absolutePath, 'utf8');
      console.log(`[GitHubAppClient] Loaded private key from path: ${absolutePath}`);
    } else {
      throw new Error(`GitHub private key file not found at path specified by GITHUB_PRIVATE_KEY_PATH: ${absolutePath}`);
    }
  } else if (privateKeyEnvVar) {
    privateKey = privateKeyEnvVar.replace(/\\n/g, '\n');
    console.log('[GitHubAppClient] Loaded private key from GITHUB_PRIVATE_KEY environment variable.');
  } else {
    throw new Error('Either GITHUB_PRIVATE_KEY_PATH or Github_PRIVATE_KEY must be defined in environment variables.');
  }

  return {
    appId: Number(appId),
    privateKey,
    clientId,
    clientSecret,
  };
}

let appInstance: App | null = null;

async function getAppInstance(): Promise<App> {
  if (appInstance) {
    return appInstance;
  }
  const { appId, privateKey, clientId, clientSecret } = getGitHubAppCredentialsOrThrow();
  console.log('[getAppInstance] Initializing GitHub App client instance.');
  appInstance = new App({
    appId,
    privateKey,
    oauth: { clientId, clientSecret },
    Octokit: Octokit, // Explicitly pass the Octokit class we imported
  });
  if (!appInstance || typeof appInstance.getInstallationOctokit !== 'function') {
    console.error('[getAppInstance] Failed to instantiate GitHub App properly.');
    throw new Error('Failed to instantiate GitHub App client.');
  }
  console.log('[getAppInstance] GitHub App client instance initialized.');
  return appInstance;
}


export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = await getAppInstance();
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
    const app = await getAppInstance();
    const octokit = await app.octokit() // app.octokit is now a method that returns a promise
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
