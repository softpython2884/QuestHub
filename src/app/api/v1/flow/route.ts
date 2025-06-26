
import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
    getFlowAppByPrefix, 
    getFlowAppConsent, 
    setFlowAppConsent,
    getUserByUuid,
    getProjectsForUser
} from '@/lib/db';
import type { FlowApp, User, FlowAppScope } from '@/types';

const ACTION_SCOPES: Record<string, FlowAppScope> = {
    'getUserDetails': 'profile:read',
    'listUserProjects': 'projects:read',
};


async function authenticateRequest(request: NextRequest): Promise<{ app?: FlowApp; error?: string; status?: number }> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Authorization header is missing or malformed.', status: 401 };
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const tokenParts = token.split('_');
    if (tokenParts.length !== 3 || tokenParts[0] !== 'fpat') {
        return { error: 'Invalid token format.', status: 401 };
    }
    
    const prefix = `${tokenParts[0]}_${tokenParts[1]}`;
    const secret = tokenParts[2];

    const app = await getFlowAppByPrefix(prefix);
    if (!app || !app.secretHash) {
        return { error: 'Invalid token.', status: 401 };
    }

    const isSecretValid = await bcrypt.compare(secret, app.secretHash);
    if (!isSecretValid) {
        return { error: 'Invalid token.', status: 401 };
    }

    return { app };
}

async function handleAction(app: FlowApp, action: string, payload: any) {
    const requiredScope = ACTION_SCOPES[action];
    if (requiredScope && !app.scopes.includes(requiredScope)) {
        return NextResponse.json({ error: 'Insufficient scope.', message: `This action requires the '${requiredScope}' permission, which this app does not have.` }, { status: 403 });
    }

    const userUuid = payload?.userUuid;
    if (!userUuid) {
        return NextResponse.json({ error: 'userUuid is required in the payload for this action.' }, { status: 400 });
    }

    // --- Consent Check ---
    const consent = await getFlowAppConsent(userUuid, app.uuid);
    if (consent?.status === 'denied') {
        return NextResponse.json({ error: 'Access denied by user.' }, { status: 403 });
    }
    if (!consent || consent.status === 'pending') {
        if (!consent) {
            await setFlowAppConsent(userUuid, app.uuid, 'pending');
        }
        return NextResponse.json({ 
            status: 'consent_pending', 
            message: `User must grant permission for the app '${app.name}' to perform this action. The user can do this from their settings page.`
        }, { status: 403 });
    }
    // --- End Consent Check ---

    switch (action) {
        case 'getUserDetails': {
            const user = await getUserByUuid(userUuid);
            if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            
            const { hashedPassword, ...safeUser } = user;
            const publicProfile: Partial<User> = {
                uuid: safeUser.uuid,
                name: safeUser.name,
                avatar: safeUser.avatar,
                email: safeUser.email,
                bio: safeUser.bio,
                websiteUrl: safeUser.websiteUrl,
            };
            return NextResponse.json(publicProfile);
        }

        case 'listUserProjects': {
            const projects = await getProjectsForUser(userUuid);
            return NextResponse.json(projects);
        }

        default:
            return NextResponse.json({ error: `Action '${action}' not found.` }, { status: 404 });
    }
}


export async function POST(request: NextRequest) {
    const authResult = await authenticateRequest(request);
    if (authResult.error || !authResult.app) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    
    const { action, payload } = body;
    if (!action) {
        return NextResponse.json({ error: 'Missing "action" in request body.' }, { status: 400 });
    }

    try {
        return await handleAction(authResult.app, action, payload);
    } catch (error: any) {
        console.error(`[FlowApp API] Error executing action '${action}':`, error);
        return NextResponse.json({ error: 'An internal error occurred.', details: error.message }, { status: 500 });
    }
}
