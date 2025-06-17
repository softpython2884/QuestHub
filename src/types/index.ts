
export type UserRole = 'admin' | 'manager' | 'member' | 'Développeur' | 'Graphiste' | 'Tester' | 'Staff';

export interface User {
  id: string; // This is the auto-incremented ID from the DB
  uuid: string; // This is the globally unique identifier
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Tag {
  id: string; // Will likely be a UUID internally, but can be just 'id' for the type
  uuid: string; // Explicit UUID from DB
  name: string;
  color: string; // e.g., Tailwind color class or hex code
  projectUuid: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Archived';

export interface Task {
  id: string; // Original ID, can be primary key from DB if not UUID yet for mock
  uuid: string; // Explicit UUID from DB
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeUuid?: string; // User UUID
  projectUuid: string; // Project UUID
  dueDate?: string; // ISO date string
  tags: Tag[]; // Array of Tag objects
  createdAt: string;
  updatedAt: string;
}

export interface Document { // Kept as Document for type usage, maps to project_documents table
  id: string; // Original ID
  uuid: string; // Explicit UUID from DB
  title: string;
  content: string; // Could be Markdown or other rich text format
  projectUuid: string; // Project UUID
  isPinned?: boolean;
  tags: Tag[]; // Array of Tag objects
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = 'owner' | 'co-owner' | 'editor' | 'viewer';

export interface ProjectMember {
  projectUuid: string;
  userUuid: string;
  role: ProjectMemberRole;
  user?: Pick<User, 'uuid' | 'name' | 'avatar' | 'email'>; // Optional: for displaying member info
}

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  ownerUuid: string; // User UUID of the project owner
  tasks?: Task[];
  documents?: Document[];
  tags?: Tag[];
  announcements?: Announcement[];
  createdAt: string;
  updatedAt: string;
  isPrivate?: boolean;
}

export interface Announcement {
  id: string; // Original ID
  uuid: string; // Explicit UUID from DB
  title: string;
  content: string;
  authorUuid: string; // User UUID
  projectUuid?: string; // Optional: if project-specific, Project UUID
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

