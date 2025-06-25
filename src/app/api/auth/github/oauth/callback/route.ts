
import { type NextRequest, NextResponse } from 'next/server';
import { Octokit } from 'octokit';
import { storeUserGithubOAuthToken, getUserByEmail, createUser } from '@/lib/db';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { auth } from '@/lib/authEdge';
import type { User } from '@/types';
import { sendDiscordDirectMessage } from '@/lib/discord';

const AUTH_COOKIE_NAME = 'flowup_auth_token';

const getJwtSecretOrThrow = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return secret;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateFromGitHub = searchParams.get('state');

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !NEXT_PUBLIC_APP_URL) {
    console.error('[GitHub OAuth Callback] OAuth environment variables not configured.');
    const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL || request.url);
    errorUrl.searchParams.set('error', 'oauth_config_error');
    return NextResponse.redirect(errorUrl);
  }

  const storedStateCookie = request.cookies.get('github_oauth_state');
  
  let storedStateData;
  if(storedStateCookie) {
    try {
        storedStateData = JSON.parse(storedStateCookie.value);
    } catch (e) {
        console.error('[GitHub OAuth Callback] Error parsing OAuth state cookie:', e);
        const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
        errorUrl.searchParams.set('error', 'oauth_state_invalid_parse');
        return NextResponse.redirect(errorUrl);
    }
  } else {
    console.error('[GitHub OAuth Callback] Missing OAuth state cookie.');
    const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set('error', 'oauth_state_missing');
    return NextResponse.redirect(errorUrl);
  }

  if (!stateFromGitHub || stateFromGitHub !== storedStateData.csrf) {
    console.error('[GitHub OAuth Callback] OAuth state mismatch.', { stateFromGitHub, storedStateCSRF: storedStateData.csrf });
    const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set('error', 'oauth_state_mismatch');
    return NextResponse.redirect(errorUrl);
  }

  if (!code) {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    console.error(`[GitHub OAuth Callback] Authorization failed on GitHub's side. Error: ${error}, Desc: ${errorDescription}`);
    const errorUrl = new URL(`/login`, NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set('error', 'oauth_provider_error');
    errorUrl.searchParams.set('message', encodeURIComponent(errorDescription || error || 'Unknown GitHub error'));
    return NextResponse.redirect(errorUrl);
  }

  const response = new NextResponse();
  response.cookies.delete('github_oauth_state');

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

    const session = await auth();
    if (session?.user?.uuid) {
      // --- LINKING FLOW ---
      console.log(`[GitHub OAuth Callback] LINKING FLOW: Found active session for user UUID: ${session.user.uuid}.`);
      await storeUserGithubOAuthToken(
        session.user.uuid,
        tokenData.access_token,
        tokenData.scope,
        tokenData.token_type,
        tokenData.refresh_token,
        tokenData.expires_in
      );
      console.log(`[GitHub OAuth Callback] LINKING FLOW: Successfully linked GitHub account to user ${session.user.uuid}.`);
      
      await sendDiscordDirectMessage(session.user.uuid, {
        embeds: [{
          title: "🔒 Account Security Alert",
          description: `Your GitHub account has been successfully linked to your FlowUp profile. If you did not initiate this action, please review your account security immediately.`,
          color: 0x2b2d31,
          timestamp: new Date().toISOString(),
          footer: { text: "FlowUp Security" }
        }]
      });

      const redirectTo = storedStateData.redirectTo || '/profile';
      const redirectUrl = new URL(redirectTo, NEXT_PUBLIC_APP_URL);
      redirectUrl.searchParams.set('oauth_status', 'success');

      response.headers.set('Location', redirectUrl.toString());
      response.status = 307; // Use temporary redirect
      return response;

    } else {
      // --- LOGIN/SIGNUP FLOW ---
      console.log(`[GitHub OAuth Callback] LOGIN/SIGNUP FLOW: No active session.`);
      const octokit = new Octokit({ auth: tokenData.access_token });
      const { data: githubUser } = await octokit.rest.users.getAuthenticated();
      
      const { data: emails } = await octokit.rest.users.listEmailsForAuthenticatedUser();
      const primaryEmail = emails.find(email => email.primary && email.verified)?.email;

      if (!primaryEmail) {
        const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
        errorUrl.searchParams.set('error', 'github_no_verified_email');
        return NextResponse.redirect(errorUrl);
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
      
      // Inlining session creation
      const JWT_SECRET = getJwtSecretOrThrow();
      const jwtPayload = { uuid: userToReturn.uuid };
      const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: '7d' });

      response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax',
      });

      await storeUserGithubOAuthToken(
        userToReturn.uuid,
        tokenData.access_token,
        tokenData.scope,
        tokenData.token_type,
        tokenData.refresh_token,
        tokenData.expires_in
      );
      
      console.log(`[GitHub OAuth Callback] Successfully logged in/signed up user ${userToReturn.email}. Redirecting to dashboard.`);
      
      response.headers.set('Location', new URL('/dashboard', NEXT_PUBLIC_APP_URL).toString());
      response.status = 307;
      return response;
    }

  } catch (error: any) {
    console.error('[GitHub OAuth Callback] Error in callback:', error);
    const redirectTo = storedStateData.redirectTo || '/login';
    const redirectUrl = new URL(redirectTo, NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('error', 'oauth_callback_error');
    redirectUrl.searchParams.set('message', encodeURIComponent(error.message || 'Unknown error'));
    
    response.headers.set('Location', redirectUrl.toString());
    response.status = 307;
    return response;
  }
}
