
import { type NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { 
    getFlowAppByPrefix, 
    getFlowAppConsent, 
    setFlowAppConsent,
    getUserByUuid,
    getProjectsForUser,
    getProjectByUuid as dbGetProjectByUuid,
    createProject as dbCreateProject,
    updateProjectDetails as dbUpdateProjectDetails,
    updateProjectVisibility as dbUpdateProjectVisibility,
    getTasksForProject as dbGetTasksForProject,
    getProjectMemberRole,
    createTask as dbCreateTask,
    updateTask as dbUpdateTask,
    deleteTask as dbDeleteTask,
    getDocumentsForProject,
    createDocument as dbCreateDocument,
    updateDocumentContent as dbUpdateDocumentContent,
    deleteDocument as dbDeleteDocument,
    getProjectMembers,
    addProjectMember,
    removeProjectMember,
    getProjectAnnouncements,
    createProjectAnnouncement,
    deleteProjectAnnouncement,
    getGlobalAnnouncements,
} from '@/lib/db';
import {
    getRepoContentsAction,
    getFileContentAction,
    createGithubFileAction,
    saveFileContentAction,
    deleteGithubFileAction,
} from '@/app/(app)/projects/[id]/actions';
import type { FlowApp, User, FlowAppScope, ProjectMemberRole, Project } from '@/types';

const ACTION_SCOPES: Record<string, FlowAppScope> = {
    'getUserDetails': 'profile:read',
    'listUserProjects': 'projects:read',
    'getProjectDetails': 'projects:read',
    'createProject': 'projects:write',
    'updateProject': 'projects:write',
    'listTasks': 'tasks:read',
    'createTask': 'tasks:write',
    'updateTask': 'tasks:write',
    'deleteTask': 'tasks:write',
    'listDocuments': 'documents:read',
    'createDocument': 'documents:write',
    'updateDocument': 'documents:write',
    'deleteDocument': 'documents:write',
    'listRepoContents': 'codespace:read',
    'getRepoFileContent': 'codespace:read',
    'createRepoFile': 'codespace:write',
    'updateRepoFile': 'codespace:write',
    'deleteRepoFile': 'codespace:write',
    'listMembers': 'members:read',
    'addMember': 'members:write',
    'removeMember': 'members:write',
    'listAnnouncements': 'announcements:read',
    'createAnnouncement': 'announcements:write',
    'deleteAnnouncement': 'announcements:write',
    'listGlobalAnnouncements': 'announcements:global:read',
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

async function checkProjectPermission(
    projectUuid: string,
    userUuid: string,
    allowedRoles: ProjectMemberRole[]
): Promise<{ project: Project; error?: undefined } | { project?: undefined; error: NextResponse }> {
    const project = await dbGetProjectByUuid(projectUuid);
    if (!project) {
        return { error: NextResponse.json({ error: 'Project not found.' }, { status: 404 }) };
    }
    if (project.name === 'My Secure Vault') {
        return { error: NextResponse.json({ error: 'This action cannot be performed on the Secure Vault.' }, { status: 403 }) };
    }
    const role = await getProjectMemberRole(projectUuid, userUuid);
    if (!role || !allowedRoles.includes(role)) {
        return { error: NextResponse.json({ error: `Permission denied. One of roles '${allowedRoles.join(', ')}' is required.` }, { status: 403 }) };
    }
    return { project };
}


async function handleAction(app: FlowApp, action: string, payload: any) {
    const requiredScope = ACTION_SCOPES[action];
    if (requiredScope && !app.scopes.includes(requiredScope)) {
        return NextResponse.json({ error: 'Insufficient scope.', message: `This action requires the '${requiredScope}' permission, which this app does not have.` }, { status: 403 });
    }

    const userUuid = payload?.userUuid;
    if (!userUuid && action !== 'listGlobalAnnouncements') {
        return NextResponse.json({ error: 'userUuid is required in the payload for this action.' }, { status: 400 });
    }

    if (action !== 'listGlobalAnnouncements') {
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
    }


    switch (action) {
        // --- Profile Actions ---
        case 'getUserDetails': {
            const user = await getUserByUuid(userUuid);
            if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
            const { hashedPassword, ...safeUser } = user;
            const publicProfile: Partial<User> = {
                uuid: safeUser.uuid, name: safeUser.name, avatar: safeUser.avatar, email: safeUser.email, bio: safeUser.bio, websiteUrl: safeUser.websiteUrl,
            };
            return NextResponse.json(publicProfile);
        }

        // --- Project Actions ---
        case 'listUserProjects': {
            const projects = await getProjectsForUser(userUuid);
            return NextResponse.json(projects);
        }
        case 'createProject': {
            if (!payload.name) return NextResponse.json({ error: "Project 'name' is required." }, { status: 400 });
            const newProject = await dbCreateProject(payload.name, payload.description, userUuid, payload.readmeContent);
            return NextResponse.json(newProject, { status: 201 });
        }
        case 'getProjectDetails': {
             const { project, error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
             if (error) return error;
             return NextResponse.json(project);
        }
        case 'updateProject': {
            const { project, error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner']);
            if (error) return error;
            if (payload.isPrivate !== undefined) {
                await dbUpdateProjectVisibility(payload.projectUuid, payload.isPrivate);
            }
            const updatedProject = await dbUpdateProjectDetails(payload.projectUuid, payload.name || project.name, payload.description || project.description);
            return NextResponse.json(updatedProject);
        }

        // --- Task Actions ---
        case 'listTasks': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
            if (error) return error;
            const tasks = await dbGetTasksForProject(payload.projectUuid);
            return NextResponse.json(tasks);
        }
        case 'createTask': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
            if (error) return error;
            if (!payload.title) return NextResponse.json({ error: "Task 'title' is required." }, { status: 400 });
            const task = await dbCreateTask({ ...payload, status: payload.status || 'To Do' });
            return NextResponse.json(task, { status: 201 });
        }
        case 'updateTask': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
            if (error) return error;
            if (!payload.taskUuid) return NextResponse.json({ error: "taskUuid is required." }, { status: 400 });
            const updatedTask = await dbUpdateTask(payload.taskUuid, payload);
            return NextResponse.json(updatedTask);
        }
        case 'deleteTask': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
            if (error) return error;
            if (!payload.taskUuid) return NextResponse.json({ error: "taskUuid is required." }, { status: 400 });
            await dbDeleteTask(payload.taskUuid);
            return NextResponse.json({ success: true }, { status: 200 });
        }
        
        // --- Member Actions ---
        case 'listMembers': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
            if (error) return error;
            const members = await getProjectMembers(payload.projectUuid);
            return NextResponse.json(members);
        }
        case 'addMember': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner']);
            if (error) return error;
            const userToInvite = await getUserByEmail(payload.emailToInvite);
            if (!userToInvite) return NextResponse.json({ error: "User to invite not found." }, { status: 404 });
            const member = await addProjectMember(payload.projectUuid, userToInvite.uuid, payload.role || 'viewer');
            return NextResponse.json(member, { status: 201 });
        }
        case 'removeMember': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner']);
            if (error) return error;
            if (!payload.memberUuid) return NextResponse.json({ error: "memberUuid to remove is required." }, { status: 400 });
            const result = await removeProjectMember(payload.projectUuid, payload.memberUuid);
            return NextResponse.json(result);
        }

        // --- Document Actions ---
        case 'listDocuments': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
            if (error) return error;
            const docs = await getDocumentsForProject(payload.projectUuid);
            return NextResponse.json(docs);
        }
        case 'createDocument': {
             const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
             if (error) return error;
             const doc = await dbCreateDocument({ ...payload, createdByUuid: userUuid });
             return NextResponse.json(doc, { status: 201 });
        }
        case 'updateDocument': {
             const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
             if (error) return error;
             const doc = await dbUpdateDocumentContent(payload.documentUuid, payload.title, payload.content);
             return NextResponse.json(doc);
        }
        case 'deleteDocument': {
             const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
             if (error) return error;
             await dbDeleteDocument(payload.documentUuid);
             return NextResponse.json({ success: true });
        }
        
        // --- Announcement Actions ---
        case 'listAnnouncements': {
             const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
             if (error) return error;
             const announcements = await getProjectAnnouncements(payload.projectUuid);
             return NextResponse.json(announcements);
        }
        case 'createAnnouncement': {
             const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner']);
             if (error) return error;
             const announcement = await createProjectAnnouncement({ ...payload, authorUuid: userUuid });
             return NextResponse.json(announcement, { status: 201 });
        }
        case 'deleteAnnouncement': {
             const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner']);
             if (error) return error;
             await deleteProjectAnnouncement(payload.announcementUuid);
             return NextResponse.json({ success: true });
        }
        case 'listGlobalAnnouncements': {
             const announcements = await getGlobalAnnouncements();
             return NextResponse.json(announcements);
        }
        
        // --- CodeSpace Actions ---
        case 'listRepoContents': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
            if (error) return error;
            const contents = await getRepoContentsAction(payload.projectUuid, payload.path || '');
            return NextResponse.json(contents);
        }
        case 'getRepoFileContent': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor', 'viewer']);
            if (error) return error;
            const content = await getFileContentAction(payload.projectUuid, payload.path);
            return NextResponse.json(content);
        }
        case 'createRepoFile': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
            if (error) return error;
            const result = await createGithubFileAction(payload.projectUuid, payload.path, payload.content, payload.commitMessage);
            return NextResponse.json(result);
        }
        case 'updateRepoFile': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
            if (error) return error;
            const result = await saveFileContentAction(payload.projectUuid, payload.path, payload.content, payload.sha, payload.commitMessage);
            return NextResponse.json(result);
        }
        case 'deleteRepoFile': {
            const { error } = await checkProjectPermission(payload.projectUuid, userUuid, ['owner', 'co-owner', 'editor']);
            if (error) return error;
            const result = await deleteGithubFileAction(payload.projectUuid, payload.path, payload.sha, payload.commitMessage);
            return NextResponse.json(result);
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
