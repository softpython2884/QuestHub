
'use server';

import { App } from '@octokit/app';
import { Octokit } from 'octokit';
import fs from 'fs';
import path from 'path';

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
      } catch (err: any) {
        console.warn(`[GitHubAppClient] Could not read private key from ${absolutePath}. Falling back to env var.`);
        privateKey = undefined; 
      }
    } else {
      privateKey = undefined;
    }
  }

  if (!privateKey && privateKeyEnvVar) {
    privateKey = privateKeyEnvVar.replace(/\\n/g, '\n');
  }
  
  if (!appId) throw new Error('GITHUB_APP_ID is not defined in environment variables.');
  if (!privateKey) throw new Error('GitHub App private key is not configured. Set GITHUB_PRIVATE_KEY in your environment variables.');
  if (!clientId) throw new Error('GITHUB_CLIENT_ID is not defined in environment variables.');
  if (!clientSecret) throw new Error('GITHUB_CLIENT_SECRET is not defined in environment variables.');

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
  
  try {
    appInstance = new App({
      appId,
      privateKey,
      oauth: { clientId, clientSecret },
      Octokit: Octokit, 
    });
    return appInstance;
  } catch (e: any) {
    console.error('[getAppInstance] Error during App instantiation:', e.message);
    throw e;
  }
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = await getAppInstance();
  try {
    const installationOctokit = await app.getInstallationOctokit(installationId);
    if (!installationOctokit) {
        throw new Error('app.getInstallationOctokit returned a falsy value.');
    }
    if (!(installationOctokit as any).rest) { 
        throw new Error('Octokit instance from GitHub App is missing .rest property.');
    }
    return installationOctokit as Octokit;
  } catch (error: any) {
    console.error(`[getInstallationOctokit] Error getting Octokit for installation ID ${installationId}:`, error.message);
    throw new Error(`Failed to get a valid Octokit instance for installation ID ${installationId}.`);
  }
}

export async function getAppAuthOctokit(): Promise<Octokit> {
    const app = await getAppInstance();
    const octokitInstance = app.octokit; 
    
    if (!octokitInstance) {
        throw new Error('Failed to get app-authenticated Octokit instance: app.octokit is falsy.');
    }
    
    if (!(octokitInstance as any).rest) {
        throw new Error('App-authenticated Octokit instance is missing .rest property.');
    }
    return octokitInstance as Octokit;
}
