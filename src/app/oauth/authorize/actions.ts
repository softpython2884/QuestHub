
'use server';

import { redirect } from 'next/navigation';
import { getOAuthAppByClientId, createAuthorizationCode } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { z } from 'zod';
import type { OAuthApp } from '@/types';
import crypto from 'crypto';

interface AuthorizePageData {
  app: Pick<OAuthApp, 'name' | 'description' | 'website' | 'logoUrl'>;
  user: { name: string; avatar?: string };
  scopes: string[];
  redirectUri: string;
  clientId: string;
  state: string;
}

export async function getAuthorizePageData(
  clientId: string,
  redirectUri: string,
  responseType: string,
  state: string,
  scope?: string
): Promise<{ data?: AuthorizePageData; error?: string }> {
  const session = await auth();
  if (!session?.user) {
    const callbackUrl = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      state: state,
      scope: scope || '',
    });
    redirect(`/login?callbackUrl=/oauth/authorize?${callbackUrl.toString()}`);
  }
  
  if (responseType !== 'code') {
    return { error: "Invalid 'response_type'. Only 'code' is supported." };
  }

  const app = await getOAuthAppByClientId(clientId);
  if (!app) {
    return { error: `Invalid 'client_id'. No application found with ID: ${clientId}` };
  }

  if (!app.redirectUris.includes(redirectUri)) {
    return { error: "Invalid 'redirect_uri'. The provided URL is not registered for this application." };
  }
  
  // Basic scope validation (can be expanded)
  const requestedScopes = scope ? scope.split(' ') : [];

  return {
    data: {
      app,
      user: { name: session.user.name, avatar: session.user.avatar },
      scopes: requestedScopes,
      redirectUri,
      clientId,
      state,
    },
  };
}

const HandleAuthorizationSchema = z.object({
  decision: z.enum(['accept', 'deny']),
  clientId: z.string(),
  redirectUri: z.string().url(),
  state: z.string(),
  scope: z.string().optional(),
});

export async function handleAuthorization(prevState: any, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const validatedFields = HandleAuthorizationSchema.safeParse({
    decision: formData.get('decision'),
    clientId: formData.get('clientId'),
    redirectUri: formData.get('redirectUri'),
    state: formData.get('state'),
    scope: formData.get('scope'),
  });

  if (!validatedFields.success) {
    return { error: 'Invalid form submission.' };
  }

  const { decision, clientId, redirectUri, state, scope } = validatedFields.data;
  const redirectUrl = new URL(redirectUri);

  if (decision === 'deny') {
    redirectUrl.searchParams.set('error', 'access_denied');
    redirectUrl.searchParams.set('state', state);
    redirect(redirectUrl.toString());
  }
  
  if (decision === 'accept') {
    try {
        const authCode = crypto.randomBytes(32).toString('hex');
        await createAuthorizationCode(
            authCode,
            clientId,
            session.user.uuid,
            redirectUri,
            scope || ''
        );
        
        redirectUrl.searchParams.set('code', authCode);
        redirectUrl.searchParams.set('state', state);
        redirect(redirectUrl.toString());

    } catch (e: any) {
        redirectUrl.searchParams.set('error', 'server_error');
        redirectUrl.searchParams.set('error_description', e.message || 'Could not generate authorization code.');
        redirectUrl.searchParams.set('state', state);
        redirect(redirectUrl.toString());
    }
  }

  // Fallback
  return { error: 'Invalid decision.' };
}
