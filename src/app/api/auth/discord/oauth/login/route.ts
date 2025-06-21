
import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  if (!DISCORD_CLIENT_ID || !NEXT_PUBLIC_APP_URL) {
    console.error('[Discord OAuth Login] DISCORD_CLIENT_ID or NEXT_PUBLIC_APP_URL not configured.');
    return NextResponse.json({ error: 'Discord OAuth not configured.' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const state = uuidv4();
  const stateData = { csrf: state, redirectTo };

  cookies().set('discord_oauth_state', JSON.stringify(stateData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 15, // 15 minutes
    sameSite: 'lax',
  });

  const discordAuthUrl = new URL('https://discord.com/api/oauth2/authorize');
  discordAuthUrl.searchParams.append('client_id', DISCORD_CLIENT_ID);
  discordAuthUrl.searchParams.append('redirect_uri', `${NEXT_PUBLIC_APP_URL}/api/auth/discord/oauth/callback`);
  discordAuthUrl.searchParams.append('response_type', 'code');
  // Requesting 'identify' and 'email' for basic user profile information.
  discordAuthUrl.searchParams.append('scope', 'identify email'); 
  discordAuthUrl.searchParams.append('state', state);
  discordAuthUrl.searchParams.append('prompt', 'consent'); // Always ask for consent, useful for testing

  console.log('[Discord OAuth Login] Redirecting to Discord:', discordAuthUrl.toString());
  return NextResponse.redirect(discordAuthUrl.toString());
}
