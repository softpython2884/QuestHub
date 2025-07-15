
import { type NextRequest, NextResponse } from 'next/server';
import { 
    createUser as dbCreateUser,
    getUserByEmail as dbGetUserByEmail,
    updateUserProfile as dbUpdateUserProfile,
    deleteUser as dbDeleteUser,
    createProject as dbCreateProject,
    deleteProject as dbDeleteProject,
    addProjectMember as dbAddProjectMember,
    removeProjectMember as dbRemoveProjectMember,
    getProjectByUuid,
} from '@/lib/db';
import type { UserRole, ProjectMemberRole } from '@/types';

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
        
        case 'updateUser': {
            const { uuid, ...updateData } = payload;
            if (!uuid) return NextResponse.json({ error: "User 'uuid' is required." }, { status: 400 });
            
            // This reuses the profile update function, can be expanded for more direct admin actions
            const updatedUser = await dbUpdateUserProfile({ uuid, ...updateData });
            if (!updatedUser) return NextResponse.json({ error: "User not found or update failed." }, { status: 404 });
            
            return NextResponse.json(updatedUser);
        }

        case 'deleteUser': {
            const { uuid } = payload;
            if (!uuid) return NextResponse.json({ error: "User 'uuid' is required." }, { status: 400 });
            const success = await dbDeleteUser(uuid);
            if (!success) return NextResponse.json({ error: "User not found or deletion failed." }, { status: 404 });
            return NextResponse.json({ success: true });
        }

        // --- Project Management Actions ---
        case 'createProject': {
            const { ownerUuid, name, description } = payload;
            if (!ownerUuid || !name) {
                 return NextResponse.json({ error: "Missing required fields: ownerUuid, name." }, { status: 400 });
            }
            const newProject = await dbCreateProject(name, description, ownerUuid);
            return NextResponse.json(newProject, { status: 201 });
        }
        
        case 'deleteProject': {
            const { projectUuid } = payload;
            if (!projectUuid) return NextResponse.json({ error: "'projectUuid' is required." }, { status: 400 });
            const success = await dbDeleteProject(projectUuid);
             if (!success) return NextResponse.json({ error: "Project not found or deletion failed." }, { status: 404 });
            return NextResponse.json({ success: true });
        }
        
        // --- Team Management Actions ---
        case 'addProjectMember': {
            const { projectUuid, userUuid, role } = payload;
            if (!projectUuid || !userUuid || !role) {
                return NextResponse.json({ error: "Missing required fields: projectUuid, userUuid, role." }, { status: 400 });
            }
            const newMember = await dbAddProjectMember(projectUuid, userUuid, role as ProjectMemberRole);
            if (!newMember) return NextResponse.json({ error: "Failed to add member. User or project may not exist." }, { status: 400 });
            return NextResponse.json(newMember, { status: 201 });
        }
        
        case 'removeProjectMember': {
            const { projectUuid, userUuid } = payload;
             if (!projectUuid || !userUuid ) {
                return NextResponse.json({ error: "Missing required fields: projectUuid, userUuid." }, { status: 400 });
            }
            const project = await getProjectByUuid(projectUuid);
            if (project?.ownerUuid === userUuid) {
                 return NextResponse.json({ error: "Cannot remove the project owner." }, { status: 400 });
            }
            
            const result = await dbRemoveProjectMember(projectUuid, userUuid);
            if (!result.success) return NextResponse.json({ error: "Failed to remove member. They may not be a member." }, { status: 404 });
            return NextResponse.json({ success: true });
        }

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
