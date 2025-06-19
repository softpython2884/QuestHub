
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit3, PlusCircle, Trash2, CheckSquare, FileText, Megaphone, Users, FolderGit2, Loader2, Mail, UserX, Tag as TagIcon, BookOpen, Pin, PinOff, ShieldAlert, Eye as EyeIcon, Flame, AlertCircle, ListChecks, Palette, FileUp, CheckCircle, ExternalLink, Info, Code2, Github, Link2, Sparkles, Settings2 } from 'lucide-react';
import Link from 'next/link';
import type { Project, Task, Document as ProjectDocumentType, Tag as TagType, ProjectMember, ProjectMemberRole, TaskStatus, Announcement as ProjectAnnouncementType, UserGithubInstallation } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback, startTransition as ReactStartTransition, useRef, Suspense } from 'react';
import { useActionState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import {
  fetchProjectAction,
  fetchProjectOwnerNameAction,
  updateProjectAction,
  inviteUserToProjectAction,
  type InviteUserFormState,
  fetchProjectMembersAction,
  removeUserFromProjectAction,
  createTaskAction,
  type CreateTaskFormState,
  fetchTasksAction,
  updateTaskStatusAction,
  type UpdateTaskStatusFormState,
  updateTaskAction,
  type UpdateTaskFormState,
  deleteTaskAction,
  type DeleteTaskFormState,
  fetchProjectTagsAction,
  saveProjectReadmeAction,
  type SaveProjectReadmeFormState,
  toggleProjectUrgencyAction,
  type ToggleProjectUrgencyFormState,
  toggleProjectVisibilityAction,
  type ToggleProjectVisibilityFormState,
  toggleTaskPinAction,
  type ToggleTaskPinState,
  createProjectTagAction,
  type CreateProjectTagFormState,
  fetchDocumentsAction,
  deleteDocumentAction,
  type DeleteDocumentFormState,
  createProjectAnnouncementAction,
  type CreateProjectAnnouncementFormState,
  fetchProjectAnnouncementsAction,
  deleteProjectAnnouncementAction,
  type DeleteProjectAnnouncementFormState,
  linkProjectToGithubAction,
  type LinkProjectToGithubFormState,
  fetchUserGithubAccessDetailsAction,
  type UserGithubAccessDetails,
} from './actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MarkdownTaskListRenderer } from '@/components/MarkdownTaskListRenderer';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';


export const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Done', 'Archived'];
const memberRoles: Exclude<ProjectMemberRole, 'owner'>[] = ['co-owner', 'editor', 'viewer'];

const UNASSIGNED_VALUE = "__UNASSIGNED__";

const editProjectFormSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }).max(100),
  description: z.string().max(5000, {message: "Description cannot exceed 5000 characters."}).optional().or(z.literal('')),
});
type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;

const inviteUserFormSchema = z.object({
  emailToInvite: z.string().email({ message: "Please enter a valid email address." }),
  roleToInvite: z.enum(memberRoles, { errorMap: () => ({ message: "Please select a role."}) }),
});
type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(taskStatuses),
  assigneeUuid: z.string().optional(),
  tagsString: z.string().optional().describe("Comma-separated tag names"),
  todoListMarkdown: z.string().optional().default(''),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

const projectTagFormSchema = z.object({
  tagName: z.string().min(1, "Tag name is required.").max(50, "Tag name too long."),
  tagColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format. Must be #RRGGBB."),
});
type ProjectTagFormValues = z.infer<typeof projectTagFormSchema>;

const projectAnnouncementFormSchema = z.object({
  title: z.string().min(1, "Title is required.").max(255),
  content: z.string().min(1, "Content is required."),
});
type ProjectAnnouncementFormValues = z.infer<typeof projectAnnouncementFormSchema>;


const convertMarkdownToSubtaskInput = (markdown?: string): string => {
  if (!markdown) return '';
  return markdown.split('\n').map(line => {
    const trimmedLine = line.trim();
    const matchChecked = trimmedLine.match(/^\s*\*\s*\[x\]\s*(.*)/i);
    if (matchChecked && matchChecked[1] !== undefined) {
      return `** ${matchChecked[1].trim()}`;
    }
    const matchUnchecked = trimmedLine.match(/^\s*\*\s*\[ \]\s*(.*)/i);
    if (matchUnchecked && matchUnchecked[1] !== undefined) {
      return `* ${matchUnchecked[1].trim()}`;
    }
    return trimmedLine;
  }).join('\n');
};


const convertSubtaskInputToMarkdown = (input: string): string => {
  return input.split('\n').map(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('** ')) {
      return `* [x] ${trimmedLine.substring(3).trim()}`;
    } else if (trimmedLine.startsWith('* ')) {
      return `* [ ] ${trimmedLine.substring(2).trim()}`;
    } else if (trimmedLine.length > 0) {
      return `* [ ] ${trimmedLine}`;
    }
    return '';
  }).filter(line => line.trim().length > 0).join('\n');
};

function ProjectDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const projectUuid = params.id as string;

  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwnerName, setProjectOwnerName] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTags, setProjectTags] = useState<TagType[]>([]);
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocumentType[]>([]);
  const [projectAnnouncements, setProjectAnnouncements] = useState<ProjectAnnouncementType[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectMemberRole | null>(null);
  const [userGithubAccess, setUserGithubAccess] = useState<UserGithubAccessDetails | null>(null);


  const [isLoadingData, setIsLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);

  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [taskToManageSubtasks, setTaskToManageSubtasks] = useState<Task | null>(null);
  const [isManageSubtasksDialogOpen, setIsManageSubtasksDialogOpen] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');

  const [projectReadmeContent, setProjectReadmeContent] = useState('');

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSubmitSourceRef = useRef<'subtasks' | 'main' | null>(null);

  const [tagSuggestions, setTagSuggestions] = useState<TagType[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [activeTagInputName, setActiveTagInputName] = useState<"tagsString" | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const lastTypedFragmentRef = useRef<string>("");


  const [isAddProjectTagDialogOpen, setIsAddProjectTagDialogOpen] = useState(false);

  const [documentToView, setDocumentToView] = useState<ProjectDocumentType | null>(null);
  const [isViewDocumentDialogOpen, setIsViewDocumentDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocumentType | null>(null);

  const [isCreateAnnouncementDialogOpen, setIsCreateAnnouncementDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<ProjectAnnouncementType | null>(null);

  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['tasks', 'readme', 'documents', 'announcements', 'codespace', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`/projects/${projectUuid}?tab=${newTab}`, { scroll: false });
  };

  const editProjectForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const inviteForm = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: { emailToInvite: '', roleToInvite: 'viewer' },
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '', todoListMarkdown: '' },
  });

  const projectTagForm = useForm<ProjectTagFormValues>({
    resolver: zodResolver(projectTagFormSchema),
    defaultValues: { tagName: '', tagColor: '#6B7280' },
  });

  const projectAnnouncementForm = useForm<ProjectAnnouncementFormValues>({
    resolver: zodResolver(projectAnnouncementFormSchema),
    defaultValues: { title: '', content: '' },
  });

  const [updateProjectFormState, updateProjectFormAction, isUpdateProjectPending] = useActionState(updateProjectAction, { message: "", errors: {} });
  const [inviteFormState, inviteUserFormAction, isInvitePending] = useActionState(inviteUserToProjectAction, { message: "", error: "" });
  const [createTaskState, createTaskFormAction, isCreateTaskPending] = useActionState(createTaskAction, { message: "", error: "" });
  const [updateTaskStatusState, performUpdateTaskStatusAction, isUpdateTaskStatusPending] = useActionState(updateTaskStatusAction, { message: "", error: "" });
  const [updateTaskState, updateTaskFormAction, isUpdateTaskPending] = useActionState(updateTaskAction, { message: "", error: "" });
  const [deleteTaskState, deleteTaskFormAction, isDeleteTaskPending] = useActionState(deleteTaskAction, { message: "", error: ""});
  const [saveReadmeState, saveReadmeFormAction, isSaveReadmePending] = useActionState(saveProjectReadmeAction, { message: "", error: "" });
  const [toggleUrgencyState, toggleUrgencyFormAction, isToggleUrgencyPending] = useActionState(toggleProjectUrgencyAction, { message: "", error: "" });
  const [toggleVisibilityState, toggleVisibilityFormAction, isToggleVisibilityPending] = useActionState(toggleProjectVisibilityAction, { message: "", error: "" });
  const [toggleTaskPinState, toggleTaskPinFormAction, isToggleTaskPinPending] = useActionState(toggleTaskPinAction, { message: "", error: "" });
  const [createProjectTagState, createProjectTagFormAction, isCreateProjectTagPending] = useActionState(createProjectTagAction, { message: "", error: "" });
  const [deleteDocumentState, deleteDocumentFormAction, isDeleteDocumentPending] = useActionState(deleteDocumentAction, { message: "", error: "" });
  const [createAnnouncementState, createProjectAnnouncementFormAction, isCreateAnnouncementPending] = useActionState(createProjectAnnouncementAction, { message: "", error: "" });
  const [deleteAnnouncementState, deleteProjectAnnouncementFormAction, isDeleteAnnouncementPending] = useActionState(deleteProjectAnnouncementAction, { message: "", error: ""});
  const [linkGithubState, linkProjectToGithubFormAction, isLinkGithubPending] = useActionState(linkProjectToGithubAction, { message: "", error: "" });


  const loadTasks = useCallback(async () => {
    if (projectUuid) {
      try {
        const fetchedTasks = await fetchTasksAction(projectUuid);
        setTasks(fetchedTasks || []);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        setTasks([]);
        toast({ variant: "destructive", title: "Error", description: "Could not load tasks." });
      }
    }
  }, [projectUuid, toast]);

  const loadProjectMembersAndRole = useCallback(async (currentProjectOwnerUuid?: string) => {
    if (projectUuid && user) {
        try {
            const members = await fetchProjectMembersAction(projectUuid);
            setProjectMembers(members);
            let role: ProjectMemberRole | null = null;
            if (currentProjectOwnerUuid === user.uuid) {
                role = 'owner';
            } else {
                const member = members.find(m => m.userUuid === user.uuid);
                role = member?.role || null;
            }
            setCurrentUserRole(role);
            return role;
        } catch (error) {
            console.error("Failed to load project members or determine role", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load project members or determine your role." });
            return null;
        }
    }
    return null;
  }, [projectUuid, user, toast]);


  const loadProjectTagsData = useCallback(async () => {
    if (projectUuid) {
      try {
        const tags = await fetchProjectTagsAction(projectUuid);
        setProjectTags(tags);
      } catch (error) {
        console.error("Failed to load project tags:", error);
         toast({ variant: "destructive", title: "Error", description: "Could not load project tags." });
      }
    }
  }, [projectUuid, toast]);

  const loadProjectDocuments = useCallback(async () => {
    if (projectUuid) {
      try {
        const docs = await fetchDocumentsAction(projectUuid);
        setProjectDocuments(docs || []);
      } catch (error) {
        console.error("Failed to load documents:", error);
        setProjectDocuments([]);
        toast({ variant: "destructive", title: "Error", description: "Could not load documents." });
      }
    }
  }, [projectUuid, toast]);

  const loadProjectAnnouncements = useCallback(async () => {
    if (projectUuid) {
      try {
        const announcements = await fetchProjectAnnouncementsAction(projectUuid);
        setProjectAnnouncements(announcements || []);
      } catch (error) {
        console.error("Failed to load project announcements:", error);
        setProjectAnnouncements([]);
        toast({ variant: "destructive", title: "Error", description: "Could not load project announcements." });
      }
    }
  }, [projectUuid, toast]);

  const loadUserGithubAccess = useCallback(async () => {
    if (user) {
      try {
        const accessDetails = await fetchUserGithubAccessDetailsAction();
        setUserGithubAccess(accessDetails);
        if (accessDetails.error) {
            console.warn("Error fetching GitHub access details:", accessDetails.error);
        }
      } catch (error) {
        console.error("Exception fetching GitHub access details:", error);
        setUserGithubAccess({ installationId: null, accountLogin: null, error: "Failed to fetch GitHub integration details." });
      }
    }
  }, [user]);


 useEffect(() => {
    const performLoadProjectData = async () => {
        if (projectUuid && user && !authLoading) {
            setIsLoadingData(true);
            setAccessDenied(false);
            try {
                const projectData = await fetchProjectAction(projectUuid);

                if (projectData) {
                    const userRoleForProject = await loadProjectMembersAndRole(projectData.ownerUuid);

                    if (projectData.isPrivate && !userRoleForProject) {
                        setAccessDenied(true);
                        setProject(null);
                        toast({variant: "destructive", title: "Access Denied", description: "This project is private and you are not a member."});
                        setIsLoadingData(false);
                        router.push('/projects');
                        return;
                    }

                    setProject(projectData);
                    editProjectForm.reset({ name: projectData.name, description: projectData.description || '' });
                    setProjectReadmeContent(projectData.readmeContent || '');


                    if (projectData.ownerUuid) {
                        const ownerName = await fetchProjectOwnerNameAction(projectData.ownerUuid);
                        setProjectOwnerName(ownerName);
                    }
                    await loadTasks();
                    await loadProjectTagsData();
                    await loadProjectDocuments();
                    await loadProjectAnnouncements();
                    await loadUserGithubAccess();

                } else {
                    setAccessDenied(true);
                    setProject(null);
                    toast({variant: "destructive", title: "Project Not Found", description: "The project could not be loaded or you don't have access."});
                }
            } catch (err) {
                console.error("[ProjectDetail] performLoadProjectData: Error fetching project on client:", err);
                setProject(null);
                setAccessDenied(true);
                toast({variant: "destructive", title: "Error", description: "Could not load project details."})
            } finally {
                setIsLoadingData(false);
            }
        } else if (!authLoading && !user) {
            router.push('/login');
        }
    };
      performLoadProjectData();
  }, [projectUuid, user, authLoading, router, toast, editProjectForm, loadProjectMembersAndRole, loadTasks, loadProjectTagsData, loadProjectDocuments, loadProjectAnnouncements, loadUserGithubAccess]);


  useEffect(() => {
    if (!isUpdateProjectPending && updateProjectFormState) {
      if (updateProjectFormState.message && !updateProjectFormState.error) {
        toast({ title: "Success", description: updateProjectFormState.message });
        setIsEditDialogOpen(false);
        if(updateProjectFormState.project) {
          setProject(updateProjectFormState.project);
        }
      }
      if (updateProjectFormState.error) {
        toast({ variant: "destructive", title: "Error", description: updateProjectFormState.error });
      }
    }
  }, [updateProjectFormState, isUpdateProjectPending, toast]);

  useEffect(() => {
    if (!isInvitePending && inviteFormState) {
        if (inviteFormState.message && !inviteFormState.error) {
            toast({ title: "Success", description: inviteFormState.message });
            setIsInviteUserDialogOpen(false);
            inviteForm.reset();
            loadProjectMembersAndRole(project?.ownerUuid);
        }
        if (inviteFormState.error) {
            toast({ variant: "destructive", title: "Invitation Error", description: inviteFormState.error });
        }
    }
  }, [inviteFormState, isInvitePending, toast, loadProjectMembersAndRole, inviteForm, project?.ownerUuid]);

  useEffect(() => {
    if (!isCreateTaskPending && createTaskState) {
      if (createTaskState.message && !createTaskState.error) {
        toast({ title: "Success", description: createTaskState.message });
        setIsCreateTaskDialogOpen(false);
        taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '', todoListMarkdown: '' });
        loadTasks();
      }
      if (createTaskState.error) {
        let errorMessage = createTaskState.error;
        if (createTaskState.fieldErrors?.assigneeUuid) {
            errorMessage += ` Assignee: ${createTaskState.fieldErrors.assigneeUuid.join(', ')}`;
        }
        if (createTaskState.fieldErrors?.title) {
             errorMessage += ` Title: ${createTaskState.fieldErrors.title.join(', ')}`;
        }
        toast({ variant: "destructive", title: "Task Creation Error", description: errorMessage });
      }
    }
  }, [createTaskState, isCreateTaskPending, toast, loadTasks, taskForm]);

  useEffect(() => {
    if (!isUpdateTaskStatusPending && updateTaskStatusState) {
        if (updateTaskStatusState.message && !updateTaskStatusState.error) {
            toast({ title: "Success", description: updateTaskStatusState.message });
            loadTasks();
        }
        if (updateTaskStatusState.error) {
            toast({ variant: "destructive", title: "Status Update Error", description: updateTaskStatusState.error });
        }
    }
  }, [updateTaskStatusState, isUpdateTaskStatusPending, toast, loadTasks]);


  useEffect(() => {
    if (isUpdateTaskPending || !updateTaskState) return;

    if (updateTaskState.error && !isUpdateTaskPending) {
        let errorMessage = updateTaskState.error;
        Object.entries(updateTaskState.fieldErrors || {}).forEach(([key, value]) => {
            if (value) {
                errorMessage += ` ${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.join(', ')}`;
            }
        });
        toast({ variant: "destructive", title: "Task Update Error", description: errorMessage });
        lastSubmitSourceRef.current = null;
        return;
    }

    if (updateTaskState.message && !updateTaskState.error && updateTaskState.updatedTask) {
        toast({ title: "Success", description: updateTaskState.message });
        loadTasks();

        if (lastSubmitSourceRef.current === 'subtasks' && taskToManageSubtasks?.uuid === updateTaskState.updatedTask.uuid) {
             setIsManageSubtasksDialogOpen(false);
             setTaskToManageSubtasks(null);
        } else if (lastSubmitSourceRef.current === 'main' && taskToEdit?.uuid === updateTaskState.updatedTask.uuid) {
            setIsEditTaskDialogOpen(false);
            setTaskToEdit(null);
        }
        lastSubmitSourceRef.current = null;
    }
}, [updateTaskState, isUpdateTaskPending, toast, loadTasks, taskToManageSubtasks, taskToEdit]);

 useEffect(() => {
    if (isEditTaskDialogOpen && taskToEdit) {
      taskForm.reset({
        title: taskToEdit.title,
        description: taskToEdit.description || '',
        status: taskToEdit.status,
        assigneeUuid: taskToEdit.assigneeUuid || UNASSIGNED_VALUE,
        tagsString: taskToEdit.tags.map(t => t.name).join(', ') || '',
        todoListMarkdown: taskToEdit.todoListMarkdown || '',
      });
    }
  }, [isEditTaskDialogOpen, taskToEdit, taskForm]);


  useEffect(() => {
    if (isManageSubtasksDialogOpen && taskToManageSubtasks) {
      setSubtaskInput(convertMarkdownToSubtaskInput(taskToManageSubtasks.todoListMarkdown));
    } else {
      setSubtaskInput('');
    }
  }, [isManageSubtasksDialogOpen, taskToManageSubtasks]);


  useEffect(() => {
    if (!isDeleteTaskPending && deleteTaskState) {
        if (deleteTaskState.message && !deleteTaskState.error) {
            toast({ title: "Success", description: deleteTaskState.message });
            setTaskToDelete(null);
            loadTasks();
        }
        if (deleteTaskState.error) {
            toast({ variant: "destructive", title: "Task Deletion Error", description: deleteTaskState.error });
        }
    }
  }, [deleteTaskState, isDeleteTaskPending, toast, loadTasks]);

  useEffect(() => {
    if (!isSaveReadmePending && saveReadmeState) {
        if (saveReadmeState.message && !saveReadmeState.error) {
            toast({ title: "Success", description: saveReadmeState.message });
            if(saveReadmeState.project) {
                setProject(saveReadmeState.project);
                setProjectReadmeContent(saveReadmeState.project.readmeContent || '');
            }
        }
        if (saveReadmeState.error) {
            toast({ variant: "destructive", title: "README Error", description: saveReadmeState.error });
        }
    }
  }, [saveReadmeState, isSaveReadmePending, toast]);

  useEffect(() => {
    if (!isToggleUrgencyPending && toggleUrgencyState) {
        if (toggleUrgencyState.message && !toggleUrgencyState.error) {
            toast({ title: "Success", description: toggleUrgencyState.message });
            if(toggleUrgencyState.project) setProject(toggleUrgencyState.project);
        }
        if (toggleUrgencyState.error) {
            toast({ variant: "destructive", title: "Urgency Error", description: toggleUrgencyState.error });
        }
    }
  }, [toggleUrgencyState, isToggleUrgencyPending, toast]);

  useEffect(() => {
    if (!isToggleVisibilityPending && toggleVisibilityState) {
        if (toggleVisibilityState.message && !toggleVisibilityState.error) {
            toast({ title: "Success", description: toggleVisibilityState.message });
            if(toggleVisibilityState.project) setProject(toggleVisibilityState.project);
        }
        if (toggleVisibilityState.error) {
            toast({ variant: "destructive", title: "Visibility Error", description: toggleVisibilityState.error });
        }
    }
  }, [toggleVisibilityState, isToggleVisibilityPending, toast]);

  useEffect(() => {
    if (!isToggleTaskPinPending && toggleTaskPinState) {
        if (toggleTaskPinState.message && !toggleTaskPinState.error) {
            toast({ title: "Success", description: toggleTaskPinState.message });
            loadTasks();
        }
        if (toggleTaskPinState.error) {
            toast({ variant: "destructive", title: "Pin Error", description: toggleTaskPinState.error });
        }
    }
  }, [toggleTaskPinState, isToggleTaskPinPending, toast, loadTasks]);

  useEffect(() => {
    if (!isCreateProjectTagPending && createProjectTagState) {
      if (createProjectTagState.message && !createProjectTagState.error) {
        toast({ title: "Success", description: createProjectTagState.message });
        setIsAddProjectTagDialogOpen(false);
        projectTagForm.reset({ tagName: '', tagColor: '#6B7280' });
        loadProjectTagsData();
      }
      if (createProjectTagState.error) {
        toast({ variant: "destructive", title: "Tag Creation Error", description: createProjectTagState.error });
      }
    }
  }, [createProjectTagState, isCreateProjectTagPending, toast, projectTagForm, loadProjectTagsData]);

  useEffect(() => {
    if (!isDeleteDocumentPending && deleteDocumentState) {
        if (deleteDocumentState.message && !deleteDocumentState.error) {
            toast({ title: "Success", description: deleteDocumentState.message });
            setDocumentToDelete(null);
            loadProjectDocuments();
        }
        if (deleteDocumentState.error) {
            toast({ variant: "destructive", title: "Document Deletion Error", description: deleteDocumentState.error });
        }
    }
  }, [deleteDocumentState, isDeleteDocumentPending, toast, loadProjectDocuments]);

  useEffect(() => {
    if (!isCreateAnnouncementPending && createAnnouncementState) {
      if (createAnnouncementState.message && !createAnnouncementState.error) {
        toast({ title: "Success", description: createAnnouncementState.message });
        setIsCreateAnnouncementDialogOpen(false);
        projectAnnouncementForm.reset({ title: '', content: ''});
        loadProjectAnnouncements();
      }
      if (createAnnouncementState.error) {
        toast({ variant: "destructive", title: "Announcement Error", description: createAnnouncementState.error });
      }
    }
  }, [createAnnouncementState, isCreateAnnouncementPending, toast, projectAnnouncementForm, loadProjectAnnouncements]);

  useEffect(() => {
    if (!isDeleteAnnouncementPending && deleteAnnouncementState) {
      if (deleteAnnouncementState.message && !deleteAnnouncementState.error) {
        toast({ title: "Success", description: deleteAnnouncementState.message });
        setAnnouncementToDelete(null);
        loadProjectAnnouncements();
      }
      if (deleteAnnouncementState.error) {
        toast({ variant: "destructive", title: "Delete Error", description: deleteAnnouncementState.error });
      }
    }
  }, [deleteAnnouncementState, isDeleteAnnouncementPending, toast, loadProjectAnnouncements]);

  useEffect(() => {
    if (!isLinkGithubPending && linkGithubState) {
      if (linkGithubState.message && !linkGithubState.error) {
        toast({ title: "Success", description: linkGithubState.message });
        if (linkGithubState.project) {
          setProject(linkGithubState.project);
          loadUserGithubAccess();
        }
      }
      if (linkGithubState.error) {
        toast({ variant: "destructive", title: "GitHub Link Error", description: linkGithubState.error });
      }
    }
  }, [linkGithubState, isLinkGithubPending, toast, loadUserGithubAccess]);


  useEffect(() => {
    if (project) {
      editProjectForm.reset({ name: project.name, description: project.description || '' });
      setProjectReadmeContent(project.readmeContent || '');
    }
  }, [project, editProjectForm]);


  const canManageProjectSettings = currentUserRole === 'owner' || currentUserRole === 'co-owner';
  const canCreateUpdateDeleteTasks = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';
  const canEditTaskStatus = !!currentUserRole;
  const isAdminOrOwner = currentUserRole === 'owner' || user?.role === 'admin';
  const canManageDocuments = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';
  const canManageAnnouncements = currentUserRole === 'owner' || currentUserRole === 'co-owner';
  const canManageCodeSpace = currentUserRole === 'owner' || currentUserRole === 'co-owner';


  const handleEditProjectSubmit = async (values: EditProjectFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('description', values.description || '');
    formData.append('projectUuid', project.uuid);
    ReactStartTransition(() => {
      updateProjectFormAction(formData);
    });
  };

  const handleInviteSubmit = async (values: InviteUserFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('emailToInvite', values.emailToInvite);
    formData.append('roleToInvite', values.roleToInvite);
    ReactStartTransition(() => {
      inviteUserFormAction(formData);
    });
  };

  const handleCreateTaskSubmit = async (values: TaskFormValues) => {
    if (!project) return;
    const formData = new FormData();
    const finalAssigneeUuid = values.assigneeUuid === UNASSIGNED_VALUE ? '' : values.assigneeUuid;

    formData.append('projectUuid', project.uuid);
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('status', values.status);
    formData.append('assigneeUuid', finalAssigneeUuid || '');
    if (values.tagsString) formData.append('tagsString', values.tagsString);
    formData.append('todoListMarkdown', values.todoListMarkdown || '');

    ReactStartTransition(() => {
      createTaskFormAction(formData);
    });
  };

  const handleEditTaskSubmit = async (values: TaskFormValues) => {
    if (!project || !taskToEdit) return;
    lastSubmitSourceRef.current = 'main';
    const formData = new FormData();
    const finalAssigneeUuid = values.assigneeUuid === UNASSIGNED_VALUE ? '' : values.assigneeUuid;

    formData.append('taskUuid', taskToEdit.uuid);
    formData.append('projectUuid', project.uuid);
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('todoListMarkdown', values.todoListMarkdown || (taskToEdit.todoListMarkdown || ''));
    formData.append('status', values.status);
    formData.append('assigneeUuid', finalAssigneeUuid || '');
    if (values.tagsString) formData.append('tagsString', values.tagsString);

    ReactStartTransition(() => {
      updateTaskFormAction(formData);
    });
  };


  const openManageSubtasksDialog = (task: Task) => {
    setTaskToManageSubtasks(task);
    setIsManageSubtasksDialogOpen(true);
  };

  const handleSaveSubtasks = () => {
    if (!project || !taskToManageSubtasks) return;
    lastSubmitSourceRef.current = 'subtasks';
    const newTodoListMarkdown = convertSubtaskInputToMarkdown(subtaskInput);

    const formData = new FormData();
    formData.append('taskUuid', taskToManageSubtasks.uuid);
    formData.append('projectUuid', project.uuid);
    formData.append('todoListMarkdown', newTodoListMarkdown);

    formData.append('title', taskToManageSubtasks.title);
    formData.append('status', taskToManageSubtasks.status);
    if (taskToManageSubtasks.description) formData.append('description', taskToManageSubtasks.description);
    if (taskToManageSubtasks.assigneeUuid) formData.append('assigneeUuid', taskToManageSubtasks.assigneeUuid);
    const currentTagsString = taskToManageSubtasks.tags.map(t => t.name).join(', ');
    if (currentTagsString) formData.append('tagsString', currentTagsString);


    ReactStartTransition(() => {
      updateTaskFormAction(formData);
    });
  };

  const handleTodoListChangeOnCard = (taskUuid: string, newTodoListMarkdown: string) => {
    if (!project) return;
    const taskToUpdate = tasks.find(t => t.uuid === taskUuid);
    if (!taskToUpdate) return;

    if (debounceTimers.current[taskUuid]) {
      clearTimeout(debounceTimers.current[taskUuid]);
    }

    debounceTimers.current[taskUuid] = setTimeout(() => {
      lastSubmitSourceRef.current = null;
      const formData = new FormData();
      formData.append('taskUuid', taskUuid);
      formData.append('projectUuid', project.uuid);
      formData.append('todoListMarkdown', newTodoListMarkdown);

      formData.append('title', taskToUpdate.title);
      formData.append('status', taskToUpdate.status);
      if (taskToUpdate.description) formData.append('description', taskToUpdate.description);
      if (taskToUpdate.assigneeUuid) formData.append('assigneeUuid', taskToUpdate.assigneeUuid);
      const currentTagsString = taskToUpdate.tags.map(t => t.name).join(', ');
      if (currentTagsString) formData.append('tagsString', currentTagsString);

      ReactStartTransition(() => {
        updateTaskFormAction(formData);
      });
    }, 750);
  };


  const openEditTaskDialog = (task: Task) => {
    setTaskToEdit(task);
    taskForm.reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        assigneeUuid: task.assigneeUuid || UNASSIGNED_VALUE,
        tagsString: task.tags.map(t => t.name).join(', ') || '',
        todoListMarkdown: task.todoListMarkdown || '',
      });
    setIsEditTaskDialogOpen(true);
  };

  const handleDeleteTaskConfirm = () => {
    if (!taskToDelete || !project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskToDelete.uuid);
    formData.append('projectUuid', project.uuid);
    ReactStartTransition(() => {
      deleteTaskFormAction(formData);
    });
  };


  const handleTaskStatusChange = (taskUuid: string, newStatus: TaskStatus) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskUuid);
    formData.append('projectUuid', project.uuid);
    formData.append('status', newStatus as string);

    ReactStartTransition(() => {
        performUpdateTaskStatusAction(formData);
    });
  };


  const handleRemoveMember = async (memberUuidToRemove: string) => {
    if (!project) return;
    ReactStartTransition(async () => {
      const result = await removeUserFromProjectAction(project.uuid, memberUuidToRemove);
      if (result.success) {
          toast({ title: "Success", description: result.message });
          loadProjectMembersAndRole(project.ownerUuid);
      } else {
          toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const handleSaveReadme = () => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('readmeContent', projectReadmeContent);
    ReactStartTransition(() => {
      saveReadmeFormAction(formData);
    });
  };

  const handleToggleUrgency = (checked: boolean) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('isUrgent', String(checked));
    ReactStartTransition(() => {
      toggleUrgencyFormAction(formData);
    });
  };

  const handleToggleVisibility = (checked: boolean) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('isPrivate', String(checked));
    ReactStartTransition(() => {
      toggleVisibilityFormAction(formData);
    });
  };

  const handleToggleTaskPin = (taskUuid: string, currentPinStatus: boolean) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskUuid);
    formData.append('projectUuid', project.uuid);
    formData.append('isPinned', String(!currentPinStatus));
    ReactStartTransition(() => {
        toggleTaskPinFormAction(formData);
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const getTaskBorderColor = (status: TaskStatus): string => {
    switch (status) {
      case 'To Do': return 'border-gray-400 dark:border-gray-500';
      case 'In Progress': return 'border-blue-500';
      case 'Done': return 'border-green-500';
      case 'Archived': return 'border-neutral-500 dark:border-neutral-600';
      default: return 'border-muted';
    }
  };

  const groupTasksByStatus = () => {
    const grouped: Record<TaskStatus, Task[]> = {
      'To Do': [],
      'In Progress': [],
      'Done': [],
      'Archived': [],
    };
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        grouped['Archived'].push(task);
      }
    });

    for (const status in grouped) {
        grouped[status as TaskStatus].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    }
    return grouped;
  };

  const tasksByStatus = groupTasksByStatus();

  const getCurrentTagFragment = (value: string): string => {
    const parts = value.split(',');
    return parts[parts.length - 1].trimStart();
  };

  const handleTagsStringInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    fieldApi: any,
    formApi: any
  ) => {
    const inputValue = event.currentTarget.value;
    fieldApi.onChange(inputValue);

    const fragment = getCurrentTagFragment(inputValue);
    setActiveTagInputName(fieldApi.name as "tagsString");

    if (fragment) {
        const lowerFragment = fragment.toLowerCase();
        const currentTagsInInput = inputValue.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        const filtered = projectTags
            .filter(tag =>
                tag.name.toLowerCase().startsWith(lowerFragment) &&
                !currentTagsInInput.slice(0, -1).includes(tag.name.toLowerCase())
            )
            .slice(0, 5);
        setTagSuggestions(filtered);
        setShowTagSuggestions(filtered.length > 0);

        if (fragment !== lastTypedFragmentRef.current) {
             setActiveSuggestionIndex(-1);
        }
        lastTypedFragmentRef.current = fragment;

    } else {
        setTagSuggestions([]);
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = "";
    }
  };


  const handleTagSuggestionClick = (
    suggestion: TagType,
    fieldApi: any,
    formApi: any
  ) => {
    const currentFieldValue = fieldApi.value || "";
    const parts = currentFieldValue.split(',');
    parts[parts.length - 1] = suggestion.name;

    let newValue = parts.join(',');
    if (!newValue.endsWith(', ')) {
         newValue += ', ';
    }

    fieldApi.onChange(newValue);
    setTagSuggestions([]);
    setShowTagSuggestions(false);
    setActiveSuggestionIndex(-1);
    lastTypedFragmentRef.current = "";
    setTimeout(() => tagInputRef.current?.focus(), 0);
  };

  const handleTagInputKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    fieldApi: any,
    formApi: any
  ) => {
    if (showTagSuggestions && tagSuggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex(prev => Math.min(prev + 1, tagSuggestions.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex(prev => Math.max(prev - 1, 0));
      } else if ((event.key === 'Enter' || event.key === 'Tab') && activeSuggestionIndex >= 0 && activeSuggestionIndex < tagSuggestions.length) {
        event.preventDefault();
        event.stopPropagation();
        handleTagSuggestionClick(tagSuggestions[activeSuggestionIndex], fieldApi, formApi);
        return;
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = "";
        return;
      }
    } else {
      if (event.key === 'Escape') {
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = "";
      }
    }
  };


  const handleCreateProjectTagSubmit = async (values: ProjectTagFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('tagName', values.tagName);
    formData.append('tagColor', values.tagColor);
    ReactStartTransition(() => {
      createProjectTagFormAction(formData);
    });
  };

  const openViewDocumentDialog = (doc: ProjectDocumentType) => {
    setDocumentToView(doc);
    setIsViewDocumentDialogOpen(true);
  };

  const handleDeleteDocumentConfirm = () => {
    if (!documentToDelete || !project) return;
    const formData = new FormData();
    formData.append('documentUuid', documentToDelete.uuid);
    formData.append('projectUuid', project.uuid);
    ReactStartTransition(() => {
      deleteDocumentFormAction(formData);
    });
  };

  const handleCreateProjectAnnouncementSubmit = async (values: ProjectAnnouncementFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('title', values.title);
    formData.append('content', values.content);
    ReactStartTransition(() => {
      createProjectAnnouncementFormAction(formData);
    });
  };

  const handleDeleteAnnouncementConfirm = () => {
    if (!announcementToDelete || !project) return;
    const formData = new FormData();
    formData.append('announcementUuid', announcementToDelete.uuid);
    formData.append('projectUuid', project.uuid);
    formData.append('authorUuid', announcementToDelete.authorUuid);
    ReactStartTransition(() => {
      deleteProjectAnnouncementFormAction(formData);
    });
  };

  const handleLinkOrInstallGithub = async () => {
    if (!project || !user) return;

    const accessDetails = await fetchUserGithubAccessDetailsAction();
    setUserGithubAccess(accessDetails);

    if (accessDetails.error) {
      toast({ variant: "destructive", title: "GitHub Error", description: accessDetails.error });
      return;
    }

    if (!accessDetails.installationId) {
      const githubAppName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME;
      if (!githubAppName) {
        toast({ variant: "destructive", title: "Configuration Error", description: "GitHub App name is not configured." });
        return;
      }
      const stateParam = encodeURIComponent(`projectUuid=${projectUuid}&redirectTo=/projects/${projectUuid}?tab=codespace`);
      const installUrl = `https://github.com/apps/${githubAppName}/installations/new?state=${stateParam}`;
      window.location.href = installUrl;
    } else {
      const formData = new FormData();
      formData.append('projectUuid', project.uuid);
      formData.append('projectName', project.name);
      ReactStartTransition(() => {
        linkProjectToGithubFormAction(formData);
      });
    }
  };


  if (authLoading || isLoadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-36 mb-4" />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-3/4 mt-2" />
             <div className="mt-3 flex flex-wrap gap-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                <div><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-5 w-24" /></div>
                <div><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-5 w-12" /></div>
                <div><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-5 w-28" /></div>
                <div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-5 w-28" /></div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-full" />
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (accessDenied || !project || !user) {
    return (
        <div className="space-y-6 text-center flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
            <Button variant="outline" onClick={() => router.push('/projects')} className="mb-4 self-start">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects List
            </Button>
            <AlertCircle className="mx-auto h-16 w-16 text-destructive mt-12" />
            <h2 className="text-2xl font-semibold mt-4">Access Denied or Project Not Found</h2>
            <p className="text-muted-foreground">
              {accessDenied ? "You do not have permission to view this private project, or the project does not exist." : `Project (ID: ${projectUuid}) not found or access is restricted.`}
            </p>
        </div>
    );
  }


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className={cn("shadow-lg", project.isUrgent && "border-2 border-destructive ring-2 ring-destructive/50")}>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-3xl font-headline">{project.name}</CardTitle>
                {project.isUrgent && <Flame className="h-7 w-7 text-destructive" />}
                <Badge variant={project.isPrivate ? "secondary" : "outline"} className={cn("border",project.isPrivate ? "border-amber-500 text-amber-600" : "border-green-500 text-green-600")}>
                    {project.isPrivate ? "Private" : "Public"}
                </Badge>
              </div>
              {project.description ? (
                <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown>
                </div>
              ) : (
                <CardDescription className="mt-1">No description provided.</CardDescription>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {projectTags.slice(0, 5).map(tag => (
                  <Badge key={tag.uuid} style={{ backgroundColor: tag.color }} className="text-white text-xs">{tag.name}</Badge>
                ))}
                {projectTags.length > 5 && <Badge variant="outline">+{projectTags.length - 5} more</Badge>}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!canManageProjectSettings}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update the name and description (Markdown supported) of your project.</DialogDescription>
                  </DialogHeader>
                  <Form {...editProjectForm}>
                    <form onSubmit={editProjectForm.handleSubmit(handleEditProjectSubmit)} className="space-y-4">
                      <FormField
                        control={editProjectForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editProjectForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Description (Optional, Markdown)</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={5} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       {updateProjectFormState?.errors?.name && <p className="text-sm text-destructive">{Array.isArray(updateProjectFormState.errors.name) ? updateProjectFormState.errors.name.join(', ') : updateProjectFormState.errors.name}</p>}
                       {updateProjectFormState?.errors?.description && <p className="text-sm text-destructive">{Array.isArray(updateProjectFormState.errors.description) ? updateProjectFormState.errors.description.join(', ') : updateProjectFormState.errors.description}</p>}
                       {updateProjectFormState?.error && !updateProjectFormState.errors && <p className="text-sm text-destructive">{updateProjectFormState.error}</p>}
                      <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isUpdateProjectPending}>
                          {isUpdateProjectPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={currentUserRole !== 'owner'}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the project and all its associated data.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => {/* TODO: Implement delete project action */ } } disabled>
                              Yes, delete project
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                <div><strong className="block text-muted-foreground">Owner:</strong> {projectOwnerName || project.ownerUuid}</div>
                <div><strong className="block text-muted-foreground">Members:</strong> {projectMembers.length}</div>
                <div><strong className="block text-muted-foreground">Created:</strong> {new Date(project.createdAt).toLocaleDateString()}</div>
                <div><strong className="block text-muted-foreground">Last Update:</strong> {new Date(project.updatedAt).toLocaleDateString()}</div>
            </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="tasks"><CheckSquare className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="readme"><BookOpen className="mr-2 h-4 w-4"/>README</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4"/>Documents</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4"/>Announcements</TabsTrigger>
          <TabsTrigger value="codespace"><FolderGit2 className="mr-2 h-4 w-4"/>CodeSpace</TabsTrigger>
          <TabsTrigger value="settings"><Users className="mr-2 h-4 w-4"/>Team & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Tasks ({tasks.length})</CardTitle>
               <Dialog open={isCreateTaskDialogOpen} onOpenChange={(isOpen) => { setIsCreateTaskDialogOpen(isOpen); if (!isOpen) { setTagSuggestions([]); setShowTagSuggestions(false); setActiveTagInputName(null); setActiveSuggestionIndex(-1); taskForm.clearErrors(); taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '', todoListMarkdown: '' });} }}>
                <DialogTrigger asChild>
                    <Button size="sm" disabled={!canCreateUpdateDeleteTasks} onClick={() => taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '', todoListMarkdown: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>Fill in the details for the new task.</DialogDescription>
                    </DialogHeader>
                    <Form {...taskForm}>
                        <form onSubmit={taskForm.handleSubmit(handleCreateTaskSubmit)} className="space-y-4">
                            <FormField control={taskForm.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional, Markdown supported)</FormLabel> <FormControl><Textarea {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl> <SelectContent> {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="assigneeUuid" render={({ field }) => ( <FormItem> <FormLabel>Assign To (Optional)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value || UNASSIGNED_VALUE}> <FormControl><SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={UNASSIGNED_VALUE}>Unassigned / Everyone</SelectItem> {projectMembers.map(member => ( <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            <Controller
                                control={taskForm.control}
                                name="tagsString"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tags (comma-separated)</FormLabel>
                                    <Popover open={showTagSuggestions && activeTagInputName === 'tagsString'}
                                             onOpenChange={(open) => {
                                                if(!open && document.activeElement !== tagInputRef.current) {
                                                    setShowTagSuggestions(false);
                                                }
                                            }}
                                    >
                                      <PopoverAnchor>
                                        <FormControl>
                                        <Input
                                            {...field}
                                            ref={tagInputRef}
                                            placeholder="e.g. frontend, bug, urgent"
                                            onFocus={() => {
                                                setActiveTagInputName('tagsString');
                                                const fragment = getCurrentTagFragment(field.value || "");
                                                if (fragment) handleTagsStringInputChange({ currentTarget: { value: field.value } } as React.ChangeEvent<HTMLInputElement>, field, taskForm);
                                            }}
                                            onChange={(e) => handleTagsStringInputChange(e, field, taskForm)}
                                            onKeyDown={(e) => handleTagInputKeyDown(e, field, taskForm)}
                                            onBlur={() => setTimeout(() => {
                                                if (document.activeElement !== tagInputRef.current && !document.querySelector('[data-radix-popper-content-wrapper]:hover')) {
                                                    setShowTagSuggestions(false);
                                                }
                                            }, 150)}
                                        />
                                        </FormControl>
                                      </PopoverAnchor>
                                      {showTagSuggestions && tagSuggestions.length > 0 && (
                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                        <Command shouldFilter={false}>
                                            <CommandList>
                                            <CommandEmpty>No matching tags found.</CommandEmpty>
                                            <CommandGroup>
                                                {tagSuggestions.map((suggestion, index) => (
                                                <CommandItem
                                                    key={suggestion.uuid}
                                                    value={suggestion.name}
                                                    onSelect={() => {
                                                        handleTagSuggestionClick(suggestion, field, taskForm);
                                                    }}
                                                    className={cn("cursor-pointer", index === activeSuggestionIndex && "bg-accent text-accent-foreground")}
                                                >
                                                    {suggestion.name}
                                                </CommandItem>
                                                ))}
                                            </CommandGroup>
                                            </CommandList>
                                        </Command>
                                      </PopoverContent>
                                      )}
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField control={taskForm.control} name="todoListMarkdown" render={({ field }) => ( <FormItem hidden> <FormLabel>Sub-tasks (hidden)</FormLabel> <FormControl><Input type="hidden" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            {createTaskState?.error && !createTaskState.fieldErrors && <p className="text-sm text-destructive">{createTaskState.error}</p>}
                            {createTaskState?.fieldErrors?.title && <p className="text-sm text-destructive">Title: {createTaskState.fieldErrors.title.join(', ')}</p>}
                            {createTaskState?.fieldErrors?.assigneeUuid && <p className="text-sm text-destructive">Assignee: {createTaskState.fieldErrors.assigneeUuid.join(', ')}</p>}
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isCreateTaskPending}> {isCreateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Task </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
               </Dialog>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No tasks in this project yet.</p>
              ) : (
                Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                  statusTasks.length > 0 && (
                    <div key={status} className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 capitalize border-b pb-1">{status} ({statusTasks.length})</h3>
                      <div className="space-y-3">
                        {statusTasks.map(task => (
                          <Card key={task.uuid} className={cn("p-3 border-l-4", getTaskBorderColor(task.status as TaskStatus), task.isPinned && "bg-primary/5")}>
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                   {task.isPinned && <Pin className="h-4 w-4 text-primary flex-shrink-0" />}
                                   <h4 className="font-semibold break-words">{task.title}</h4>
                                </div>
                                {task.description && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted-foreground">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown>
                                    </div>
                                )}

                                <div className="mt-2 pt-2 border-t border-dashed">
                                  {task.todoListMarkdown && task.todoListMarkdown.trim() !== '' ? (
                                      <>
                                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">Sub-tasks:</h5>
                                        <MarkdownTaskListRenderer
                                          content={task.todoListMarkdown}
                                          onContentChange={(newTodoListMarkdown) => handleTodoListChangeOnCard(task.uuid, newTodoListMarkdown)}
                                          disabled={!canCreateUpdateDeleteTasks}
                                        />
                                      </>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                        No sub-tasks defined.
                                        {canCreateUpdateDeleteTasks && (
                                            <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => openManageSubtasksDialog(task)}>
                                                Add sub-tasks
                                            </Button>
                                        )}
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Assigned to: {task.assigneeName || (task.assigneeUuid ? 'Unknown User' : 'Everyone')}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {task.tags.map(tag => (
                                        <Badge key={tag.uuid} variant="secondary" style={{ backgroundColor: tag.color !== '#6B7280' ? tag.color : undefined }} className={cn('text-xs',tag.color === '#6B7280' ? 'bg-muted hover:bg-muted/80 text-muted-foreground' : 'text-white')}>{tag.name}</Badge>
                                    ))}
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 flex-shrink-0">
                                <Select
                                  value={task.status}
                                  disabled={!canEditTaskStatus || isUpdateTaskStatusPending}
                                  onValueChange={(newStatus) => handleTaskStatusChange(task.uuid, newStatus as TaskStatus)}
                                >
                                  <SelectTrigger className="w-full sm:w-[150px] text-xs h-8">
                                    <SelectValue placeholder="Status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {taskStatuses.map(sVal => (
                                      <SelectItem key={sVal} value={sVal} className="text-xs">{sVal}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {canCreateUpdateDeleteTasks && (
                                    <div className="flex mt-1 sm:mt-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Manage Sub-tasks" onClick={() => openManageSubtasksDialog(task)}>
                                            <ListChecks className="h-4 w-4" />
                                            <span className="sr-only">Manage Sub-tasks</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title={task.isPinned ? "Unpin Task" : "Pin Task"} onClick={() => handleToggleTaskPin(task.uuid, task.isPinned || false)} disabled={isToggleTaskPinPending && taskToEdit?.uuid === task.uuid}>
                                            {isToggleTaskPinPending && taskToEdit?.uuid === task.uuid ? <Loader2 className="h-4 w-4 animate-spin"/> : task.isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTaskDialog(task)}>
                                            <Edit3 className="h-4 w-4" />
                                            <span className="sr-only">Edit Task</span>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setTaskToDelete(task)}>
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete Task</span>
                                                </Button>
                                            </AlertDialogTrigger>
                                            {taskToDelete?.uuid === task.uuid && (
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure you want to delete this task?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Task: "{taskToDelete.title}". This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteTaskConfirm} disabled={isDeleteTaskPending}>
                                                        {isDeleteTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                            )}
                                        </AlertDialog>
                                    </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                ))
              )}
            </CardContent>
            </Card>
            <Dialog open={isEditTaskDialogOpen} onOpenChange={(isOpen) => { setIsEditTaskDialogOpen(isOpen); if (!isOpen) { setTaskToEdit(null); setTagSuggestions([]); setShowTagSuggestions(false); setActiveTagInputName(null); setActiveSuggestionIndex(-1); taskForm.clearErrors(); taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '', todoListMarkdown: '' });} }}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Edit Task: {taskToEdit?.title}</DialogTitle>
                        <DialogDescription>Update the main details for this task.</DialogDescription>
                    </DialogHeader>
                    {taskToEdit && (
                        <Form {...taskForm}>
                            <form onSubmit={taskForm.handleSubmit(handleEditTaskSubmit)} className="space-y-4">
                                <FormField control={taskForm.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={taskForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description (Optional, Markdown supported)</FormLabel> <FormControl><Textarea {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={taskForm.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl> <SelectContent> {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                <FormField control={taskForm.control} name="assigneeUuid" render={({ field }) => ( <FormItem> <FormLabel>Assign To (Optional)</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value || UNASSIGNED_VALUE}> <FormControl><SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={UNASSIGNED_VALUE}>Unassigned / Everyone</SelectItem> {projectMembers.map(member => ( <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                <Controller
                                    control={taskForm.control}
                                    name="tagsString"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags (comma-separated)</FormLabel>
                                        <Popover open={showTagSuggestions && activeTagInputName === 'tagsString'}
                                                onOpenChange={(open) => {
                                                    if(!open && document.activeElement !== tagInputRef.current) {
                                                        setShowTagSuggestions(false);
                                                    }
                                                }}
                                        >
                                        <PopoverAnchor>
                                            <FormControl>
                                            <Input
                                                {...field}
                                                ref={tagInputRef}
                                                placeholder="e.g. frontend, bug, urgent"
                                                onFocus={() => {
                                                    setActiveTagInputName('tagsString');
                                                    const fragment = getCurrentTagFragment(field.value || "");
                                                    if (fragment) handleTagsStringInputChange({ currentTarget: { value: field.value } } as React.ChangeEvent<HTMLInputElement>, field, taskForm);
                                                }}
                                                onChange={(e) => handleTagsStringInputChange(e, field, taskForm)}
                                                onKeyDown={(e) => handleTagInputKeyDown(e, field, taskForm)}
                                                onBlur={() => setTimeout(() => {
                                                    if (document.activeElement !== tagInputRef.current && !document.querySelector('[data-radix-popper-content-wrapper]:hover')) {
                                                        setShowTagSuggestions(false);
                                                    }
                                                }, 150)}
                                            />
                                            </FormControl>
                                        </PopoverAnchor>
                                        {showTagSuggestions && tagSuggestions.length > 0 && (
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                            <Command shouldFilter={false}>
                                                <CommandList>
                                                <CommandEmpty>No matching tags found.</CommandEmpty>
                                                <CommandGroup>
                                                    {tagSuggestions.map((suggestion, index) => (
                                                    <CommandItem
                                                        key={suggestion.uuid}
                                                        value={suggestion.name}
                                                        onSelect={() => {
                                                            handleTagSuggestionClick(suggestion, field, taskForm);
                                                        }}
                                                        className={cn("cursor-pointer", index === activeSuggestionIndex && "bg-accent text-accent-foreground")}
                                                    >
                                                        {suggestion.name}
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                        )}
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField control={taskForm.control} name="todoListMarkdown" render={({ field }) => ( <FormItem hidden> <FormLabel>Sub-tasks (hidden)</FormLabel> <FormControl><Input type="hidden" {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                {updateTaskState?.error && !updateTaskState.fieldErrors && <p className="text-sm text-destructive">{updateTaskState.error}</p>}
                                {updateTaskState?.fieldErrors && Object.entries(updateTaskState.fieldErrors).map(([key, value]) => value && <p key={key} className="text-sm text-destructive">{`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value.join(', ')}`}</p>)}
                                <DialogFooter>
                                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isUpdateTaskPending}> {isUpdateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isManageSubtasksDialogOpen} onOpenChange={(isOpen) => { setIsManageSubtasksDialogOpen(isOpen); if(!isOpen) setTaskToManageSubtasks(null); }}>
                <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Manage Sub-tasks for: {taskToManageSubtasks?.title}</DialogTitle>
                    <DialogDescription>
                    Enter sub-tasks one per line.
                    Start with `* ` for an open task (e.g., `* Design mockups`).
                    Start with `** ` for a completed task (e.g., `** Create schema`).
                    Other lines will be treated as new open tasks.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    placeholder="* Sub-task 1&#x0a;** Sub-task 2 (completed)&#x0a;Another sub-task"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                />
                {updateTaskState?.fieldErrors?.todoListMarkdown && <p className="text-sm text-destructive">Sub-tasks: {updateTaskState.fieldErrors.todoListMarkdown.join(', ')}</p>}
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                    <Button type="button" onClick={handleSaveSubtasks} disabled={isUpdateTaskPending}>
                    {isUpdateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Sub-tasks
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </TabsContent>

        <TabsContent value="readme" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Project README</CardTitle>
                <CardDescription>
                  Provide a general overview, setup instructions, or any other important information about this project. Supports Markdown.
                </CardDescription>
              </div>
               <Button onClick={handleSaveReadme} disabled={isSaveReadmePending || !canCreateUpdateDeleteTasks}>
                {isSaveReadmePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save README
              </Button>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none p-4 border rounded-md mb-4 min-h-[100px] bg-background/30">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {projectReadmeContent || ''}
                </ReactMarkdown>
              </div>
              <Textarea
                placeholder="Write your project README here using Markdown..."
                value={projectReadmeContent}
                onChange={(e) => setProjectReadmeContent(e.target.value)}
                rows={15}
                className="font-mono"
                disabled={!canCreateUpdateDeleteTasks}
              />
              {saveReadmeState?.error && <p className="text-sm text-destructive mt-2">{saveReadmeState.error}</p>}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Documents ({projectDocuments.length})</CardTitle>
               {canManageDocuments && (
                <Button size="sm" asChild>
                  <Link href={`/projects/${projectUuid}/documents/new`}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add Document
                  </Link>
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {projectDocuments.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No documents in this project yet.</p>
                    {canManageDocuments &&
                        <Button size="sm" className="mt-4" asChild>
                           <Link href={`/projects/${projectUuid}/documents/new`}>
                            <PlusCircle className="mr-2 h-4 w-4"/> Add your first document
                          </Link>
                        </Button>
                    }
                </div>
              ) : (
                <div className="space-y-3">
                  {projectDocuments.map(doc => (
                    <Card key={doc.uuid} className="p-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <h4 className="font-semibold cursor-pointer hover:underline" onClick={() => openViewDocumentDialog(doc)}>
                              {doc.title}
                            </h4>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-xs capitalize">{doc.fileType}</Badge>
                            <span>•</span>
                            <Avatar className="h-4 w-4">
                                <AvatarImage src={doc.creatorAvatar} alt={doc.createdByName} data-ai-hint="user avatar small" />
                                <AvatarFallback className="text-xs">{getInitials(doc.createdByName)}</AvatarFallback>
                            </Avatar>
                            <span>{doc.createdByName || 'Unknown User'}</span>
                            <span>•</span>
                            <span>Updated: {new Date(doc.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0 self-end sm:self-center">
                           {canManageDocuments && (doc.fileType === 'markdown') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Document" asChild>
                              <Link href={`/projects/${projectUuid}/documents/${doc.uuid}/edit`}>
                                <Edit3 className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                           {canManageDocuments && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Document" onClick={() => setDocumentToDelete(doc)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                {documentToDelete?.uuid === doc.uuid && (
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Document: "{documentToDelete.title}"?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteDocumentConfirm} disabled={isDeleteDocumentPending}>
                                            {isDeleteDocumentPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                )}
                            </AlertDialog>
                          )}
                          <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => openViewDocumentDialog(doc)}>
                            View
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <Dialog open={isViewDocumentDialogOpen} onOpenChange={setIsViewDocumentDialogOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{documentToView?.title}</DialogTitle>
                     <DialogDescription asChild>
                       <div>
                          {documentToView?.createdByName && (
                                <>
                                <Avatar className="h-5 w-5 inline-block align-middle mr-1">
                                    <AvatarImage src={documentToView?.creatorAvatar} alt={documentToView?.createdByName} data-ai-hint="user avatar small" />
                                    <AvatarFallback className="text-xs">{getInitials(documentToView?.createdByName)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-muted-foreground">By: {documentToView?.createdByName}</span>
                                <span className="mx-1.5 text-muted-foreground">|</span>
                                </>
                            )}
                            <span className="text-sm text-muted-foreground">Type: </span><Badge variant="outline" className="capitalize text-xs">{documentToView?.fileType}</Badge>
                            <span className="mx-1.5 text-muted-foreground">|</span>
                            <span className="text-sm text-muted-foreground">Last updated: {documentToView ? new Date(documentToView.updatedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto pr-2 mt-2">
                    {documentToView?.fileType === 'markdown' && (
                        <div className="prose dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{documentToView?.content || ''}</ReactMarkdown>
                        </div>
                    )}
                    {(documentToView?.fileType === 'txt' || documentToView?.fileType === 'html') && (
                         <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">{documentToView?.content || 'No content.'}</pre>
                    )}
                    {documentToView?.fileType === 'pdf' && (
                        <div className="text-center p-6">
                            <ExternalLink className="h-10 w-10 mx-auto text-primary mb-3" />
                            <p>This is a PDF document named: <strong>{documentToView?.filePath || documentToView?.title}</strong>.</p>
                            <Button asChild className="mt-3">
                                <a href={documentToView?.filePath || "#"} target="_blank" rel="noopener noreferrer" download={documentToView?.filePath || documentToView?.title}>
                                    Download/Open PDF (Simulated)
                                </a>
                            </Button>
                             <p className="text-xs text-muted-foreground mt-2">(Actual file download/storage not implemented in this prototype)</p>
                        </div>
                    )}
                    {documentToView?.fileType === 'other' && (
                         <p className="text-muted-foreground">Cannot display this file type directly. File name: {documentToView?.filePath || documentToView?.title}</p>
                    )}
                </div>
                <DialogFooter className="mt-4">
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <TabsContent value="announcements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Announcements ({projectAnnouncements.length})</CardTitle>
              {canManageAnnouncements && (
                <Dialog open={isCreateAnnouncementDialogOpen} onOpenChange={(isOpen) => { setIsCreateAnnouncementDialogOpen(isOpen); if (!isOpen) projectAnnouncementForm.reset(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/> New Announcement</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Project Announcement</DialogTitle>
                    </DialogHeader>
                    <Form {...projectAnnouncementForm}>
                      <form onSubmit={projectAnnouncementForm.handleSubmit(handleCreateProjectAnnouncementSubmit)} className="space-y-4">
                        <FormField
                          control={projectAnnouncementForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g., Sprint Review Next Week" /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectAnnouncementForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content (Markdown supported)</FormLabel>
                              <FormControl><Textarea {...field} rows={6} placeholder="Details about the announcement..." /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {createAnnouncementState?.error && !createAnnouncementState.fieldErrors && <p className="text-sm text-destructive">{createAnnouncementState.error}</p>}
                        <DialogFooter>
                          <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreateAnnouncementPending}>Cancel</Button></DialogClose>
                          <Button type="submit" disabled={isCreateAnnouncementPending}>
                            {isCreateAnnouncementPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Announcement
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {projectAnnouncements.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="mx-auto h-12 w-12 mb-4" />
                  <p>No announcements for this project yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {projectAnnouncements.map((ann) => (
                    <Card key={ann.uuid} className="shadow-sm">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{ann.title}</CardTitle>
                          { (canManageAnnouncements || user?.uuid === ann.authorUuid) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" title="Delete Announcement" onClick={() => setAnnouncementToDelete(ann)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                              </AlertDialogTrigger>
                              {announcementToDelete?.uuid === ann.uuid && (
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Announcement: "{announcementToDelete.title}"?</AlertDialogTitle>
                                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setAnnouncementToDelete(null)}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteAnnouncementConfirm} disabled={isDeleteAnnouncementPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                          {isDeleteAnnouncementPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                              )}
                            </AlertDialog>
                          )}
                        </div>
                        <CardDescription className="text-xs flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={ann.authorAvatar} alt={ann.authorName} data-ai-hint="user avatar small" />
                            <AvatarFallback className="text-xs">{getInitials(ann.authorName)}</AvatarFallback>
                          </Avatar>
                          By {ann.authorName || 'Unknown User'} on {new Date(ann.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{ann.content}</ReactMarkdown>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="codespace" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><FolderGit2 className="mr-2 h-5 w-5 text-primary"/>CodeSpace & GitHub</CardTitle>
              <CardDescription>Manage your project's code by linking it to a GitHub repository via the FlowUp GitHub App.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!project.githubRepoUrl ? (
                <>
                  <div className="p-4 border-dashed border-2 rounded-md text-center">
                    <Github className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-1">Link this project to GitHub</h3>
                     {!userGithubAccess?.installationId ? (
                        <>
                        <p className="text-sm text-muted-foreground mb-4">
                            To link this project, you first need to install and authorize the FlowUp GitHub App on your GitHub account or organization.
                        </p>
                         <Button onClick={handleLinkOrInstallGithub} disabled={!canManageCodeSpace || isLinkGithubPending}>
                            {isLinkGithubPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Settings2 className="mr-2 h-4 w-4" /> Install/Authorize FlowUp GitHub App
                        </Button>
                        </>
                     ) : (
                        <>
                        <p className="text-sm text-muted-foreground mb-4">
                            The FlowUp GitHub App is installed on {userGithubAccess.accountLogin ? `the '${userGithubAccess.accountLogin}' account/org` : 'your account'}.
                            Click below to create a new GitHub repository for this FlowUp project and link them.
                        </p>
                        <Button onClick={handleLinkOrInstallGithub} disabled={!canManageCodeSpace || isLinkGithubPending}>
                            {isLinkGithubPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Github className="mr-2 h-4 w-4" /> Create and Link Repository
                        </Button>
                        </>
                     )}
                    {linkGithubState?.error && <p className="text-sm text-destructive mt-2">{linkGithubState.error}</p>}
                     {userGithubAccess?.error && !userGithubAccess.installationId && <p className="text-sm text-destructive mt-2">{userGithubAccess.error}</p>}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 border rounded-md bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold">Project Linked to GitHub!</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This project is linked to the following GitHub repository (Installation ID: {project.githubInstallationId || userGithubAccess?.installationId || 'N/A'}):
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <Github className="h-4 w-4" />
                        <a
                        href={project.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-primary hover:underline break-all"
                        >
                        {project.githubRepoUrl}
                        </a>
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                     <p className="text-sm text-muted-foreground mt-1">Repository Name: <span className="font-medium">{project.githubRepoName}</span></p>
                  </div>

                  <Button variant="outline" disabled>
                    <BookOpen className="mr-2 h-4 w-4" /> Synchronise README with GitHub (Soon)
                  </Button>
                  <div className="text-center py-8 text-muted-foreground border-dashed border-2 rounded-md">
                    <Code2 className="mx-auto h-10 w-10 mb-3" />
                    <p className="font-medium">File Browser & Editor Coming Soon</p>
                    <p className="text-xs">You'll soon be able to browse, view, and edit your repository files here.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Team & Project Settings</CardTitle>
                {canManageProjectSettings && (
                    <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" onClick={() => inviteForm.reset()}><Users className="mr-2 h-4 w-4"/>Invite Members</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Invite New Member</DialogTitle>
                                <DialogDescription>Enter the email of the user you want to invite and assign them a role.</DialogDescription>
                            </DialogHeader>
                            <Form {...inviteForm}>
                                <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                                    <FormField
                                        control={inviteForm.control}
                                        name="emailToInvite"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>User Email</FormLabel>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <FormControl>
                                                        <Input placeholder="user@example.com" {...field} className="pl-10" />
                                                    </FormControl>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={inviteForm.control}
                                        name="roleToInvite"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Role</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a role" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {memberRoles.map(role => (
                                                            <SelectItem key={role} value={role} className="capitalize">{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {inviteFormState?.fieldErrors?.projectUuid && <p className="text-sm text-destructive">{inviteFormState.fieldErrors.projectUuid.join(', ')}</p>}
                                    {inviteFormState?.error && !inviteFormState.fieldErrors && <p className="text-sm text-destructive">{inviteFormState.error}</p>}
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="ghost" disabled={isInvitePending}>Cancel</Button></DialogClose>
                                        <Button type="submit" disabled={isInvitePending}>
                                            {isInvitePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Send Invitation
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 text-lg">Current Members ({projectMembers.length})</h4>
                 {projectMembers.length > 0 ? (
                    <div className="space-y-3">
                        {projectMembers.map(member => (
                            <Card key={member.userUuid} className="p-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={member.user?.avatar} alt={member.user?.name} data-ai-hint="user avatar"/>
                                            <AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{member.user?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-muted-foreground">{member.user?.email || 'No email'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="capitalize">{member.role}</Badge>
                                        {canManageProjectSettings && member.role !== 'owner' && (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Remove User">
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you want to remove {member.user?.name || 'this user'} from the project?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <Button variant="destructive" onClick={() => handleRemoveMember(member.userUuid)}>Remove</Button>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground">No members in this project yet (besides the owner).</p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-lg">Project Attributes</h4>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <Label htmlFor="project-urgency" className="flex flex-col">
                        <span>Mark as Urgent</span>
                        <span className="text-xs font-normal text-muted-foreground">Highlights the project across the platform.</span>
                    </Label>
                    <Switch
                        id="project-urgency"
                        checked={project?.isUrgent || false}
                        onCheckedChange={handleToggleUrgency}
                        disabled={!canManageProjectSettings || isToggleUrgencyPending}
                    />
                </div>
                {toggleUrgencyState?.error && <p className="text-sm text-destructive">{toggleUrgencyState.error}</p>}

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                     <Label htmlFor="project-visibility" className="flex flex-col">
                        <span>Private Project</span>
                        <span className="text-xs font-normal text-muted-foreground">If unchecked, project becomes public. Only owners/admins can change project visibility.</span>
                    </Label>
                    <Switch
                        id="project-visibility"
                        checked={project?.isPrivate === undefined ? true : project.isPrivate}
                        onCheckedChange={handleToggleVisibility}
                        disabled={!isAdminOrOwner || isToggleVisibilityPending}
                    />
                </div>
                 {toggleVisibilityState?.error && <p className="text-sm text-destructive">{toggleVisibilityState.error}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-lg">Project Tags</h4>
                    {canManageProjectSettings && (
                        <Dialog open={isAddProjectTagDialogOpen} onOpenChange={setIsAddProjectTagDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" onClick={() => projectTagForm.reset({ tagName: '', tagColor: '#6B7280' })}><TagIcon className="mr-2 h-4 w-4"/>Add Project Tag</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Project Tag</DialogTitle>
                                    <DialogDescription>Create a new tag with a specific color for this project.</DialogDescription>
                                </DialogHeader>
                                <Form {...projectTagForm}>
                                    <form onSubmit={projectTagForm.handleSubmit(handleCreateProjectTagSubmit)} className="space-y-4">
                                        <FormField
                                            control={projectTagForm.control}
                                            name="tagName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tag Name</FormLabel>
                                                    <FormControl><Input {...field} placeholder="e.g., Backend" /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={projectTagForm.control}
                                            name="tagColor"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Tag Color</FormLabel>
                                                    <div className="flex items-center gap-2">
                                                        <FormControl><Input type="color" {...field} className="p-1 h-10 w-14 block" /></FormControl>
                                                        <Input type="text" {...field} placeholder="#RRGGBB" className="max-w-[120px]"
                                                          onChange={(e) => {
                                                            field.onChange(e);
                                                            const colorInput = e.target.previousElementSibling as HTMLInputElement;
                                                            if (colorInput && /^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                                                              colorInput.value = e.target.value;
                                                            }
                                                          }}
                                                        />
                                                        <div className="w-8 h-8 rounded border" style={{ backgroundColor: field.value }}></div>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        {createProjectTagState?.error && <p className="text-sm text-destructive">{createProjectTagState.error}</p>}
                                        <DialogFooter>
                                            <DialogClose asChild><Button variant="ghost" disabled={isCreateProjectTagPending}>Cancel</Button></DialogClose>
                                            <Button type="submit" disabled={isCreateProjectTagPending}>
                                                {isCreateProjectTagPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add Tag
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                 <Card className="border p-4 rounded-md ">
                    {projectTags.length === 0 && <p className="text-muted-foreground text-center py-2">No custom tags defined for this project yet.</p>}
                    <div className="flex flex-wrap gap-2">
                        {projectTags.map(tag => (
                            <Badge key={tag.uuid} style={{ backgroundColor: tag.color, color: '#fff' }} className="text-sm px-3 py-1">
                                {tag.name}
                            </Badge>
                        ))}
                    </div>
                 </Card>
              </div>
               {currentUserRole === 'owner' && (
                <div>
                    <h4 className="font-semibold mb-2 text-lg text-destructive">Danger Zone</h4>
                    <div className="border border-destructive p-4 rounded-md ">
                        <p className="text-destructive">Deleting a project is permanent and cannot be undone.</p>
                        <Button variant="destructive" className="mt-3" size="sm" disabled><Trash2 className="mr-2 h-4 w-4"/>Delete Project</Button>
                    </div>
                </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <ProjectDetailPageContent />
    </Suspense>
  )
}
