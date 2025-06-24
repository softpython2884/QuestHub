

export type UserRole = 'admin' | 'manager' | 'member' | 'Développeur' | 'Graphiste' | 'Tester' | 'Staff';

export interface User {
  id: string;
  uuid: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  bio?: string | null;
  websiteUrl?: string | null;
  showGithubOnProfile?: boolean;
  showDiscordOnProfile?: boolean;
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

export interface UserDiscordOAuthToken {
  userUuid: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Store as timestamp
  scopes: string;
  discordUserId: string;
  discordUsername: string;
  discordAvatar?: string | null;
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
  content?: string; // Added for files, base64 encoded
  encoding?: 'base64' | 'utf-8'; // Added for files
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

// Represents a document within a specific project
export interface ProjectDocument {
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

export interface GlobalTag {
  uuid: string;
  name: string;
}

export interface DocAlbum {
  uuid: string;
  title: string;
  description?: string;
  authorUuid: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  documentCount?: number;
}

// Represents a document in the global documentation section
export interface GlobalDocument {
  id: string;
  uuid: string;
  title: string;
  content: string;
  authorUuid: string;
  authorName?: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
  tags?: GlobalTag[];
  linkedProject?: Pick<Project, 'uuid' | 'name'> | null;
  albums?: Pick<DocAlbum, 'uuid' | 'title'>[];
}

export type ProjectMemberRole = 'owner' | 'co-owner' | 'editor' | 'viewer';

export interface ProjectMember {
  projectUuid: string;
  userUuid: string;
  role: ProjectMemberRole;
  user?: Pick<User, 'uuid' | 'name' | 'avatar' | 'email'>;
  githubInvitationPending: boolean;
}

export interface Project {
  uuid: string;
  name: string;
  description?: string;
  ownerUuid: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  isPrivate?: boolean;
  readmeContent?: string;
  isUrgent?: boolean;
  vanityId?: string | null;
  storageBackend: 'github' | 'local';
  githubRepoUrl?: string | null;
  githubRepoName?: string | null;
  githubInstallationId?: number; // Kept for potential future use with App-specific actions
  githubWebhookId?: number | null;
  githubWebhookSecret?: string | null;
  discordWebhookUrl?: string | null;
  discordNotificationsEnabled?: boolean;
  discordNotifyTasks?: boolean;
  discordNotifyMembers?: boolean;
  discordNotifyAnnouncements?: boolean;
  discordNotifyDocuments?: boolean;
  discordNotifySettings?: boolean;
  starCount?: number;
  isStarred?: boolean;
  memberCount?: number;
}

// Represents an announcement within a specific project
export interface ProjectAnnouncement {
  id: string;
  uuid: string;
  title: string;
  content: string;
  authorUuid: string;
  authorName?: string;
  authorAvatar?: string;
  projectUuid: string;
  isGlobal: boolean; // Kept for legacy, but we'll use a separate table for true global announcements
  createdAt: string;
  updatedAt: string;
}

// Represents an announcement in the global announcements section
export interface GlobalAnnouncement {
  id: string;
  uuid: string;
  title: string;
  content: string;
  authorUuid: string;
  authorName?: string;
  authorAvatar?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}


// Discord Types
export interface DiscordEmbed {
    title?: string;
    description?: string;
    url?: string;
    timestamp?: string;
    color?: number;
    footer?: {
        text: string;
        icon_url?: string;
    };
    thumbnail?: {
        url: string;
    };
    author?: {
        name: string;
        url?: string;
        icon_url?: string;
    };
    fields?: Array<{
        name: string;
        value: string;
        inline?: boolean;
    }>;
}

export interface DiscordWebhookPayload {
    content?: string;
    username?: string;
    avatar_url?: string;
    embeds?: DiscordEmbed[];
}

export interface DuplicateProjectFormState {
  message?: string;
  error?: string;
  duplicatedProject?: Project;
}

export interface OAuthApp {
  uuid: string;
  name: string;
  description?: string | null;
  ownerUuid: string;
  clientId: string;
  clientSecret?: string; // Only available on creation
  redirectUris: string[];
  website?: string | null;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOAuthAppFormState {
  message?: string;
  error?: string;
  fieldErrors?: { [key: string]: string[] | undefined };
  createdApp?: {
    name: string;
    clientId: string;
    clientSecret: string;
  };
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type SuggestionStatus = 'open' | 'under_review' | 'planned' | 'done';

export interface Suggestion {
    uuid: string;
    title: string;
    description: string;
    authorUuid: string;
    authorName?: string;
    authorAvatar?: string;
    status: SuggestionStatus;
    createdAt: string;
    voteCount: number;
}

export interface SuggestionVote {
    suggestionUuid: string;
    userUuid: string;
    voteType: 'up' | 'down';
}

export interface Message {
    uuid: string;
    conversationUuid: string;
    authorUuid: string;
    authorName?: string;
    authorAvatar?: string;
    content: string;
    createdAt: string;
    pending?: boolean;
}

export type ConversationType = 'dm' | 'project';

export interface Conversation {
    uuid: string;
    type: ConversationType;
    name: string; // User name for DM, project name for project chat
    avatar?: string;
    lastMessage?: string;
    lastMessageAt?: string;
    lastMessageAuthor?: string;
    hasUnread: boolean;
    projectUuid?: string; // Only for project chats
    otherUserUuid?: string; // Only for DMs
}
