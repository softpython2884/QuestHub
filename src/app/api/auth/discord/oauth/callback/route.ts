
import { type NextRequest, NextResponse } from 'next/server';
import { storeUserDiscordToken, getUserByEmail, createUser } from '@/lib/db';
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
  const stateFromDiscord = searchParams.get('state');

  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !NEXT_PUBLIC_APP_URL) {
    console.error('[Discord OAuth Callback] OAuth environment variables not configured.');
    const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL || request.url);
    errorUrl.searchParams.set('error', 'oauth_config_error');
    return NextResponse.redirect(errorUrl);
  }

  const storedStateCookie = request.cookies.get('discord_oauth_state');
  
  let storedStateData;
  if (storedStateCookie) {
    try {
        storedStateData = JSON.parse(storedStateCookie.value);
    } catch (e) {
        console.error('[Discord OAuth Callback] Error parsing OAuth state cookie:', e);
        const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
        errorUrl.searchParams.set('error', 'oauth_state_invalid_parse');
        return NextResponse.redirect(errorUrl);
    }
  } else {
    console.error('[Discord OAuth Callback] Missing OAuth state cookie.');
    const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set('error', 'oauth_state_missing');
    return NextResponse.redirect(errorUrl);
  }
  
  if (!stateFromDiscord || stateFromDiscord !== storedStateData.csrf) {
    console.error('[Discord OAuth Callback] OAuth state mismatch.');
    const errorUrl = new URL('/login', NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set('error', 'oauth_state_mismatch');
    return NextResponse.redirect(errorUrl);
  }
  
  if (!code) {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    console.error(`[Discord OAuth Callback] Authorization failed on Discord's side. Error: ${error}, Desc: ${errorDescription}`);
    const errorUrl = new URL(`/login`, NEXT_PUBLIC_APP_URL);
    errorUrl.searchParams.set('error', 'oauth_provider_error');
    errorUrl.searchParams.set('message', encodeURIComponent(errorDescription || error || "Unknown Discord error"));
    return NextResponse.redirect(errorUrl);
  }

  const response = new NextResponse();
  response.cookies.delete('discord_oauth_state');

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
    
    const session = await auth();
    if (session?.user?.uuid) {
        // --- LINKING FLOW ---
        console.log(`[Discord OAuth Callback] LINKING FLOW: Found active session for user UUID: ${session.user.uuid}.`);
        await storeUserDiscordToken(session.user.uuid, {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000,
            scopes: tokenData.scope,
            discordUserId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar,
        });
        console.log(`[Discord OAuth Callback] LINKING FLOW: Successfully linked Discord account to user ${session.user.uuid}.`);
        
        await sendDiscordDirectMessage(session.user.uuid, {
          embeds: [{
            title: "🔒 Account Security Alert",
            description: `Your Discord account has been successfully linked to your FlowUp profile. If you did not initiate this action, please review your account security immediately.`,
            color: 0x5865F2,
            timestamp: new Date().toISOString(),
            footer: { text: "FlowUp Security" }
          }]
        });

        const redirectTo = storedStateData.redirectTo || '/profile';
        const redirectUrl = new URL(redirectTo, NEXT_PUBLIC_APP_URL);
        redirectUrl.searchParams.set('discord_oauth_status', 'success');
        
        response.headers.set('Location', redirectUrl.toString());
        response.status = 307;
        return response;

    } else {
        // --- LOGIN/SIGNUP FLOW ---
        if (!discordUser.email || !discordUser.verified) {
          console.error(`[Discord OAuth Callback] User's Discord email is missing or not verified.`);
          const errorUrl = new URL(`/login`, NEXT_PUBLIC_APP_URL);
          errorUrl.searchParams.set('error', 'discord_email_unverified');
          return NextResponse.redirect(errorUrl);
        }

        let appUser: (User & { hashedPassword?: string }) | null = await getUserByEmail(discordUser.email);
        if (!appUser) {
          console.log(`[Discord OAuth Callback] No user found for email ${discordUser.email}. Creating new user.`);
          const newUserInfo = await createUser(discordUser.username, discordUser.email);
          appUser = { ...newUserInfo };
        } else {
          console.log(`[Discord OAuth Callback] Found existing user for email ${discordUser.email}. Logging in.`);
        }

        if (!appUser || !appUser.uuid) {
          throw new Error("User session could not be established.");
        }
        
        const { hashedPassword, ...userToReturn } = appUser;
        
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

        await storeUserDiscordToken(userToReturn.uuid, {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + tokenData.expires_in * 1000,
            scopes: tokenData.scope,
            discordUserId: discordUser.id,
            discordUsername: discordUser.username,
            discordAvatar: discordUser.avatar,
        });
        
        response.headers.set('Location', new URL('/dashboard', NEXT_PUBLIC_APP_URL).toString());
        response.status = 307;
        return response;
    }
  } catch (error: any) {
    console.error('[Discord OAuth Callback] Final catch block error:', error);
    const redirectTo = storedStateData.redirectTo || '/login';
    const redirectUrl = new URL(redirectTo, NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('error', 'oauth_callback_error');
    redirectUrl.searchParams.set('message', encodeURIComponent(error.message || 'Unknown error'));
    
    response.headers.set('Location', redirectUrl.toString());
    response.status = 307;
    return response;
  }
}
