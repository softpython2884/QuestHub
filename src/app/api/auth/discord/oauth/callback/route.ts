
import { type NextRequest, NextResponse } from 'next/server';
import { storeUserDiscordToken, getUserByEmail, createUser } from '@/lib/db';
import { createSessionForUser } from '@/lib/authService';
import type { User } from '@/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const stateFromDiscord = searchParams.get('state');

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !NEXT_PUBLIC_APP_URL) {
    console.error('[Discord OAuth Callback] OAuth environment variables not configured.');
    return NextResponse.redirect(new URL('/login?error=oauth_config_error', request.url));
  }

  const storedStateCookie = request.cookies.get('discord_oauth_state');
  request.cookies.delete('discord_oauth_state');

  if (!storedStateCookie) {
    console.error('[Discord OAuth Callback] Missing OAuth state cookie.');
    return NextResponse.redirect(new URL('/login?error=oauth_state_missing', request.url));
  }

  let storedStateData;
  try {
    storedStateData = JSON.parse(storedStateCookie.value);
  } catch (e) {
    console.error('[Discord OAuth Callback] Error parsing OAuth state cookie:', e);
    return NextResponse.redirect(new URL('/login?error=oauth_state_invalid_parse', request.url));
  }
  
  if (!stateFromDiscord || stateFromDiscord !== storedStateData.csrf) {
    console.error('[Discord OAuth Callback] OAuth state mismatch.');
    return NextResponse.redirect(new URL('/login?error=oauth_state_mismatch', request.url));
  }
  
  if (!code) {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    console.error(`[Discord OAuth Callback] Authorization failed on Discord's side. Error: ${error}, Desc: ${errorDescription}`);
    return NextResponse.redirect(new URL(`/login?error=oauth_provider_error&message=${encodeURIComponent(errorDescription || error || "Unknown Discord error")}`, request.url));
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
        scope: 'identify email',
      }),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(`[Discord OAuth Callback] Discord token exchange failed: ${errorText}`);
        throw new Error(`Discord token exchange failed: ${errorText}`);
    }
    const tokenData = await tokenResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error(`[Discord OAuth Callback] Failed to fetch Discord user details: ${errorText}`);
        throw new Error(`Failed to fetch Discord user details: ${errorText}`);
    }
    const discordUser = await userResponse.json();

    if (!discordUser.email || !discordUser.verified) {
      console.error(`[Discord OAuth Callback] User's Discord email is missing or not verified.`);
      return NextResponse.redirect(new URL(`/login?error=discord_email_unverified`, request.url));
    }

    let appUser: (User & { hashedPassword?: string }) | null = await getUserByEmail(discordUser.email);

    if (!appUser) {
      // Signup
      console.log(`[Discord OAuth Callback] No user found for email ${discordUser.email}. Creating new user.`);
      const newUserInfo = await createUser(
        discordUser.username,
        discordUser.email
      );
      appUser = { ...newUserInfo }; // Add necessary properties if createUser returns a different shape
    } else {
      console.log(`[Discord OAuth Callback] Found existing user for email ${discordUser.email}. Logging in.`);
    }

    if (!appUser || !appUser.uuid) {
      console.error("[Discord OAuth Callback] Failed to get or create a user in FlowUp DB.");
      throw new Error("User session could not be established.");
    }
    
    const { hashedPassword, ...userToReturn } = appUser;
    
    // Create session and store token
    await createSessionForUser(userToReturn);
    await storeUserDiscordToken(userToReturn.uuid, {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scopes: tokenData.scope,
        discordUserId: discordUser.id,
        discordUsername: discordUser.username,
        discordAvatar: discordUser.avatar,
    });
    
    // Redirect to dashboard on successful login/signup
    return NextResponse.redirect(new URL('/dashboard', request.url));

  } catch (error: any) {
    console.error('[Discord OAuth Callback] Final catch block error:', error);
    return NextResponse.redirect(new URL(`/login?error=oauth_callback_error&message=${encodeURIComponent(error.message || 'Unknown error')}`, request.url));
  }
}
