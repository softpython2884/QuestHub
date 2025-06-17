export type UserRole = 'admin' | 'manager' | 'member' | 'Développeur' | 'Graphiste' | 'Tester' | 'Staff';

export interface User {
  id: string; // This is the auto-incremented ID from the DB
  uuid: string; // This is the globally unique identifier
  email: string;
  name: string;
  role: UserRole;
  avatar?: string; 
  // passwordHash should not be part of the User object sent to the client
}

export interface Tag {
  id: string;
  name: string;
  color: string; // e.g., Tailwind color class or hex code
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Archived';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string; // User ID (maps to User's uuid)
  projectId: string;
  dueDate?: string; // ISO date string
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id:string;
  title: string;
  content: string; // Could be Markdown or other rich text format
  projectId: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string; // User ID (maps to User's uuid)
  memberIds: string[]; // User IDs (maps to User's uuid)
  tasks: Task[];
  documents: Document[];
  tags: Tag[];
  announcements: Announcement[];
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string; // User ID (maps to User's uuid)
  projectId?: string; // Optional: if project-specific
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}
