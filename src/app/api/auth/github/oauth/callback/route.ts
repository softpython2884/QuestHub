
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/authEdge';
import { storeUserGithubOAuthToken } from '@/lib/db';
import { Octokit } from 'octokit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateFromGitHub = searchParams.get('state');

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !NEXT_PUBLIC_APP_URL) {
    console.error('[GitHub OAuth Callback] OAuth environment variables not configured.');
    return NextResponse.redirect(new URL('/dashboard?error=oauth_config_error', request.url));
  }

  const storedStateCookie = request.cookies.get('github_oauth_state');
  request.cookies.delete('github_oauth_state'); // Clean up state cookie

  if (!storedStateCookie) {
    console.error('[GitHub OAuth Callback] Missing OAuth state cookie.');
    return NextResponse.redirect(new URL('/dashboard?error=oauth_state_missing', request.url));
  }
  
  let storedStateData;
  try {
    storedStateData = JSON.parse(storedStateCookie.value);
  } catch (e) {
    console.error('[GitHub OAuth Callback] Error parsing OAuth state cookie:', e);
    return NextResponse.redirect(new URL('/dashboard?error=oauth_state_invalid_parse', request.url));
  }

  if (!stateFromGitHub || stateFromGitHub !== storedStateData.csrf) {
    console.error('[GitHub OAuth Callback] OAuth state mismatch.', { stateFromGitHub, storedStateCSRF: storedStateData.csrf });
    return NextResponse.redirect(new URL('/dashboard?error=oauth_state_mismatch', request.url));
  }

  const session = await auth();
  if (!session?.user?.uuid) {
    console.error('[GitHub OAuth Callback] No active FlowUp user session found.');
    return NextResponse.redirect(new URL('/login?error=oauth_no_session', request.url));
  }

  if (!code) {
    console.error('[GitHub OAuth Callback] Missing authorization code from GitHub.');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    return NextResponse.redirect(new URL(`/dashboard?error=oauth_missing_code&gh_error=${error || ''}&gh_desc=${errorDescription || ''}`, request.url));
  }

  try {
    console.log('[GitHub OAuth Callback] Exchanging code for access token...');
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: code,
        redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/auth/github/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('[GitHub OAuth Callback] Error exchanging code for token:', tokenResponse.status, errorBody);
      throw new Error(`GitHub token exchange failed with status ${tokenResponse.status}: ${errorBody}`);
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('[GitHub OAuth Callback] GitHub returned error or no access_token:', tokenData);
      throw new Error(tokenData.error_description || 'Failed to retrieve access token from GitHub.');
    }

    await storeUserGithubOAuthToken(
      session.user.uuid,
      tokenData.access_token,
      tokenData.scope,
      tokenData.token_type,
      tokenData.refresh_token, // May not always be present
      tokenData.expires_in    // May not always be present
    );
    console.log(`[GitHub OAuth Callback] Stored OAuth token for FlowUp user ${session.user.uuid}.`);

    // Determine redirect URL from stored state
    let redirectPath = storedStateData.redirectTo || '/dashboard';
    if (storedStateData.projectUuid) {
        redirectPath = `/projects/${storedStateData.projectUuid}?tab=codespace&oauth_status=success`;
    } else {
        const redirectUrlObj = new URL(redirectPath, request.nextUrl.origin);
        redirectUrlObj.searchParams.set('oauth_status', 'success');
        redirectPath = `${redirectUrlObj.pathname}${redirectUrlObj.search}`;
    }
    
    console.log(`[GitHub OAuth Callback] Redirecting to: ${redirectPath}`);
    return NextResponse.redirect(new URL(redirectPath, request.url));

  } catch (error: any) {
    console.error('[GitHub OAuth Callback] Error in callback:', error);
    return NextResponse.redirect(new URL(`/dashboard?error=oauth_callback_error&message=${encodeURIComponent(error.message || 'Unknown error')}`, request.url));
  }
}
