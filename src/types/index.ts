
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
  uuid: string;
  name: string;
  color: string;
  projectUuid: string;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Archived';

export interface Task {
  uuid: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeUuid?: string | null; // User UUID - null if unassigned or for "everyone"
  assigneeName?: string | null; // For display purposes
  projectUuid: string;
  tags: Tag[]; // Array of Tag objects
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

export interface Document {
  id: string;
  uuid: string;
  title: string;
  content: string;
  projectUuid: string;
  isPinned?: boolean;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export type ProjectMemberRole = 'owner' | 'co-owner' | 'editor' | 'viewer';

export interface ProjectMember {
  projectUuid: string;
  userUuid: string;
  role: ProjectMemberRole;
  user?: Pick<User, 'uuid' | 'name' | 'avatar' | 'email'>;
}

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  ownerUuid: string;
  createdAt: string;
  updatedAt: string;
  isPrivate?: boolean;
  readmeContent?: string;
  isUrgent?: boolean;
}

export interface Announcement {
  id: string;
  uuid: string;
  title: string;
  content: string;
  authorUuid: string;
  projectUuid?: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

