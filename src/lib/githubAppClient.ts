
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit';
import fs from 'fs';
import path from 'path';

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
        privateKey = undefined;
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
      errorMessage += 'GITHUB_PRIVATE_KEY environment variable was set but GITHUB_PRIVATE_KEY_PATH was not (this is unexpected if trying to prioritize file reading).';
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

// Singleton pattern for App instance to avoid re-instantiating on every call if not necessary,
// but currently re-instantiating to ensure fresh config, can be optimized later.
// let appInstance: App | null = null;

async function getAppInstance(): Promise<App> {
  // if (appInstance) {
  //   console.log('[getAppInstance] Returning cached GitHub App client instance.');
  //   return appInstance;
  // }
  const { appId, privateKey, clientId, clientSecret } = getGitHubAppCredentialsOrThrow();
  console.log('[getAppInstance] Initializing GitHub App client instance...');
  try {
    const app = new App({
      appId,
      privateKey,
      oauth: { clientId, clientSecret },
      Octokit: Octokit, // Explicitly pass the Octokit constructor from the 'octokit' package
    });
    console.log('[getAppInstance] GitHub App client instantiated with explicit Octokit.');
    if (!app || typeof app.getInstallationOctokit !== 'function') {
      console.error('[getAppInstance] Failed to instantiate GitHub App properly (missing getInstallationOctokit).');
      throw new Error('Failed to instantiate GitHub App client (missing getInstallationOctokit).');
    }
    
    // @ts-ignore app.octokit is a property, not a function according to latest error
    if (typeof app.octokit === 'function') {
        console.warn('[getAppInstance] app.octokit on the App instance IS a function. This is unexpected based on recent errors.');
    } else if (typeof app.octokit === 'object' && app.octokit !== null) {
        console.log('[getAppInstance] app.octokit on the App instance IS an object (expected).');
    } else {
        console.error('[getAppInstance] CRITICAL: app.octokit on the App instance is neither a function nor a valid object. Type:', typeof app.octokit);
    }
    // appInstance = app; // Cache the instance
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
    if (typeof app.octokit === 'function') {
        console.error('[getAppAuthOctokit] app.octokit is a function, this is unexpected. Type:', typeof app.octokit);
        throw new Error('app.octokit is a function on the App instance, but expected an object.');
    }

    // @ts-ignore
    const octokitInstance = app.octokit; // Access as a property
    
    if (!octokitInstance) {
        console.error('[getAppAuthOctokit] app.octokit is undefined or null after App instantiation.');
        throw new Error('Failed to get app-authenticated Octokit instance: app.octokit is falsy.');
    }
    
    console.log('[getAppAuthOctokit] Successfully obtained app-authenticated Octokit instance directly from app.octokit property.');

    // @ts-ignore
    if (!octokitInstance.rest) {
        console.error('[getAppAuthOctokit] CRITICAL: App-authenticated Octokit instance (from app.octokit property) is missing .rest property!');
        throw new Error('App-authenticated Octokit instance (from app.octokit property) is missing .rest property.');
    }
    console.log('[getAppAuthOctokit] App-authenticated Octokit instance (from app.octokit property) seems valid.');
    return octokitInstance as Octokit;
}
