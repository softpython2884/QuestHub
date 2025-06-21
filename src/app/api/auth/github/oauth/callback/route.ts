
import { type NextRequest, NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { storeUserGithubOAuthToken, getUserByEmail, createUser } from '@/lib/db';
import { createSessionForUser } from '@/lib/authService';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateFromGitHub = searchParams.get('state');

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !NEXT_PUBLIC_APP_URL) {
    console.error('[GitHub OAuth Callback] OAuth environment variables not configured.');
    return NextResponse.redirect(new URL('/login?error=oauth_config_error', request.url));
  }

  const storedStateCookie = request.cookies.get('github_oauth_state');
  request.cookies.delete('github_oauth_state');

  if (!storedStateCookie) {
    console.error('[GitHub OAuth Callback] Missing OAuth state cookie.');
    return NextResponse.redirect(new URL('/login?error=oauth_state_missing', request.url));
  }
  
  let storedStateData;
  try {
    storedStateData = JSON.parse(storedStateCookie.value);
  } catch (e) {
    console.error('[GitHub OAuth Callback] Error parsing OAuth state cookie:', e);
    return NextResponse.redirect(new URL('/login?error=oauth_state_invalid_parse', request.url));
  }

  if (!stateFromGitHub || stateFromGitHub !== storedStateData.csrf) {
    console.error('[GitHub OAuth Callback] OAuth state mismatch.', { stateFromGitHub, storedStateCSRF: storedStateData.csrf });
    return NextResponse.redirect(new URL('/login?error=oauth_state_mismatch', request.url));
  }

  if (!code) {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    console.error(`[GitHub OAuth Callback] Authorization failed on GitHub's side. Error: ${error}, Desc: ${errorDescription}`);
    return NextResponse.redirect(new URL(`/login?error=oauth_provider_error&message=${encodeURIComponent(errorDescription || error || 'Unknown GitHub error')}`, request.url));
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/auth/github/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`GitHub token exchange failed: ${await tokenResponse.text()}`);
    }
    const tokenData = await tokenResponse.json();
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || 'Failed to retrieve access token from GitHub.');
    }

    const octokit = new Octokit({ auth: tokenData.access_token });
    const { data: githubUser } = await octokit.rest.users.getAuthenticated();
    
    // Find primary, verified email
    const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
    const primaryEmail = emails.find(email => email.primary && email.verified)?.email;

    if (!primaryEmail) {
      return NextResponse.redirect(new URL('/login?error=github_no_verified_email', request.url));
    }

    let appUser: (User & { hashedPassword?: string }) | null = await getUserByEmail(primaryEmail);

    if (!appUser) {
      console.log(`[GitHub OAuth Callback] No user found for email ${primaryEmail}. Creating new user.`);
      const newUserInfo = await createUser(githubUser.name || githubUser.login, primaryEmail);
      appUser = { ...newUserInfo };
    } else {
      console.log(`[GitHub OAuth Callback] Found existing user for email ${primaryEmail}. Logging in.`);
    }

    if (!appUser || !appUser.uuid) {
      throw new Error("User session could not be established after DB operation.");
    }

    const { hashedPassword, ...userToReturn } = appUser;
    
    await createSessionForUser(userToReturn);
    await storeUserGithubOAuthToken(
      userToReturn.uuid,
      tokenData.access_token,
      tokenData.scope,
      tokenData.token_type,
      tokenData.refresh_token,
      tokenData.expires_in
    );
    
    console.log(`[GitHub OAuth Callback] Successfully logged in/signed up user ${userToReturn.email}. Redirecting to dashboard.`);
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error: any) {
    console.error('[GitHub OAuth Callback] Error in callback:', error);
    return NextResponse.redirect(new URL(`/login?error=oauth_callback_error&message=${encodeURIComponent(error.message || 'Unknown error')}`, request.url));
  }
}
