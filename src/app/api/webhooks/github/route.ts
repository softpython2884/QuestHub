
import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getProjectByRepoName } from '@/lib/db';

async function verifySignature(request: NextRequest, secret: string): Promise<boolean> {
    const signature = request.headers.get('x-hub-signature-256');
    if (!signature) {
        return false;
    }

    const body = await request.text();
    const expectedSignature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return false;
    }

    return true;
}


export async function POST(request: NextRequest) {
  try {
    const event = request.headers.get('x-github-event');
    const bodyClone = request.clone(); // Clone the request to read body multiple times
    const body = await bodyClone.json();
    const repoName = body.repository?.full_name;
    
    if (!repoName) {
        return NextResponse.json({ message: 'Repository information missing from payload.' }, { status: 400 });
    }

    const project = await getProjectByRepoName(repoName);
    if (!project || !project.githubWebhookSecret) {
        console.warn(`[GitHub Webhook] Received event for unlinked or unconfigured repository: ${repoName}`);
        // Return 200 to avoid GitHub marking the webhook as failed for legit repos that just aren't configured here
        return NextResponse.json({ message: 'Project not configured for webhooks.' }, { status: 200 });
    }
    
    const isValid = await verifySignature(request, project.githubWebhookSecret);
    
    if (!isValid) {
      console.warn(`[GitHub Webhook] Unauthorized request for repo: ${repoName}. Signature mismatch.`);
      return NextResponse.json({ message: `Unauthorized: Invalid signature.` }, { status: 401 });
    }
    
    console.log(`[GitHub Webhook] Received valid event: '${event}' for repository: ${repoName}`);
    
    // Here you would process the event, e.g., store commit data, send Discord notifications, etc.
    switch (event) {
      case 'push':
        console.log(`[GitHub Webhook] Processing push event for ${repoName}. Commits:`, body.commits.map((c: any) => c.message));
        // TODO: Store this activity in the database.
        break;
      case 'pull_request':
        console.log(`[GitHub Webhook] Processing pull_request event. Action: ${body.action}, Title: ${body.pull_request?.title}`);
        // TODO: Store this activity in the database.
        break;
      default:
        console.log(`[GitHub Webhook] Unhandled event type: ${event}`);
    }

    return NextResponse.json({ message: 'Webhook received' }, { status: 200 });

  } catch (err: any) {
    console.error('[GitHub Webhook] Error processing webhook:', err);
    return NextResponse.json({ message: 'Internal Server Error', error: err.message }, { status: 500 });
  }
}
