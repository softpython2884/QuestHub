
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit'; // Ensure this is the main Octokit class
import fs from 'fs';
import path from 'path';

let appInstance: App | null = null;

console.log('[GitHubAppClient] Top-level: typeof Octokit import:', typeof Octokit);
if (Octokit && typeof Octokit === 'function') {
  console.log('[GitHubAppClient] Top-level: Octokit.prototype keys:', Object.getOwnPropertyNames(Octokit.prototype));
}


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
        console.warn(`[GitHubAppClient] Error reading GitHub private key from file ${absolutePath}: ${err.message}. Will check GITHUB_PRIVATE_KEY env var.`);
        privateKey = undefined; // Explicitly set to undefined if file read fails
      }
    } else {
      console.warn(`[GitHubAppClient] Private key file not found at specified GITHUB_PRIVATE_KEY_PATH: ${absolutePath}. Will check GITHUB_PRIVATE_KEY env var.`);
      privateKey = undefined;
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

// Simplified: Re-create app instance on each call for now to avoid staleness issues.
// We can optimize with a singleton later if needed.
async function getAppInstance(): Promise<App> {
  const { appId, privateKey, clientId, clientSecret } = getGitHubAppCredentialsOrThrow();
  console.log('[getAppInstance] Initializing GitHub App client instance...');
  try {
    const app = new App({
      appId,
      privateKey,
      oauth: { clientId, clientSecret },
      Octokit: Octokit, // Explicitly pass the Octokit constructor
    });
    console.log('[getAppInstance] GitHub App client instantiated with explicit Octokit.');
    if (!app || typeof app.getInstallationOctokit !== 'function') {
      console.error('[getAppInstance] Failed to instantiate GitHub App properly (missing getInstallationOctokit).');
      throw new Error('Failed to instantiate GitHub App client (missing getInstallationOctokit).');
    }
    // @ts-ignore
    if (typeof app.octokit !== 'function') {
        console.error('[getAppInstance] CRITICAL: app.octokit on the App instance is NOT a function. Type:', typeof app.octokit);
        // Even if app.octokit is not a function, app.getInstallationOctokit might still work if it uses the passed Octokit.
    } else {
        console.log('[getAppInstance] app.octokit on the App instance IS a function.');
    }
    return app;
  } catch (e: any) {
    console.error('[getAppInstance] Error during App instantiation:', e.message, e.stack);
    throw e;
  }
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = await getAppInstance();
  console.log(`[getInstallationOctokit] Attempting to get Octokit for installation ID: ${installationId}`);
  try {
    const installationOctokit = await app.getInstallationOctokit(installationId);
    console.log('[getInstallationOctokit] Successfully obtained installation Octokit instance from app.getInstallationOctokit.');
    
    console.log('[getInstallationOctokit] typeof installationOctokit:', typeof installationOctokit);
    if (installationOctokit && typeof installationOctokit === 'object') {
        const keys = Object.keys(installationOctokit);
        console.log('[getInstallationOctokit] installationOctokit (keys):', keys);
        console.log('[getInstallationOctokit] typeof installationOctokit.request:', typeof (installationOctokit as any).request);
        console.log('[getInstallationOctokit] typeof installationOctokit.graphql:', typeof (installationOctokit as any).graphql);
        console.log('[getInstallationOctokit] typeof installationOctokit.log:', typeof (installationOctokit as any).log);
        console.log('[getInstallationOctokit] typeof installationOctokit.hook:', typeof (installationOctokit as any).hook);
        console.log('[getInstallationOctokit] typeof installationOctokit.auth:', typeof (installationOctokit as any).auth);
        console.log('[getInstallationOctokit] typeof installationOctokit.rest:', typeof (installationOctokit as any).rest);
        if ((installationOctokit as any).rest) {
            console.log('[getInstallationOctokit] installationOctokit.rest (keys):', Object.keys((installationOctokit as any).rest));
        } else {
             console.warn('[getInstallationOctokit] installationOctokit.rest is undefined after obtaining instance.');
        }
    }

    if (!installationOctokit) {
        console.error('[getInstallationOctokit] app.getInstallationOctokit returned null or undefined!');
        throw new Error('app.getInstallationOctokit returned a falsy value, cannot proceed.');
    }
    // @ts-ignore
     if (!installationOctokit.rest) { 
        console.error('[getInstallationOctokit] CRITICAL: installationOctokit.rest is undefined AFTER obtaining instance WITH explicit Octokit!');
        throw new Error('Octokit instance from GitHub App (explicit Octokit) is missing .rest property after instantiation.');
    }
    return installationOctokit as Octokit;
  } catch (error: any) {
    console.error(`[getInstallationOctokit] Error during app.getInstallationOctokit or subsequent checks for installation ID ${installationId}:`, error.message, error.stack);
    throw new Error(`Failed to get a valid Octokit instance for installation ID ${installationId}. Original error: ${error.message}`);
  }
}

export async function getAppAuthOctokit(): Promise<Octokit> {
    const app = await getAppInstance();
    console.log('[getAppAuthOctokit] Attempting to get app-authenticated Octokit.');
    
    // @ts-ignore
    if (typeof app.octokit !== 'function') {
        console.error('[getAppAuthOctokit] app.octokit is not a function. Type:', typeof app.octokit, 'Value:', app.octokit);
        throw new Error('app.octokit is not a function on the App instance.');
    }

    // @ts-ignore
    const octokitInstance = await app.octokit();
    console.log('[getAppAuthOctokit] Successfully obtained app-authenticated Octokit instance.');

    if (!octokitInstance) {
        console.error('[getAppAuthOctokit] app.octokit() returned undefined after App instantiation.');
        throw new Error('Failed to get app-authenticated Octokit instance: app.octokit() is undefined.');
    }
    // @ts-ignore
    if (!octokitInstance.rest) {
        console.error('[getAppAuthOctokit] CRITICAL: App-authenticated Octokit instance is missing .rest property!');
        throw new Error('App-authenticated Octokit instance is missing .rest property.');
    }
    console.log('[getAppAuthOctokit] App-authenticated Octokit instance seems valid.');
    return octokitInstance as Octokit;
}
