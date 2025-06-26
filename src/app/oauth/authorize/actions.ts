
'use server';

import { redirect } from 'next/navigation';
import { createAuthorizationCode } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import { z } from 'zod';
import crypto from 'crypto';

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
