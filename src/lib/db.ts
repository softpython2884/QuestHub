
'use server';

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import type { User, UserRole, Project, ProjectMember, ProjectMemberRole, Task, TaskStatus, Tag, Document as ProjectDocumentType } from '@/types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

const DB_DIR = path.join(process.cwd(), 'db');
const DB_PATH = path.join(DB_DIR, 'flowup_hub.db'); // Renamed DB file

const DEFAULT_PROJECT_TAGS: Array<Omit<Tag, 'uuid' | 'projectUuid'>> = [
  // Standard PM Tags
  { name: 'Bug', color: '#EF4444' }, 
  { name: 'Feature', color: '#3B82F6' }, 
  { name: 'Task', color: '#6B7280' }, 
  { name: 'Enhancement', color: '#22C55E' }, 
  { name: 'Documentation', color: '#10B981' }, 
  { name: 'Question', color: '#F97316' }, 
  { name: 'Idea', color: '#A855F7' }, 
  { name: 'Spike', color: '#F43F5E'}, 
  { name: 'User Story', color: '#93C5FD'}, 
  { name: 'Epic', color: '#7E22CE' }, 

  // Priority
  { name: 'Urgent', color: '#DC2626' }, 
  { name: 'High Priority', color: '#F59E0B' }, 
  { name: 'Medium Priority', color: '#84CC16' }, 
  { name: 'Low Priority', color: '#60A5FA' }, 

  // Departments/Areas
  { name: 'Frontend', color: '#EC4899' }, 
  { name: 'Backend', color: '#D946EF' }, 
  { name: 'UI/UX', color: '#8B5CF6' }, 
  { name: 'API', color: '#0EA5E9' }, 
  { name: 'Database', color: '#F472B6' }, 
  { name: 'DevOps', color: '#FDE047' }, 
  { name: 'Testing', color: '#4ADE80' }, 
  { name: 'QA', color: '#34D399' }, 
  { name: 'Mobile', color: '#2DD4BF' }, 
  { name: 'Web', color: '#38BDF8' }, 
  { name: 'Infrastructure', color: '#7DD3FC' }, 
  { name: 'Design', color: '#C084FC' }, 
  { name: 'Marketing', color: '#2563EB' }, 
  { name: 'Research', color: '#059669' }, 
  { name: 'Support', color: '#F9A8D4' }, 
  { name: 'Sales', color: '#FB923C' }, 

  // Status/Process
  { name: 'Needs Review', color: '#EAB308' }, 
  { name: 'In Review', color: '#FCD34D' }, 
  { name: 'Approved', color: '#A3E635' }, 
  { name: 'Rejected', color: '#F87171' }, 
  { name: 'Blocked', color: '#78716C' }, 
  { name: 'Wont Fix', color: '#4B5563' }, 
  { name: 'Duplicate', color: '#A1A1AA' }, 
  { name: 'On Hold', color: '#FDBA74' }, 
  { name: 'Deferred', color: '#9CA3AF' }, 

  // Other useful tags
  { name: 'Refactor', color: '#FACC15' }, 
  { name: 'Optimization', color: '#FB923C' }, 
  { name: 'Performance', color: '#F5A623'}, 
  { name: 'Security', color: '#B91C1C' }, 
  { name: 'Accessibility', color: '#A78BFA'}, 
  { name: 'Technical Debt', color: '#FCA5A5'}, 
  { name: 'Feedback', color: '#EA580C' }, 
  { name: 'Client Request', color: '#6366F1' }, 
  { name: 'Release', color: '#06B6D4' }, 
  { name: 'Hotfix', color: '#BE123C' }, 
  { name: 'Sprint Goal', color: '#1D4ED8' }, 
  { name: 'Milestone', color: '#5B21B6' }, 
];


const DEFAULT_PROJECT_README_CONTENT = `# 📝 Bienvenue sur FlowUp – Guide Markdown

Ce document vous montre comment structurer vos fichiers \`.md\` (Markdown) dans FlowUp. Le Markdown vous permet de créer des documents lisibles, structurés et interactifs pour votre équipe (documentation, notes, wiki, README, etc.).

---

## 🔤 Titres et sous-titres

Utilisez \`#\` pour structurer votre document :

\`\`\`markdown
# Titre principal (H1)
## Sous-titre (H2)
### Sous-sous-titre (H3)
\`\`\`

Exemple :

# Titre H1  
## Titre H2  
### Titre H3

---

## ✍️ Style de texte

\`\`\`markdown
Texte en **gras**, *italique*, ~~barré~~.
\`\`\`

Exemple :  
Texte en **gras**, *italique*, ~~barré~~.

---

## 📋 Listes

### Listes à puces

\`\`\`markdown
- Élément 1
- Élément 2
  - Sous-élément
\`\`\`

### Listes numérotées

\`\`\`markdown
1. Étape 1
2. Étape 2
\`\`\`

---

## 📦 Blocs de code

Utilisez des accents graves (\`\`\`) pour insérer du code :

\`\`\`js  
console.log('Hello FlowUp')  
\`\`\`

\`\`\`js
console.log('Hello FlowUp')
\`\`\`

---

## 🔗 Liens

\`\`\`markdown
[Nom du lien](https://www.exemple.com)
\`\`\`

Exemple :  
[Visitez FlowUp](https://flowup.example.com)

---

## 🖼️ Images

\`\`\`markdown
![Texte alternatif](https://via.placeholder.com/150)
\`\`\`

Exemple :

![Image de démonstration](https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/130cbde8-9815-42f7-bf47-63bed996b100/dfl8gzd-983a6ce1-bb3c-49ef-a2fe-dceb5a21f60c.png/v1/fill/w_894,h_894,q_70,strp/realistic_real_life_night_fury_4k__night_fury_army_by_brawlfury_dfl8gzd-pre.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTI4MCIsInBhdGgiOiJcL2ZcLzEzMGNiZGU4LTk4MTUtNDJmNy1iZjQ3LTYzYmVkOTk2YjEwMFwvZGZsOGd6ZC05ODNhNmNlMS1iYjNjLTQ5ZWYtYTJmZS1kY2ViNWEyMWY2MGMucG5nIiwid2lkdGgiOiI8PTEyODAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.7ncNv51RbeanSB7oEtebvKNRiRsa1vAgimiU4l5dkdU)

---

## 🧾 Citations

\`\`\`markdown
> Ceci est une citation.
\`\`\`

> Ceci est une citation.

---

## ☑️ Listes de tâches

\`\`\`markdown
- [x] Étape terminée
- [ ] Étape à faire
\`\`\`

- [x] Étape terminée  
- [ ] Étape à faire

---

## 🧮 Tableaux

\`\`\`markdown
| Titre 1 | Titre 2 |
|---------|---------|
| Valeur 1 | Valeur 2 |
\`\`\`

Exemple :

| Nom     | Rôle       |
|---------|------------|
| Alice   | Développeuse |
| Bob     | Designer    |

---

## ⚠️ Limitations sur FlowUp

Certains éléments Markdown **ne sont pas toujours pris en charge**, comme :

- Le **soulignement** (\`<u>texte</u>\`)
- Le **HTML brut**
- Les **équations LaTeX** (\`$E = mc^2$\`)

---

## ✅ Bonnes pratiques

- Utilisez des titres pour structurer votre document
- Favorisez les listes pour les instructions
- Ajoutez des liens ou images pour enrichir la lecture
- Utilisez les blocs de code pour montrer du code ou des commandes

---

## 📚 Ressources

- [Cheat Sheet Markdown (en anglais)](https://www.markdownguide.org/cheat-sheet/)
- [MarkText – éditeur Markdown](https://marktext.app/)
- [Markdown sur GitHub](https://guides.github.com/features/mastering-markdown/)

---

💡 **Astuce FlowUp** : Utilisez les Markdown pour créer des wikis de projet, des spécifications techniques, ou des notes de sprint !
`;


export async function getDbConnection() {
  if (db) {
    return db;
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`PRAGMA foreign_keys = ON;`);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      hashedPassword TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      ownerUuid TEXT NOT NULL,
      isPrivate BOOLEAN DEFAULT TRUE,
      readmeContent TEXT,
      isUrgent BOOLEAN DEFAULT FALSE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ownerUuid) REFERENCES users (uuid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      projectUuid TEXT NOT NULL,
      userUuid TEXT NOT NULL,
      roleInProject TEXT NOT NULL, 
      PRIMARY KEY (projectUuid, userUuid),
      FOREIGN KEY (projectUuid) REFERENCES projects (uuid) ON DELETE CASCADE,
      FOREIGN KEY (userUuid) REFERENCES users (uuid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      projectUuid TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      todoListMarkdown TEXT, 
      status TEXT NOT NULL, 
      assigneeUuid TEXT,      
      dueDate TEXT,
      isPinned BOOLEAN DEFAULT FALSE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectUuid) REFERENCES projects (uuid) ON DELETE CASCADE,
      FOREIGN KEY (assigneeUuid) REFERENCES users (uuid) ON DELETE SET NULL 
    );

    CREATE TABLE IF NOT EXISTS project_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      projectUuid TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT, 
      fileType TEXT NOT NULL, 
      filePath TEXT, 
      createdByUuid TEXT NOT NULL,
      isPinned BOOLEAN DEFAULT FALSE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectUuid) REFERENCES projects (uuid) ON DELETE CASCADE,
      FOREIGN KEY (createdByUuid) REFERENCES users (uuid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      projectUuid TEXT,
      authorUuid TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      isGlobal BOOLEAN NOT NULL DEFAULT FALSE,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (projectUuid) REFERENCES projects (uuid) ON DELETE CASCADE,
      FOREIGN KEY (authorUuid) REFERENCES users (uuid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      projectUuid TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL, 
      UNIQUE (projectUuid, name),
      FOREIGN KEY (projectUuid) REFERENCES projects (uuid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      taskUuid TEXT NOT NULL,
      tagUuid TEXT NOT NULL,
      PRIMARY KEY (taskUuid, tagUuid),
      FOREIGN KEY (taskUuid) REFERENCES tasks (uuid) ON DELETE CASCADE,
      FOREIGN KEY (tagUuid) REFERENCES project_tags (uuid) ON DELETE CASCADE
    );
  `);

  const adminUser = await db.get('SELECT * FROM users WHERE email = ?', 'admin@flowup.com'); // Renamed email
  if (!adminUser) {
    const defaultAdminUUID = '00000000-0000-0000-0000-000000000001'; 
    const defaultAdminPassword = await bcrypt.hash('adminpassword', 10);
    await db.run(
      'INSERT INTO users (uuid, name, email, hashedPassword, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      defaultAdminUUID,
      'Admin User',
      'admin@flowup.com', // Renamed email
      defaultAdminPassword,
      'admin',
      `https://placehold.co/100x100.png?text=AU`
    );
  }

  const memberUser = await db.get('SELECT * FROM users WHERE email = ?', 'member@flowup.com'); // Renamed email
  if (!memberUser) {
    const defaultMemberUUID = uuidv4();
    const defaultMemberPassword = await bcrypt.hash('memberpassword', 10);
    await db.run(
      'INSERT INTO users (uuid, name, email, hashedPassword, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      defaultMemberUUID,
      'Member User',
      'member@flowup.com', // Renamed email
      defaultMemberPassword,
      'member',
      `https://placehold.co/100x100.png?text=MU`
    );
  }
  return db;
}

export async function createUser(name: string, email: string, password: string, role: UserRole = 'member'): Promise<Omit<User, 'hashedPassword'>> {
  const connection = await getDbConnection();
  const hashedPassword = await bcrypt.hash(password, 10);
  const userUuid = uuidv4();
  const defaultAvatarText = name.substring(0,2).toUpperCase() || 'NA';
  const avatar = `https://placehold.co/100x100.png?text=${defaultAvatarText}`;

  const result = await connection.run(
    'INSERT INTO users (uuid, name, email, hashedPassword, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    userUuid,
    name,
    email,
    hashedPassword,
    role,
    avatar
  );

  if (!result.lastID) {
    throw new Error('User creation failed: No ID returned.');
  }

  return {
    id: result.lastID.toString(),
    uuid: userUuid,
    name,
    email,
    role,
    avatar,
  };
}

export async function getUserByEmail(email: string): Promise<(User & { hashedPassword?: string }) | null> {
  const connection = await getDbConnection();
  const userRow = await connection.get<User & { hashedPassword?: string }>(
    'SELECT id, uuid, name, email, hashedPassword, role, avatar FROM users WHERE email = ?',
    email
  );
  if (!userRow) return null;
  return { ...userRow, id: userRow.id.toString() };
}

export async function getUserById(id: string): Promise<User | null> {
  const connection = await getDbConnection();
  const userRow = await connection.get<User>(
    'SELECT id, uuid, name, email, role, avatar FROM users WHERE id = ?',
    id
  );
  if (!userRow) return null;
  return { ...userRow, id: userRow.id.toString() };
}

export async function getUserByUuid(uuid: string): Promise<(User & { hashedPassword?: string }) | null> {
  const connection = await getDbConnection();
  const userRow = await connection.get<(User & { hashedPassword?: string })>(
    'SELECT id, uuid, name, email, hashedPassword, role, avatar FROM users WHERE uuid = ?',
    uuid
  );
  if (!userRow) return null;
  return { ...userRow, id: userRow.id.toString() };
}

export async function updateUserProfile(uuid: string, name: string, email: string, avatar?: string): Promise<User | null> {
  const connection = await getDbConnection();

  const existingUserWithEmail = await connection.get('SELECT uuid FROM users WHERE email = ? AND uuid != ?', email, uuid);
  if (existingUserWithEmail) {
    throw new Error('Email is already in use by another account.');
  }

  let finalAvatar = avatar;
  const currentUser = await getUserByUuid(uuid);

  if (avatar === '') { 
    const defaultAvatarText = name.substring(0,2).toUpperCase() || 'NA';
    finalAvatar = `https://placehold.co/100x100.png?text=${defaultAvatarText}`;
  } else if (avatar === undefined && currentUser) { 
    finalAvatar = currentUser.avatar;
  }
  

  await connection.run(
    'UPDATE users SET name = ?, email = ?, avatar = ? WHERE uuid = ?',
    name,
    email,
    finalAvatar,
    uuid
  );

  const updatedUser = await getUserByUuid(uuid);
  if (!updatedUser) return null;
  const { hashedPassword, ...userToReturn } = updatedUser;
  return userToReturn;
}

export async function createProject(name: string, description: string | undefined, ownerUuid: string): Promise<Project> {
  const connection = await getDbConnection();
  const projectUuid = uuidv4();
  const now = new Date().toISOString();

  await connection.run('BEGIN TRANSACTION');
  try {
    const result = await connection.run(
      'INSERT INTO projects (uuid, name, description, ownerUuid, createdAt, updatedAt, isPrivate, readmeContent, isUrgent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      projectUuid, name, description, ownerUuid, now, now, true, DEFAULT_PROJECT_README_CONTENT, false
    );

    if (!result.lastID) {
      throw new Error('Project creation failed: No ID returned from projects table.');
    }

    await connection.run(
      'INSERT INTO project_members (projectUuid, userUuid, roleInProject) VALUES (?, ?, ?)',
      projectUuid, ownerUuid, 'owner'
    );

    for (const defaultTag of DEFAULT_PROJECT_TAGS) {
      await createProjectTag(projectUuid, defaultTag.name, defaultTag.color);
    }

    await connection.run('COMMIT');

    return {
      uuid: projectUuid,
      name,
      description,
      ownerUuid,
      createdAt: now,
      updatedAt: now,
      isPrivate: true,
      readmeContent: DEFAULT_PROJECT_README_CONTENT,
      isUrgent: false,
    };
  } catch (err) {
    await connection.run('ROLLBACK');
    console.error("Error creating project:", err);
    if (err instanceof Error && (err as any).code === 'SQLITE_CONSTRAINT_UNIQUE' && (err.message.includes('projects.name') || err.message.includes('projects.uuid'))) { 
        throw new Error('A project with this name or UUID already exists.');
    }
    throw err;
  }
}

export async function getProjectByUuid(uuid: string): Promise<Project | null> {
  const connection = await getDbConnection();
  const projectRow = await connection.get<Project & { isUrgent: 0 | 1, isPrivate: 0 | 1 }>(
    'SELECT uuid, name, description, ownerUuid, isPrivate, readmeContent, isUrgent, createdAt, updatedAt FROM projects WHERE uuid = ?',
    uuid
  );
  if (!projectRow) return null;
  return {
    ...projectRow,
    isUrgent: !!projectRow.isUrgent, 
    isPrivate: !!projectRow.isPrivate,
  };
}

export async function updateProjectDetails(uuid: string, name: string, description: string | undefined): Promise<Project | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();

  const result = await connection.run(
    'UPDATE projects SET name = ?, description = ?, updatedAt = ? WHERE uuid = ?',
    name,
    description,
    now,
    uuid
  );

  if (result.changes === 0) {
    return null;
  }
  return getProjectByUuid(uuid);
}

export async function updateProjectReadme(projectUuid: string, readmeContent: string): Promise<Project | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  const result = await connection.run(
    'UPDATE projects SET readmeContent = ?, updatedAt = ? WHERE uuid = ?',
    readmeContent, now, projectUuid
  );
  if (result.changes === 0) return null;
  return getProjectByUuid(projectUuid);
}

export async function updateProjectUrgency(projectUuid: string, isUrgent: boolean): Promise<Project | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  const result = await connection.run(
    'UPDATE projects SET isUrgent = ?, updatedAt = ? WHERE uuid = ?',
    isUrgent ? 1 : 0, now, projectUuid 
  );
  if (result.changes === 0) return null;
  return getProjectByUuid(projectUuid);
}

export async function updateProjectVisibility(projectUuid: string, isPrivate: boolean): Promise<Project | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  const result = await connection.run(
    'UPDATE projects SET isPrivate = ?, updatedAt = ? WHERE uuid = ?',
    isPrivate ? 1 : 0, now, projectUuid
  );
  if (result.changes === 0) return null;
  return getProjectByUuid(projectUuid);
}


export async function getProjectsForUser(userUuid: string): Promise<Project[]> {
  const connection = await getDbConnection();
  const projectsData = await connection.all<Array<Project & { isUrgent: 0 | 1, isPrivate: 0 | 1 }>>(
    `SELECT p.uuid, p.name, p.description, p.ownerUuid, p.isPrivate, p.readmeContent, p.isUrgent, p.createdAt, p.updatedAt
     FROM projects p
     JOIN project_members pm ON p.uuid = pm.projectUuid
     WHERE pm.userUuid = ?
     ORDER BY p.updatedAt DESC`,
    userUuid
  );
  return projectsData.map(p => ({
    ...p,
    isUrgent: !!p.isUrgent,
    isPrivate: !!p.isPrivate,
  }));
}

export async function getAllProjects(): Promise<Project[]> {
    const connection = await getDbConnection();
    const projectsData = await connection.all<Array<Project & { isUrgent: 0 | 1, isPrivate: 0 | 1 }>>(
      'SELECT uuid, name, description, ownerUuid, isPrivate, readmeContent, isUrgent, createdAt, updatedAt FROM projects ORDER BY updatedAt DESC'
    );
    return projectsData.map(p => ({
      ...p,
      isUrgent: !!p.isUrgent,
      isPrivate: !!p.isPrivate,
    }));
}

export async function getProjectMemberRole(projectUuid: string, userUuid: string): Promise<ProjectMemberRole | null> {
  const connection = await getDbConnection();
  const member = await connection.get<{ roleInProject: ProjectMemberRole }>(
    'SELECT roleInProject FROM project_members WHERE projectUuid = ? AND userUuid = ?',
    projectUuid,
    userUuid
  );
  return member?.roleInProject || null;
}

export async function addProjectMember(projectUuid: string, userUuid: string, roleInProject: ProjectMemberRole): Promise<ProjectMember | null> {
  const connection = await getDbConnection();
  const existingMember = await connection.get(
    'SELECT * FROM project_members WHERE projectUuid = ? AND userUuid = ?',
    projectUuid,
    userUuid
  );

  if (existingMember) {
    await connection.run(
      'UPDATE project_members SET roleInProject = ? WHERE projectUuid = ? AND userUuid = ?',
      roleInProject, projectUuid, userUuid
    );
  } else {
    await connection.run(
      'INSERT INTO project_members (projectUuid, userUuid, roleInProject) VALUES (?, ?, ?)',
      projectUuid,
      userUuid,
      roleInProject
    );
  }

  const user = await getUserByUuid(userUuid);
  if (!user) return null;

  return {
    projectUuid,
    userUuid,
    role: roleInProject,
    user: { uuid: user.uuid, name: user.name, avatar: user.avatar, email: user.email }
  };
}

export async function getProjectMembers(projectUuid: string): Promise<ProjectMember[]> {
  const connection = await getDbConnection();
  const membersData = await connection.all<Array<{ userUuid: string; roleInProject: ProjectMemberRole; name: string; email: string; avatar?: string }>>(
    `SELECT pm.userUuid, pm.roleInProject, u.name, u.email, u.avatar
     FROM project_members pm
     JOIN users u ON pm.userUuid = u.uuid
     WHERE pm.projectUuid = ?`,
    projectUuid
  );
  return membersData.map(m => ({
    projectUuid,
    userUuid: m.userUuid,
    role: m.roleInProject,
    user: { uuid: m.userUuid, name: m.name, email: m.email, avatar: m.avatar }
  }));
}

export async function removeProjectMember(projectUuid: string, userUuid: string): Promise<boolean> {
  const connection = await getDbConnection();
  const project = await getProjectByUuid(projectUuid);
  if (project?.ownerUuid === userUuid) {
      console.warn("Attempted to remove project owner. This action should be handled carefully, e.g., by transferring ownership first.");
      return false;
  }

  const result = await connection.run(
    'DELETE FROM project_members WHERE projectUuid = ? AND userUuid = ?',
    projectUuid,
    userUuid
  );
  return result.changes ? result.changes > 0 : false;
}


export async function createProjectTag(projectUuid: string, name: string, color: string): Promise<Tag> {
  const connection = await getDbConnection();
  const tagUuid = uuidv4();
  try {
    await connection.run(
      'INSERT INTO project_tags (uuid, projectUuid, name, color) VALUES (?, ?, ?, ?)',
      tagUuid, projectUuid, name, color
    );
    return { uuid: tagUuid, projectUuid, name, color };
  } catch (error: any) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      const existingTag = await getProjectTagByName(projectUuid, name);
      if (existingTag) return existingTag;
      throw new Error(`Failed to create or find tag: ${name}`);
    }
    throw error;
  }
}

export async function getProjectTagByName(projectUuid: string, name: string): Promise<Tag | null> {
  const connection = await getDbConnection();
  return connection.get<Tag>('SELECT * FROM project_tags WHERE projectUuid = ? AND name = ?', projectUuid, name);
}

export async function getProjectTags(projectUuid: string): Promise<Tag[]> {
  const connection = await getDbConnection();
  return connection.all<Tag[]>('SELECT * FROM project_tags WHERE projectUuid = ? ORDER BY name ASC', projectUuid);
}

export async function linkTagToTask(taskUuid: string, tagUuid: string): Promise<void> {
  const connection = await getDbConnection();
  await connection.run('INSERT OR IGNORE INTO task_tags (taskUuid, tagUuid) VALUES (?, ?)', taskUuid, tagUuid);
}

export async function clearTagsForTask(taskUuid: string): Promise<void> {
  const connection = await getDbConnection();
  await connection.run('DELETE FROM task_tags WHERE taskUuid = ?', taskUuid);
}

export async function getTagsForTask(taskUuid: string): Promise<Tag[]> {
  const connection = await getDbConnection();
  return connection.all<Tag[]>(
    `SELECT pt.uuid, pt.name, pt.color, pt.projectUuid
     FROM project_tags pt
     JOIN task_tags tt ON pt.uuid = tt.tagUuid
     WHERE tt.taskUuid = ?`,
    taskUuid
  );
}


export async function createTask(data: {
  projectUuid: string;
  title: string;
  description?: string;
  todoListMarkdown?: string; 
  status: TaskStatus;
  assigneeUuid?: string | null;
  tagsString?: string;
}): Promise<Task> {
  const connection = await getDbConnection();
  const taskUuid = uuidv4();
  const now = new Date().toISOString();

  await connection.run('BEGIN TRANSACTION');
  try {
    const result = await connection.run(
      'INSERT INTO tasks (uuid, projectUuid, title, description, todoListMarkdown, status, assigneeUuid, createdAt, updatedAt, isPinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      taskUuid, data.projectUuid, data.title, data.description || undefined, data.todoListMarkdown || '', data.status, data.assigneeUuid, now, now, false
    );
    if (!result.lastID) throw new Error('Task creation failed.');

    if (data.tagsString) {
      const tagNames = data.tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
      for (const tagName of tagNames) {
        let tag = await getProjectTagByName(data.projectUuid, tagName);
        if (!tag) {
          const defaultTagInfo = DEFAULT_PROJECT_TAGS.find(dt => dt.name.toLowerCase() === tagName.toLowerCase());
          const color = defaultTagInfo ? defaultTagInfo.color : '#6B7280'; 
          tag = await createProjectTag(data.projectUuid, tagName, color);
        }
        await linkTagToTask(taskUuid, tag.uuid);
      }
    }
    await connection.run('COMMIT');
  } catch (error) {
    await connection.run('ROLLBACK');
    throw error;
  }

  const createdTaskWithDetails = await getTaskByUuid(taskUuid);
  if (!createdTaskWithDetails) throw new Error('Failed to retrieve created task with details');
  return createdTaskWithDetails;
}

export async function getTaskByUuid(taskUuid: string): Promise<Task | null> {
  const connection = await getDbConnection();
  const taskData = await connection.get<Omit<Task, 'tags' | 'assigneeName' | 'isPinned'> & { isPinned: 0 | 1 }>(
    `SELECT uuid, projectUuid, title, description, todoListMarkdown, status, assigneeUuid, createdAt, updatedAt, isPinned 
     FROM tasks 
     WHERE uuid = ?`,
    taskUuid
  );
  if (!taskData) return null;

  const tags = await getTagsForTask(taskUuid);
  let assigneeName: string | null = null;
  if (taskData.assigneeUuid) {
    const assignee = await getUserByUuid(taskData.assigneeUuid);
    assigneeName = assignee?.name || null;
  }
  return { ...taskData, tags, assigneeName: assigneeName || undefined, isPinned: !!taskData.isPinned };
}


export async function getTasksForProject(projectUuid: string): Promise<Task[]> {
  const connection = await getDbConnection();
  const taskRows = await connection.all<Array<Omit<Task, 'tags' | 'assigneeName' | 'isPinned'> & { isPinned: 0 | 1 }>>(
    `SELECT uuid, projectUuid, title, description, todoListMarkdown, status, assigneeUuid, createdAt, updatedAt, isPinned
     FROM tasks
     WHERE projectUuid = ?
     ORDER BY isPinned DESC, updatedAt DESC`, 
    projectUuid
  );

  const tasksWithDetails: Task[] = [];
  for (const taskRow of taskRows) {
    const tags = await getTagsForTask(taskRow.uuid);
    let assigneeName: string | null = null;
    if (taskRow.assigneeUuid) {
      const assignee = await getUserByUuid(taskRow.assigneeUuid);
      assigneeName = assignee?.name || null;
    }
    tasksWithDetails.push({ ...taskRow, tags, assigneeName: assigneeName || undefined, isPinned: !!taskRow.isPinned });
  }
  return tasksWithDetails;
}

export async function updateTask(
  taskUuid: string,
  data: {
    title?: string;
    description?: string;
    todoListMarkdown?: string;
    status?: TaskStatus;
    assigneeUuid?: string | null;
    tagsString?: string;
    isPinned?: boolean; 
  }
): Promise<Task | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  
  const currentTask = await getTaskByUuid(taskUuid);
  if (!currentTask) return null;

  const updates: string[] = [];
  const values: (string | number | null | undefined )[] = []; 

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description || null); } 
  if (data.todoListMarkdown !== undefined) { updates.push('todoListMarkdown = ?'); values.push(data.todoListMarkdown || ''); } 
  if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
  if (data.assigneeUuid !== undefined) { updates.push('assigneeUuid = ?'); values.push(data.assigneeUuid); } 
  if (data.isPinned !== undefined) { updates.push('isPinned = ?'); values.push(data.isPinned ? 1 : 0); } 
  
  if (updates.length === 0 && data.tagsString === undefined) return currentTask; 

  await connection.run('BEGIN TRANSACTION');
  try {
    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(now);
      const query = `UPDATE tasks SET ${updates.join(', ')} WHERE uuid = ?`;
      values.push(taskUuid);
      await connection.run(query, ...values);
    }

    if (data.tagsString !== undefined) {
      await clearTagsForTask(taskUuid);
      const tagNames = data.tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
      for (const tagName of tagNames) {
        let tag = await getProjectTagByName(currentTask.projectUuid, tagName);
        if (!tag) {
          const defaultTagInfo = DEFAULT_PROJECT_TAGS.find(dt => dt.name.toLowerCase() === tagName.toLowerCase());
          const color = defaultTagInfo ? defaultTagInfo.color : '#6B7280';
          tag = await createProjectTag(currentTask.projectUuid, tagName, color);
        }
        await linkTagToTask(taskUuid, tag.uuid);
      }
    }
    await connection.run('COMMIT');
  } catch (error) {
    await connection.run('ROLLBACK');
    throw error;
  }
  
  return getTaskByUuid(taskUuid);
}


export async function updateTaskStatus(taskUuid: string, status: TaskStatus): Promise<Task | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  const result = await connection.run(
    'UPDATE tasks SET status = ?, updatedAt = ? WHERE uuid = ?',
    status,
    now,
    taskUuid
  );
  if (result.changes === 0) return null;
  return getTaskByUuid(taskUuid);
}

export async function toggleTaskPinStatus(taskUuid: string, isPinned: boolean): Promise<Task | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  const result = await connection.run(
    'UPDATE tasks SET isPinned = ?, updatedAt = ? WHERE uuid = ?',
    isPinned ? 1 : 0, now, taskUuid
  );
  if (result.changes === 0) return null;
  return getTaskByUuid(taskUuid);
}

export async function deleteTask(taskUuid: string): Promise<boolean> {
  const connection = await getDbConnection();
  await connection.run('BEGIN TRANSACTION');
  try {
    await clearTagsForTask(taskUuid); 
    const result = await connection.run('DELETE FROM tasks WHERE uuid = ?', taskUuid);
    await connection.run('COMMIT');
    return result.changes ? result.changes > 0 : false;
  } catch (error) {
    await connection.run('ROLLBACK');
    throw error;
  }
}


// Document DB Functions
export async function createDocument(data: {
  projectUuid: string;
  title: string;
  content?: string;
  fileType: ProjectDocumentType['fileType'];
  filePath?: string;
  createdByUuid: string;
}): Promise<ProjectDocumentType> {
  const connection = await getDbConnection();
  const docUuid = uuidv4();
  const now = new Date().toISOString();

  const result = await connection.run(
    'INSERT INTO project_documents (uuid, projectUuid, title, content, fileType, filePath, createdByUuid, createdAt, updatedAt, isPinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    docUuid, data.projectUuid, data.title, data.content, data.fileType, data.filePath, data.createdByUuid, now, now, false
  );
  if (!result.lastID) throw new Error('Document creation failed.');

  const newDoc = await getDocumentByUuid(docUuid);
  if (!newDoc) throw new Error('Failed to retrieve created document.');
  return newDoc;
}

export async function getDocumentsForProject(projectUuid: string): Promise<ProjectDocumentType[]> {
  const connection = await getDbConnection();
  const docs = await connection.all<Array<ProjectDocumentType & { isPinned: 0 | 1 }>>(
    'SELECT * FROM project_documents WHERE projectUuid = ? ORDER BY updatedAt DESC',
    projectUuid
  );
  return docs.map(doc => ({ ...doc, isPinned: !!doc.isPinned }));
}

export async function getDocumentByUuid(uuid: string): Promise<ProjectDocumentType | null> {
  const connection = await getDbConnection();
  const doc = await connection.get<ProjectDocumentType & { isPinned: 0 | 1 }>(
    'SELECT * FROM project_documents WHERE uuid = ?',
    uuid
  );
  if (!doc) return null;
  return { ...doc, isPinned: !!doc.isPinned };
}

export async function updateDocumentContent(docUuid: string, title: string, content?: string): Promise<ProjectDocumentType | null> {
  const connection = await getDbConnection();
  const now = new Date().toISOString();
  
  // Fetch the document to check its type, as PDF content/filePath might not be updatable here
  const currentDoc = await getDocumentByUuid(docUuid);
  if (!currentDoc) return null;

  let query = 'UPDATE project_documents SET title = ?, updatedAt = ?';
  const params: (string | number | null | undefined)[] = [title, now];

  // Only update content if it's not a PDF and content is provided
  // For PDF, content is null, filePath is used. This function primarily updates text-based content.
  if (currentDoc.fileType !== 'pdf' && content !== undefined) {
    query += ', content = ?';
    params.push(content);
  }
  
  query += ' WHERE uuid = ?';
  params.push(docUuid);

  const result = await connection.run(query, ...params);
  if (result.changes === 0) return null; // Or currentDoc if no actual change to content for PDF but title changed
  
  return getDocumentByUuid(docUuid);
}

export async function deleteDocument(docUuid: string): Promise<boolean> {
  const connection = await getDbConnection();
  // Note: If files were stored on a filesystem/S3, they'd need to be deleted here too.
  const result = await connection.run('DELETE FROM project_documents WHERE uuid = ?', docUuid);
  return result.changes ? result.changes > 0 : false;
}
