
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit'; // Gardons l'import pour le typage, mais ne le passons plus au constructeur App
import fs from 'fs';
import path from 'path';

// Gardons une seule instance de App pour éviter de la recréer à chaque appel
let appInstance: App | null = null;

function getGitHubAppCredentialsOrThrow() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKeyPath = process.env.GITHUB_PRIVATE_KEY_PATH;
  const privateKeyEnvVar = process.env.GITHUB_PRIVATE_KEY;
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  let privateKey: string | undefined;

  if (privateKeyPath) {
    const absolutePath = path.resolve(process.cwd(), privateKeyPath);
    if (fs.existsSync(absolutePath)) {
      try {
        privateKey = fs.readFileSync(absolutePath, 'utf8');
        console.log(`[GitHubAppClient] Loaded private key from path: ${absolutePath}`);
      } catch (err: any) {
        console.warn(`[GitHubAppClient] Error reading GitHub private key from file ${absolutePath}: ${err.message}. Will try GITHUB_PRIVATE_KEY env var if available.`);
      }
    } else {
      console.warn(`[GitHubAppClient] Private key file not found at specified GITHUB_PRIVATE_KEY_PATH: ${absolutePath}. Will try GITHUB_PRIVATE_KEY env var if available.`);
    }
  }

  if (!privateKey && privateKeyEnvVar) {
    privateKey = privateKeyEnvVar.replace(/\\n/g, '\n');
    console.log('[GitHubAppClient] Loaded private key from GITHUB_PRIVATE_KEY environment variable.');
  }

  if (!appId) throw new Error('GITHUB_APP_ID is not defined in environment variables.');
  if (!privateKey) {
     let errorMessage = 'Failed to load GitHub private key. ';
    if (privateKeyPath && !privateKeyEnvVar) {
      errorMessage += `Checked GITHUB_PRIVATE_KEY_PATH (${privateKeyPath}) but file was not found or was unreadable, and GITHUB_PRIVATE_KEY environment variable was not set.`;
    } else if (!privateKeyPath && privateKeyEnvVar) {
      errorMessage += 'GITHUB_PRIVATE_KEY environment variable was set but GITHUB_PRIVATE_KEY_PATH was not (unexpected if trying to prioritize file).';
    } else if (privateKeyPath && privateKeyEnvVar) {
        errorMessage += `Attempted to load from GITHUB_PRIVATE_KEY_PATH (${privateKeyPath}) first, but failed, and also checked GITHUB_PRIVATE_KEY. Ensure one is correctly configured.`;
    } else {
        errorMessage += 'Neither GITHUB_PRIVATE_KEY_PATH nor GITHUB_PRIVATE_KEY environment variable was set or resulted in a valid key.';
    }
    throw new Error(errorMessage);
  }
  if (!clientId) throw new Error('GITHUB_CLIENT_ID is not defined in environment variables.');
  if (!clientSecret) throw new Error('GITHUB_CLIENT_SECRET is not defined in environment variables.');

  return {
    appId: Number(appId),
    privateKey,
    clientId,
    clientSecret,
  };
}

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
    // NE PAS PASSER Octokit: Octokit explicitement pour cette tentative
  });
  console.log('[getAppInstance] GitHub App client instantiated.');
  if (!appInstance || typeof appInstance.getInstallationOctokit !== 'function') {
    console.error('[getAppInstance] Failed to instantiate GitHub App properly.');
    throw new Error('Failed to instantiate GitHub App client.');
  }
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
        if ((installationOctokit as any).rest) {
            console.log('[getInstallationOctokit] installationOctokit.rest (keys):', Object.keys((installationOctokit as any).rest));
        }
    }

    if (!installationOctokit) {
        console.error('[getInstallationOctokit] app.getInstallationOctokit returned null or undefined!');
        throw new Error('app.getInstallationOctokit returned a falsy value, cannot proceed.');
    }
    // @ts-ignore
     if (!installationOctokit.rest) { // Check again after logging
        console.error('[getInstallationOctokit] CRITICAL: installationOctokit.rest is undefined AFTER obtaining instance!');
        throw new Error('Octokit instance from GitHub App is missing .rest property after instantiation.');
    }
    return installationOctokit as Octokit;
  } catch (error: any) {
    console.error(`[getInstallationOctokit] Error during app.getInstallationOctokit or subsequent checks for installation ID ${installationId}:`, error.message, error.stack);
    throw new Error(`Failed to get a valid Octokit instance for installation ID ${installationId}. Original error: ${error.message}`);
  }
}

export async function getAppAuthOctokit(): Promise<Octokit> {
    const app = await getAppInstance();
    console.log('[getAppAuthOctokit] Attempting to get app-authenticated Octokit via app.octokit()');
    // @ts-ignore
    const octokit = await app.octokit();
    console.log('[getAppAuthOctokit] Successfully obtained app-authenticated Octokit instance.');

    if (!octokit) {
        console.error('[getAppAuthOctokit] app.octokit() returned undefined after App instantiation.');
        throw new Error('Failed to get app-authenticated Octokit instance: app.octokit() is undefined.');
    }
    // @ts-ignore
    if (!octokit.rest) {
        console.error('[getAppAuthOctokit] CRITICAL: App-authenticated Octokit instance is missing .rest property!');
        throw new Error('App-authenticated Octokit instance is missing .rest property.');
    }
    console.log('[getAppAuthOctokit] App-authenticated Octokit instance seems valid.');
    return octokit as Octokit;
}
