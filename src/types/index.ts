
export type UserRole = 'admin' | 'manager' | 'member' | 'Développeur' | 'Graphiste' | 'Tester' | 'Staff';

export interface User {
  id: string;
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface UserGithubInstallation {
    user_uuid: string;
    github_installation_id: number;
    github_account_login?: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserGithubOAuthToken {
  userUuid: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresIn?: number | null;
  scopes: string;
  tokenType: string;
  createdAt: string;
  updatedAt: string;
}

export interface GithubRepoContentItem {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  _links: {
    self: string;
    git: string;
    html: string;
  };
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
  todoListMarkdown?: string;
  status: TaskStatus;
  assigneeUuid?: string | null;
  assigneeName?: string | null;
  projectUuid: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

export interface Document {
  id: string;
  uuid: string;
  title: string;
  content?: string;
  fileType: 'markdown' | 'txt' | 'html' | 'pdf' | 'other';
  filePath?: string;
  projectUuid: string;
  createdByUuid: string;
  createdByName?: string;
  creatorAvatar?: string;
  isPinned?: boolean;
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
  githubRepoUrl?: string;
  githubRepoName?: string;
  githubInstallationId?: number;
}

export interface Announcement {
  id: string;
  uuid: string;
  title: string;
  content: string;
  authorUuid: string;
  authorName?: string;
  authorAvatar?: string;
  projectUuid: string;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}
