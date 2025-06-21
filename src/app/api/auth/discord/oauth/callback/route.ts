
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/authEdge';
import { storeUserDiscordToken } from '@/lib/db';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateFromDiscord = searchParams.get('state');

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !NEXT_PUBLIC_APP_URL) {
    console.error('[Discord OAuth Callback] OAuth environment variables not configured.');
    return NextResponse.redirect(new URL('/profile?error=oauth_config_error', request.url));
  }

  const storedStateCookie = request.cookies.get('discord_oauth_state');
  request.cookies.delete('discord_oauth_state');

  if (!storedStateCookie) {
    console.error('[Discord OAuth Callback] Missing OAuth state cookie.');
    return NextResponse.redirect(new URL('/profile?error=oauth_state_missing', request.url));
  }

  let storedStateData;
  try {
    storedStateData = JSON.parse(storedStateCookie.value);
  } catch (e) {
    console.error('[Discord OAuth Callback] Error parsing OAuth state cookie:', e);
    return NextResponse.redirect(new URL('/profile?error=oauth_state_invalid_parse', request.url));
  }
  
  if (!stateFromDiscord || stateFromDiscord !== storedStateData.csrf) {
    console.error('[Discord OAuth Callback] OAuth state mismatch.');
    return NextResponse.redirect(new URL('/profile?error=oauth_state_mismatch', request.url));
  }

  const session = await auth();
  if (!session?.user?.uuid) {
    console.error('[Discord OAuth Callback] No active FlowUp user session found.');
    return NextResponse.redirect(new URL('/login?error=oauth_no_session', request.url));
  }
  
  if (!code) {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    return NextResponse.redirect(new URL(`/profile?error=oauth_missing_code&discord_error=${error || ''}&discord_desc=${errorDescription || ''}`, request.url));
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${NEXT_PUBLIC_APP_URL}/api/auth/discord/oauth/callback`,
      }),
    });

    if (!tokenResponse.ok) {
        throw new Error(`Discord token exchange failed: ${await tokenResponse.text()}`);
    }
    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
        },
    });

    if (!userResponse.ok) {
        throw new Error(`Failed to fetch Discord user details: ${await userResponse.text()}`);
    }
    const userData = await userResponse.json();
    
    await storeUserDiscordToken(session.user.uuid, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scopes: tokenData.scope,
        discordUserId: userData.id,
        discordUsername: userData.username,
        discordAvatar: userData.avatar,
    });
    
    const redirectPath = storedStateData.redirectTo || '/profile';
    const redirectUrlObj = new URL(redirectPath, request.nextUrl.origin);
    redirectUrlObj.searchParams.set('discord_oauth_status', 'success');
    
    return NextResponse.redirect(redirectUrlObj);

  } catch (error: any) {
    console.error('[Discord OAuth Callback] Error:', error);
    return NextResponse.redirect(new URL(`/profile?error=oauth_callback_error&message=${encodeURIComponent(error.message || 'Unknown error')}`, request.url));
  }
}
