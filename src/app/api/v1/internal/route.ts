
import { type NextRequest, NextResponse } from 'next/server';
import { 
    createUser as dbCreateUser,
    getUserByEmail as dbGetUserByEmail,
} from '@/lib/db';
import type { UserRole } from '@/types';

/**
 * Internal Admin API
 * 
 * This endpoint is for trusted service-to-service communication.
 * It is secured by a secret key passed in the `X-Internal-Api-Key` header.
 * This API bypasses user-level permissions and consent checks for administrative tasks.
 */

async function handleAction(action: string, payload: any) {
    switch (action) {
        // --- User Management Actions ---
        case 'createUser': {
            const { name, email, password, role } = payload;
            if (!name || !email || !password || !role) {
                return NextResponse.json({ error: "Missing required fields: name, email, password, role." }, { status: 400 });
            }

            const existingUser = await dbGetUserByEmail(email);
            if (existingUser) {
                return NextResponse.json({ error: `User with email ${email} already exists.` }, { status: 409 });
            }

            const newUser = await dbCreateUser(name, email, password, role as UserRole);
            const { hashedPassword, ...safeUser } = newUser; // Ensure password hash is not returned

            return NextResponse.json(safeUser, { status: 201 });
        }

        // --- Add other administrative actions here in the future ---
        // case 'deleteUser': { ... }
        // case 'listAllProjects': { ... }

        default:
            return NextResponse.json({ error: `Action '${action}' not found.` }, { status: 404 });
    }
}

export async function POST(request: NextRequest) {
    const internalApiKey = request.headers.get('X-Internal-Api-Key');
    const expectedKey = process.env.INTERNAL_API_SECRET_KEY;

    if (!expectedKey) {
        console.error('[INTERNAL API] INTERNAL_API_SECRET_KEY is not set. The API is disabled.');
        return NextResponse.json({ error: 'Internal API is not configured.' }, { status: 503 });
    }

    if (!internalApiKey || internalApiKey !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
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
        return await handleAction(action, payload);
    } catch (error: any) {
        console.error(`[INTERNAL API] Error executing action '${action}':`, error);
        return NextResponse.json({ error: 'An internal error occurred.', details: error.message }, { status: 500 });
    }
}
