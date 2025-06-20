
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/authEdge';
import { storeUserGithubInstallation } from '@/lib/db';
import { getAppAuthOctokit } from '@/lib/githubAppClient';


export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get('installation_id');
  const setupAction = searchParams.get('setup_action'); // 'install' or 'update'
  // const code = searchParams.get('code'); // For user OAuth token exchange, if needed later
  const state = searchParams.get('state'); // To redirect back or carry other info

  console.log('[GitHub Callback] Received:', { installationId, setupAction, state });

  const session = await auth();
  if (!session?.user?.uuid) {
    console.error('[GitHub Callback] No active FlowUp user session found.');
    // Redirect to login or an error page if no user session
    return NextResponse.redirect(new URL('/login?error=github_auth_no_session', request.url));
  }

  if (!installationId) {
    console.error('[GitHub Callback] Missing installation_id from GitHub.');
    // Redirect to an error page or back to where the user came from with an error
    return NextResponse.redirect(new URL('/dashboard?error=github_missing_installation_id', request.url));
  }

  let accountLogin: string | undefined;
  try {
    const appOctokit = await getAppAuthOctokit(); // Utiliser getAppAuthOctokit ici
    const installationDetails = await appOctokit.request('GET /app/installations/{installation_id}', {
      installation_id: parseInt(installationId, 10),
    });
    accountLogin = installationDetails.data.account?.login;
    console.log(`[GitHub Callback] Installation ID ${installationId} is for account: ${accountLogin}`);
  } catch (error) {
    console.error(`[GitHub Callback] Error fetching installation details for ID ${installationId}:`, error);
    // Proceed without accountLogin, or handle error more gracefully
  }


  try {
    await storeUserGithubInstallation(session.user.uuid, parseInt(installationId, 10), accountLogin);
    console.log(`[GitHub Callback] Stored installation ID ${installationId} for FlowUp user ${session.user.uuid} (GitHub account: ${accountLogin || 'N/A'}).`);

    // Determine redirect URL
    let redirectPath = '/dashboard?github_link=success'; // Default redirect
    if (state) {
        const decodedState = decodeURIComponent(state);
        const params = new URLSearchParams(decodedState);
        const projectUuidForRedirect = params.get('projectUuid');
        const originalRedirectTo = params.get('redirectTo');

        if (originalRedirectTo) {
            redirectPath = originalRedirectTo;
             // Append success status, ensuring query params are handled correctly
            const redirectUrlObj = new URL(originalRedirectTo, request.nextUrl.origin);
            redirectUrlObj.searchParams.set('github_link_status', 'success');
            redirectPath = `${redirectUrlObj.pathname}${redirectUrlObj.search}`;
        } else if (projectUuidForRedirect) {
            redirectPath = `/projects/${projectUuidForRedirect}?tab=codespace&github_link_status=success`;
        }
    }
    
    console.log(`[GitHub Callback] Redirecting to: ${redirectPath}`);
    return NextResponse.redirect(new URL(redirectPath, request.url));

  } catch (error) {
    console.error('[GitHub Callback] Error storing installation ID:', error);
    // Redirect to an error page or back with an error
    return NextResponse.redirect(new URL('/dashboard?error=github_storing_installation_failed', request.url));
  }
}

