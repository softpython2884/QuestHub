
import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!GITHUB_CLIENT_ID || !NEXT_PUBLIC_APP_URL) {
    console.error('[GitHub OAuth Login] GITHUB_CLIENT_ID or NEXT_PUBLIC_APP_URL not configured.');
    return NextResponse.json({ error: 'GitHub OAuth not configured.' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'; // Default redirect after OAuth
  const projectUuid = searchParams.get('projectUuid'); // For context

  const state = uuidv4();
  const stateData = { csrf: state, redirectTo, projectUuid };

  // Store state in a temporary cookie to verify later
  cookies().set('github_oauth_state', JSON.stringify(stateData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
    sameSite: 'lax',
  });

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.append('client_id', GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.append('redirect_uri', `${NEXT_PUBLIC_APP_URL}/api/auth/github/oauth/callback`);
  githubAuthUrl.searchParams.append('scope', 'repo user:email'); // Request 'repo' scope for creating repositories
  githubAuthUrl.searchParams.append('state', state);
  githubAuthUrl.searchParams.append('allow_signup', 'true');

  console.log('[GitHub OAuth Login] Redirecting to GitHub:', githubAuthUrl.toString());
  return NextResponse.redirect(githubAuthUrl.toString());
}
