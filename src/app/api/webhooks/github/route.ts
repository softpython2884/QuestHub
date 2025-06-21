
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getProjectByUuid } from '@/lib/db';

async function verifySignature(request: NextRequest): Promise<{isValid: boolean, error?: string, body?: any}> {
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
        return { isValid: false, error: 'No signature found on request' };
    }

    const body = await request.text();
    
    // TODO: Need a way to map the incoming webhook to a project to get the secret.
    // This could be via a query param in the webhook URL, or by inspecting the payload.
    // For now, using a global secret for demonstration, but this is NOT secure for production.
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
        return { isValid: false, error: 'Webhook secret not configured on server.' };
    }

    const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { isValid: false, error: 'Signature does not match' };
    }

    return { isValid: true, body: JSON.parse(body) };
}


export async function POST(request: NextRequest) {
  try {
    // const { isValid, error, body } = await verifySignature(request);
    
    // if (!isValid) {
    //   console.warn('[GitHub Webhook] Unauthorized request:', error);
    //   return NextResponse.json({ message: `Unauthorized: ${error}` }, { status: 401 });
    // }
    
    const event = request.headers.get('x-github-event');
    const body = await request.json(); // Temporary until verification is fully implemented

    console.log(`[GitHub Webhook] Received event: '${event}' for repository: ${body.repository?.full_name}`);
    
    // Here you would process the event, e.g., store commit data, send Discord notifications, etc.
    // switch (event) {
    //   case 'push':
    //     console.log('Processing push event...');
    //     break;
    //   case 'pull_request':
    //     console.log('Processing pull_request event...');
    //     break;
    //   default:
    //     console.log(`Unhandled event type: ${event}`);
    // }

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });

  } catch (err: any) {
    console.error('[GitHub Webhook] Error processing webhook:', err);
    return NextResponse.json({ message: 'Internal Server Error', error: err.message }, { status: 500 });
  }
}
