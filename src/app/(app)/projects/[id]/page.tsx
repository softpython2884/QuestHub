
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit3, Trash2, ListChecks, Pin, PinOff, Loader2, FolderKanban, BookOpen, Megaphone, FolderGit2, Settings as SettingsIcon, Users, Mail, UserX, Tag as TagIcon, Palette, FileText, ExternalLink, AlertTriangle as AlertTriangleIcon } from 'lucide-react';
import type { Project, Task, Tag as TagType, ProjectMember, TaskStatus, ProjectMemberRole, User, Document as ProjectDocumentType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback, startTransition as ReactStartTransition, useRef, useActionState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  createTaskAction, type CreateTaskFormState,
  fetchTasksAction,
  updateTaskStatusAction, type UpdateTaskStatusFormState,
  updateTaskAction, type UpdateTaskFormState,
  deleteTaskAction, type DeleteTaskFormState,
  toggleTaskPinAction, type ToggleTaskPinState,
  fetchProjectTagsAction, createProjectTagAction, type CreateProjectTagFormState,
  fetchProjectMembersAction, removeUserFromProjectAction, inviteUserToProjectAction, type InviteUserFormState,
  saveProjectReadmeAction, type SaveProjectReadmeFormState,
  toggleProjectUrgencyAction, type ToggleProjectUrgencyFormState,
  toggleProjectVisibilityAction, type ToggleProjectVisibilityFormState,
  fetchDocumentsAction, deleteDocumentAction as deleteDbDocumentAction, type DeleteDocumentFormState,
} from './actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, useFormField } from '@/components/ui/form';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { MarkdownTaskListRenderer } from '@/components/MarkdownTaskListRenderer';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

// Mock data - replace with actual data fetching and state management
const projectAnnouncements: any[] = [];


// Props passed from ProjectDetailLayout
interface ProjectPageProps {
  project: Project;
  currentUserRole: ProjectMemberRole | null;
  user: User;
  projectUuid: string;
}

export const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Done', 'Archived'];
const UNASSIGNED_VALUE = "__UNASSIGNED__";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(taskStatuses),
  assigneeUuid: z.string().optional(),
  tagsString: z.string().optional().describe("Comma-separated tag names"),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

const memberRoles: Exclude<ProjectMemberRole, 'owner'>[] = ['co-owner', 'editor', 'viewer'];
const inviteUserFormSchema = z.object({
  emailToInvite: z.string().email({ message: "Please enter a valid email address." }),
  roleToInvite: z.enum(memberRoles, { errorMap: () => ({ message: "Please select a role."}) }),
});
type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

const projectTagFormSchema = z.object({
  tagName: z.string().min(1, "Tag name is required.").max(50, "Tag name too long."),
  tagColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format. Must be #RRGGBB."),
});
type ProjectTagFormValues = z.infer<typeof projectTagFormSchema>;


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


export default function ProjectDetailPage({ project: initialProject, currentUserRole, user, projectUuid }: ProjectPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [project, setProject] = useState<Project>(initialProject);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'tasks');

  // States for Tasks Tab
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTagsForTasks, setProjectTagsForTasks] = useState<TagType[]>([]); // Renamed to avoid conflict
  const [projectMembersForTasks, setProjectMembersForTasks] = useState<ProjectMember[]>([]); // Renamed
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToManageSubtasks, setTaskToManageSubtasks] = useState<Task | null>(null);
  const [isManageSubtasksDialogOpen, setIsManageSubtasksDialogOpen] = useState(false);
  const [subtaskInput, setSubtaskInput] = useState('');
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const lastSubmitSourceRef = useRef<'subtasks' | 'main' | null>(null);
  const [tagSuggestions, setTagSuggestions] = useState<TagType[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [activeTagInputName, setActiveTagInputName] = useState<"tagsString" | null>(null);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const lastTypedFragmentRef = useRef<string>("");

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: ''},
  });

  const [createTaskState, createTaskFormAction, isCreateTaskPending] = useActionState(createTaskAction, { message: "", error: "" });
  const [updateTaskStatusState, performUpdateTaskStatusAction, isUpdateTaskStatusPending] = useActionState(updateTaskStatusAction, { message: "", error: "" });
  const [updateTaskState, updateTaskFormAction, isUpdateTaskPending] = useActionState(updateTaskAction, { message: "", error: "" });
  const [deleteTaskState, deleteTaskFormAction, isDeleteTaskPending] = useActionState(deleteTaskAction, { message: "", error: ""});
  const [toggleTaskPinState, toggleTaskPinFormAction, isToggleTaskPinPending] = useActionState(toggleTaskPinAction, { message: "", error: "" });


  // States for README Tab
  const [projectReadmeContent, setProjectReadmeContent] = useState('');
  const [saveReadmeState, saveReadmeFormAction, isSaveReadmePending] = useActionState(saveProjectReadmeAction, { message: "", error: "" });

  // States for Documents Tab
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocumentType[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [documentToView, setDocumentToView] = useState<ProjectDocumentType | null>(null);
  const [isViewDocumentDialogOpen, setIsViewDocumentDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<ProjectDocumentType | null>(null);
  const [deleteDocumentState, deleteDocumentFormAction, isDeleteDocumentPending] = useActionState(deleteDbDocumentAction, { message: "", error: "" });


  // States for Settings & Team Tab
  const [projectMembersForSettings, setProjectMembersForSettings] = useState<ProjectMember[]>([]); // Renamed
  const [projectTagsForSettings, setProjectTagsForSettings] = useState<TagType[]>([]); // Renamed
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);
  const [isAddProjectTagDialogOpen, setIsAddProjectTagDialogOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(user?.role === 'admin');

  const inviteForm = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: { emailToInvite: '', roleToInvite: 'viewer' },
  });
  const projectTagForm = useForm<ProjectTagFormValues>({
    resolver: zodResolver(projectTagFormSchema),
    defaultValues: { tagName: '', tagColor: '#6B7280' },
  });

  const [inviteFormState, inviteUserFormAction, isInvitePending] = useActionState(inviteUserToProjectAction, { message: "", error: "" });
  const [toggleUrgencyState, toggleUrgencyFormAction, isToggleUrgencyPending] = useActionState(toggleProjectUrgencyAction, { message: "", error: "" });
  const [toggleVisibilityState, toggleVisibilityFormAction, isToggleVisibilityPending] = useActionState(toggleProjectVisibilityAction, { message: "", error: "" });
  const [createProjectTagState, createProjectTagFormAction, isCreateProjectTagPending] = useActionState(createProjectTagAction, { message: "", error: "" });


  // --- EFFECT to update project state when initialProject prop changes ---
  useEffect(() => {
    setProject(initialProject);
    if (initialProject) {
      setProjectReadmeContent(initialProject.readmeContent || '');
    }
  }, [initialProject]);


  // --- EFFECTS & CALLBACKS for TASKS ---
  const loadTasks = useCallback(async () => {
    if (projectUuid) {
      try {
        const fetchedTasks = await fetchTasksAction(projectUuid);
        setTasks(fetchedTasks || []);
      } catch (error) {
        console.error("Failed to load tasks:", error); setTasks([]);
        toast({ variant: "destructive", title: "Error", description: "Could not load tasks." });
      }
    }
  }, [projectUuid, toast]);

  const loadProjectTagsDataForTasks = useCallback(async () => {
    if (projectUuid) {
      try {
        const tags = await fetchProjectTagsAction(projectUuid);
        setProjectTagsForTasks(tags);
      } catch (error) {
        console.error("Failed to load project tags for tasks:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load project tags." });
      }
    }
  }, [projectUuid, toast]);

  const loadProjectMembersForTasks = useCallback(async () => {
    if (projectUuid) {
      try {
        const members = await fetchProjectMembersAction(projectUuid);
        setProjectMembersForTasks(members);
      } catch (error) {
        console.error("Failed to load project members for tasks", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load project members." });
      }
    }
  }, [projectUuid, toast]);

  useEffect(() => {
    if (activeTab === 'tasks' && projectUuid) {
      loadTasks();
      loadProjectTagsDataForTasks();
      loadProjectMembersForTasks();
    }
  }, [activeTab, projectUuid, loadTasks, loadProjectTagsDataForTasks, loadProjectMembersForTasks]);

  // Task action state effects (create, update, delete, pin)
  useEffect(() => {
    if (!isCreateTaskPending && createTaskState) {
      if (createTaskState.message && !createTaskState.error) {
        toast({ title: "Success", description: createTaskState.message });
        setIsCreateTaskDialogOpen(false);
        taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: ''});
        loadTasks();
      }
      if (createTaskState.error) toast({ variant: "destructive", title: "Task Creation Error", description: createTaskState.error });
      if(createTaskState.fieldErrors) Object.entries(createTaskState.fieldErrors).forEach(([field, errors]) => {
        if (errors && errors.length > 0) taskForm.setError(field as keyof TaskFormValues, { type: 'server', message: errors[0] });
      });
    }
  }, [createTaskState, isCreateTaskPending, toast, loadTasks, taskForm]);

  useEffect(() => {
    if (!isUpdateTaskStatusPending && updateTaskStatusState) {
        if (updateTaskStatusState.message && !updateTaskStatusState.error) { toast({ title: "Success", description: updateTaskStatusState.message }); loadTasks(); }
        if (updateTaskStatusState.error) toast({ variant: "destructive", title: "Status Update Error", description: updateTaskStatusState.error });
    }
  }, [updateTaskStatusState, isUpdateTaskStatusPending, toast, loadTasks]);

  useEffect(() => {
    if (isUpdateTaskPending || !updateTaskState) return;
    if (updateTaskState.error && !isUpdateTaskPending) {
        toast({ variant: "destructive", title: "Task Update Error", description: updateTaskState.error });
        lastSubmitSourceRef.current = null;
        if(updateTaskState.fieldErrors) Object.entries(updateTaskState.fieldErrors).forEach(([field, errors]) => {
          if (errors && errors.length > 0) taskForm.setError(field as keyof TaskFormValues, { type: 'server', message: errors[0] });
        });
        return;
    }
    if (updateTaskState.message && !updateTaskState.error && updateTaskState.updatedTask) {
        toast({ title: "Success", description: updateTaskState.message });
        loadTasks();
        if (lastSubmitSourceRef.current === 'subtasks' && taskToManageSubtasks?.uuid === updateTaskState.updatedTask.uuid) setIsManageSubtasksDialogOpen(false);
        else if (lastSubmitSourceRef.current === 'main' && taskToEdit?.uuid === updateTaskState.updatedTask.uuid) { setIsEditTaskDialogOpen(false); setTaskToEdit(null); }
        lastSubmitSourceRef.current = null;
    }
  }, [updateTaskState, isUpdateTaskPending, toast, loadTasks, taskToManageSubtasks, taskToEdit, taskForm]);

  useEffect(() => {
    if (isEditTaskDialogOpen && taskToEdit) {
      taskForm.reset({
        title: taskToEdit.title, description: taskToEdit.description || '', status: taskToEdit.status,
        assigneeUuid: taskToEdit.assigneeUuid || UNASSIGNED_VALUE, tagsString: taskToEdit.tags.map(t => t.name).join(', ') || '',
      });
    } else {
      taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: ''});
    }
  }, [isEditTaskDialogOpen, taskToEdit, taskForm]);

  useEffect(() => {
    if (isManageSubtasksDialogOpen && taskToManageSubtasks) setSubtaskInput(convertMarkdownToSubtaskInput(taskToManageSubtasks.todoListMarkdown));
  }, [isManageSubtasksDialogOpen, taskToManageSubtasks]);

  useEffect(() => {
    if (!isDeleteTaskPending && deleteTaskState) {
        if (deleteTaskState.message && !deleteTaskState.error) { toast({ title: "Success", description: deleteTaskState.message }); setTaskToDelete(null); loadTasks(); }
        if (deleteTaskState.error) toast({ variant: "destructive", title: "Task Deletion Error", description: deleteTaskState.error });
    }
  }, [deleteTaskState, isDeleteTaskPending, toast, loadTasks]);

  useEffect(() => {
    if (!isToggleTaskPinPending && toggleTaskPinState) {
        if (toggleTaskPinState.message && !toggleTaskPinState.error) { toast({ title: "Success", description: toggleTaskPinState.message }); loadTasks(); }
        if (toggleTaskPinState.error) toast({ variant: "destructive", title: "Pin Error", description: toggleTaskPinState.error });
    }
  }, [toggleTaskPinState, isToggleTaskPinPending, toast, loadTasks]);

  const canCreateUpdateDeleteTasks = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';
  const canEditTaskStatus = !!currentUserRole;

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
    formData.append('todoListMarkdown', '');
    ReactStartTransition(() => { createTaskFormAction(formData); });
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
    formData.append('todoListMarkdown', taskToEdit.todoListMarkdown || '');
    formData.append('status', values.status);
    formData.append('assigneeUuid', finalAssigneeUuid || '');
    if (values.tagsString) formData.append('tagsString', values.tagsString);
    ReactStartTransition(() => { updateTaskFormAction(formData); });
  };
  
  const openManageSubtasksDialog = (task: Task) => { setTaskToManageSubtasks(task); setIsManageSubtasksDialogOpen(true); };
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
    ReactStartTransition(() => { updateTaskFormAction(formData); });
  };

  const handleTodoListChangeOnCard = (taskUuid: string, newTodoListMarkdown: string) => {
    if (!project) return;
    const taskToUpdate = tasks.find(t => t.uuid === taskUuid);
    if (!taskToUpdate) return;
    if (debounceTimers.current[taskUuid]) clearTimeout(debounceTimers.current[taskUuid]);
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
      ReactStartTransition(() => { updateTaskFormAction(formData); });
    }, 750);
  };

  const openEditTaskDialog = (task: Task) => { setTaskToEdit(task); taskForm.clearErrors(); setIsEditTaskDialogOpen(true); };
  const handleDeleteTaskConfirm = () => {
    if (!taskToDelete || !project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskToDelete.uuid);
    formData.append('projectUuid', project.uuid);
    ReactStartTransition(() => { deleteTaskFormAction(formData); });
  };
  const handleTaskStatusChange = (taskUuid: string, newStatus: TaskStatus) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskUuid);
    formData.append('projectUuid', project.uuid);
    formData.append('status', newStatus as string);
    ReactStartTransition(() => { performUpdateTaskStatusAction(formData); });
  };
  const handleToggleTaskPin = (taskUuid: string, currentPinStatus: boolean) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskUuid);
    formData.append('projectUuid', project.uuid);
    formData.append('isPinned', String(!currentPinStatus));
    ReactStartTransition(() => { toggleTaskPinFormAction(formData); });
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
    const grouped: Record<TaskStatus, Task[]> = { 'To Do': [], 'In Progress': [], 'Done': [], 'Archived': [] };
    tasks.forEach(task => { grouped[task.status] ? grouped[task.status].push(task) : grouped['Archived'].push(task); });
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

  const getCurrentTagFragment = (value: string): string => value.split(',').pop()?.trimStart() || "";
  const handleTagsStringInputChange = ( event: React.ChangeEvent<HTMLInputElement>, fieldApi: any ) => {
    const inputValue = event.currentTarget.value;
    fieldApi.onChange(inputValue);
    const fragment = getCurrentTagFragment(inputValue);
    setActiveTagInputName(fieldApi.name as "tagsString");
    if (fragment) {
        const lowerFragment = fragment.toLowerCase();
        const currentTagsInInput = inputValue.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
        const sourceTags = activeTab === 'tasks' ? projectTagsForTasks : projectTagsForSettings;
        const filtered = sourceTags.filter(tag => tag.name.toLowerCase().startsWith(lowerFragment) && !currentTagsInInput.slice(0, -1).includes(tag.name.toLowerCase())).slice(0, 5);
        setTagSuggestions(filtered);
        setShowTagSuggestions(filtered.length > 0);
        if (fragment !== lastTypedFragmentRef.current) setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = fragment;
    } else {
        setTagSuggestions([]); setShowTagSuggestions(false); setActiveSuggestionIndex(-1); lastTypedFragmentRef.current = "";
    }
  };
  const handleTagSuggestionClick = ( suggestion: TagType, fieldApi: any ) => {
    const currentFieldValue = fieldApi.value || "";
    const parts = currentFieldValue.split(',');
    parts[parts.length - 1] = suggestion.name;
    let newValue = parts.join(',');
    if (!newValue.endsWith(', ')) newValue += ', ';
    fieldApi.onChange(newValue);
    setTagSuggestions([]); setShowTagSuggestions(false); setActiveSuggestionIndex(-1); lastTypedFragmentRef.current = "";
    setTimeout(() => tagInputRef.current?.focus(), 0);
  };
  const handleTagInputKeyDown = ( event: React.KeyboardEvent<HTMLInputElement>, fieldApi: any ) => {
    if (showTagSuggestions && tagSuggestions.length > 0) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveSuggestionIndex(prev => Math.min(prev + 1, tagSuggestions.length - 1)); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveSuggestionIndex(prev => Math.max(prev - 1, 0)); }
      else if ((event.key === 'Enter' || event.key === 'Tab') && activeSuggestionIndex >= 0 && activeSuggestionIndex < tagSuggestions.length) {
        event.preventDefault(); event.stopPropagation(); handleTagSuggestionClick(tagSuggestions[activeSuggestionIndex], fieldApi);
      } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShowTagSuggestions(false); setActiveSuggestionIndex(-1); lastTypedFragmentRef.current = ""; }
    } else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setShowTagSuggestions(false); setActiveSuggestionIndex(-1); lastTypedFragmentRef.current = ""; }
  };

  // --- EFFECTS & CALLBACKS for README ---
  useEffect(() => {
    if (!isSaveReadmePending && saveReadmeState) {
        if (saveReadmeState.message && !saveReadmeState.error) {
            toast({ title: "Success", description: saveReadmeState.message });
            if(saveReadmeState.project) {
                setProject(saveReadmeState.project); // Update local project state
                setProjectReadmeContent(saveReadmeState.project.readmeContent || '');
            }
        }
        if (saveReadmeState.error) toast({ variant: "destructive", title: "README Error", description: saveReadmeState.error });
    }
  }, [saveReadmeState, isSaveReadmePending, toast]);
  const handleSaveReadme = () => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('readmeContent', projectReadmeContent);
    ReactStartTransition(() => { saveReadmeFormAction(formData); });
  };
  const canEditReadme = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';


  // --- EFFECTS & CALLBACKS for DOCUMENTS ---
  const loadProjectDocuments = useCallback(async () => {
    if (projectUuid && activeTab === 'documents') {
      setIsLoadingDocuments(true);
      try {
        const docs = await fetchDocumentsAction(projectUuid);
        setProjectDocuments(docs || []);
      } catch (error) {
        console.error("Failed to load documents:", error); setProjectDocuments([]);
        toast({ variant: "destructive", title: "Error", description: "Could not load documents." });
      } finally {
        setIsLoadingDocuments(false);
      }
    }
  }, [projectUuid, activeTab, toast]);

  useEffect(() => { loadProjectDocuments(); }, [loadProjectDocuments]);

  useEffect(() => {
    if (!isDeleteDocumentPending && deleteDocumentState) {
        if (deleteDocumentState.message && !deleteDocumentState.error) {
            toast({ title: "Success", description: deleteDocumentState.message });
            setDocumentToDelete(null); loadProjectDocuments();
        }
        if (deleteDocumentState.error) toast({ variant: "destructive", title: "Document Deletion Error", description: deleteDocumentState.error });
    }
  }, [deleteDocumentState, isDeleteDocumentPending, toast, loadProjectDocuments]);

  const openViewDocumentDialog = (doc: ProjectDocumentType) => { setDocumentToView(doc); setIsViewDocumentDialogOpen(true); };
  const handleDeleteDocumentConfirm = () => {
    if (!documentToDelete || !project) return;
    const formData = new FormData();
    formData.append('documentUuid', documentToDelete.uuid);
    formData.append('projectUuid', project.uuid);
    ReactStartTransition(() => { deleteDocumentFormAction(formData); });
  };
  const canManageDocuments = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';


  // --- EFFECTS & CALLBACKS for SETTINGS & TEAM ---
  const loadProjectMembersForSettings = useCallback(async () => {
    if (projectUuid && activeTab === 'settings') {
      try {
        const members = await fetchProjectMembersAction(projectUuid);
        setProjectMembersForSettings(members);
      } catch (error) { console.error("Failed to load project members", error); toast({ variant: "destructive", title: "Error", description: "Could not load project members." });}
    }
  }, [projectUuid, activeTab, toast]);

  const loadProjectTagsDataForSettings = useCallback(async () => {
    if (projectUuid && activeTab === 'settings') {
      try {
        const tags = await fetchProjectTagsAction(projectUuid);
        setProjectTagsForSettings(tags);
      } catch (error) { console.error("Failed to load project tags:", error); toast({ variant: "destructive", title: "Error", description: "Could not load project tags." });}
    }
  }, [projectUuid, activeTab, toast]);

  useEffect(() => {
    if (activeTab === 'settings' && projectUuid && user) {
      loadProjectMembersForSettings();
      loadProjectTagsDataForSettings();
    }
  }, [activeTab, projectUuid, user, loadProjectMembersForSettings, loadProjectTagsDataForSettings]);

  useEffect(() => {
    if (!isInvitePending && inviteFormState) {
        if (inviteFormState.message && !inviteFormState.error) {
            toast({ title: "Success", description: inviteFormState.message });
            setIsInviteUserDialogOpen(false); inviteForm.reset(); loadProjectMembersForSettings();
        }
        if (inviteFormState.error) toast({ variant: "destructive", title: "Invitation Error", description: inviteFormState.error });
    }
  }, [inviteFormState, isInvitePending, toast, loadProjectMembersForSettings, inviteForm]);

  useEffect(() => {
    if (!isToggleUrgencyPending && toggleUrgencyState) {
        if (toggleUrgencyState.message && !toggleUrgencyState.error) {
            toast({ title: "Success", description: toggleUrgencyState.message });
            if(toggleUrgencyState.project) setProject(toggleUrgencyState.project);
        }
        if (toggleUrgencyState.error) toast({ variant: "destructive", title: "Urgency Error", description: toggleUrgencyState.error });
    }
  }, [toggleUrgencyState, isToggleUrgencyPending, toast]);

  useEffect(() => {
    if (!isToggleVisibilityPending && toggleVisibilityState) {
        if (toggleVisibilityState.message && !toggleVisibilityState.error) {
            toast({ title: "Success", description: toggleVisibilityState.message });
            if(toggleVisibilityState.project) setProject(toggleVisibilityState.project);
        }
        if (toggleVisibilityState.error) toast({ variant: "destructive", title: "Visibility Error", description: toggleVisibilityState.error });
    }
  }, [toggleVisibilityState, isToggleVisibilityPending, toast]);

  useEffect(() => {
    if (!isCreateProjectTagPending && createProjectTagState) {
      if (createProjectTagState.message && !createProjectTagState.error) {
        toast({ title: "Success", description: createProjectTagState.message });
        setIsAddProjectTagDialogOpen(false); projectTagForm.reset({ tagName: '', tagColor: '#6B7280' }); loadProjectTagsDataForSettings();
      }
      if (createProjectTagState.error) toast({ variant: "destructive", title: "Tag Creation Error", description: createProjectTagState.error });
    }
  }, [createProjectTagState, isCreateProjectTagPending, toast, projectTagForm, loadProjectTagsDataForSettings]);

  const canManageProjectSettings = currentUserRole === 'owner' || currentUserRole === 'co-owner';
  const isProjectOwner = currentUserRole === 'owner';

  const handleInviteSubmit = async (values: InviteUserFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('emailToInvite', values.emailToInvite);
    formData.append('roleToInvite', values.roleToInvite);
    ReactStartTransition(() => { inviteUserFormAction(formData); });
  };
  const handleRemoveMember = async (memberUuidToRemove: string) => {
    if (!project) return;
    ReactStartTransition(async () => {
      const result = await removeUserFromProjectAction(project.uuid, memberUuidToRemove);
      if (result.success) { toast({ title: "Success", description: result.message }); loadProjectMembersForSettings(); }
      else { toast({ variant: "destructive", title: "Error", description: result.error }); }
    });
  };
  const handleToggleUrgency = (checked: boolean) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('isUrgent', String(checked));
    ReactStartTransition(() => { toggleUrgencyFormAction(formData); });
  };
  const handleToggleVisibility = (checked: boolean) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('isPrivate', String(checked));
    ReactStartTransition(() => { toggleVisibilityFormAction(formData); });
  };
  const handleCreateProjectTagSubmit = async (values: ProjectTagFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('tagName', values.tagName);
    formData.append('tagColor', values.tagColor);
    ReactStartTransition(() => { createProjectTagFormAction(formData); });
  };
  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) initials += names[names.length - 1].substring(0, 1).toUpperCase();
    return initials;
  };


  const onTabChange = (newTab: string) => {
    setActiveTab(newTab);
    router.push(`/projects/${projectUuid}?tab=${newTab}`, { scroll: false });
  };

  if (!project) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project data...</div>;
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="tasks"><FolderKanban className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Tasks</TabsTrigger>
          <TabsTrigger value="readme"><BookOpen className="mr-1 h-4 w-4 hidden sm:inline-flex"/>README</TabsTrigger>
          <TabsTrigger value="documents"><BookOpen className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Documents</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Announcements</TabsTrigger>
          <TabsTrigger value="codespace"><FolderGit2 className="mr-1 h-4 w-4 hidden sm:inline-flex"/>CodeSpace</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Settings & Team</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Tasks ({tasks.length})</CardTitle>
              <Dialog open={isCreateTaskDialogOpen} onOpenChange={(isOpen) => { setIsCreateTaskDialogOpen(isOpen); if (!isOpen) { setTagSuggestions([]); setShowTagSuggestions(false); setActiveTagInputName(null); setActiveSuggestionIndex(-1); taskForm.clearErrors(); taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '' });} }}>
                <DialogTrigger asChild>
                    <Button size="sm" disabled={!canCreateUpdateDeleteTasks} onClick={() => { taskForm.clearErrors(); taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '' }); }}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Task
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader><DialogTitle>Create New Task</DialogTitle><DialogDescription>Fill in the details for the new task.</DialogDescription></DialogHeader>
                    <Form {...taskForm}>
                        <form onSubmit={taskForm.handleSubmit(handleCreateTaskSubmit)} className="space-y-4">
                            <FormField control={taskForm.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="assigneeUuid" render={({ field }) => ( <FormItem> <FormLabel>Assign To</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value || UNASSIGNED_VALUE}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem> {projectMembersForTasks.map(member => ( <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            <Controller control={taskForm.control} name="tagsString" render={({ field }) => (
                              <FormItem> <FormLabel>Tags</FormLabel>
                                  <Popover open={showTagSuggestions && activeTagInputName === 'tagsString'} onOpenChange={(open) => { if(!open && document.activeElement !== tagInputRef.current) { setShowTagSuggestions(false); }}}>
                                    <PopoverAnchor><FormControl>
                                      <Input {...field} ref={tagInputRef} placeholder="e.g. frontend, bug"
                                          onFocus={() => {setActiveTagInputName('tagsString'); if(getCurrentTagFragment(field.value || "")) handleTagsStringInputChange({currentTarget: {value: field.value || ''}} as any, field);}}
                                          onChange={(e) => handleTagsStringInputChange(e, field)}
                                          onKeyDown={(e) => handleTagInputKeyDown(e, field)}
                                          onBlur={() => setTimeout(() => { if (document.activeElement !== tagInputRef.current && !document.querySelector('[data-radix-popper-content-wrapper]:hover')) setShowTagSuggestions(false);}, 150)} />
                                    </FormControl></PopoverAnchor>
                                    {showTagSuggestions && tagSuggestions.length > 0 && (
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                      <Command shouldFilter={false}><CommandList><CommandEmpty>No tags found.</CommandEmpty><CommandGroup>
                                          {tagSuggestions.map((suggestion, index) => (
                                          <CommandItem key={suggestion.uuid} value={suggestion.name} onSelect={() => handleTagSuggestionClick(suggestion, field)} className={cn("cursor-pointer", index === activeSuggestionIndex && "bg-accent text-accent-foreground")}>
                                              {suggestion.name}
                                          </CommandItem>))}
                                      </CommandGroup></CommandList></Command>
                                    </PopoverContent>)}
                                  </Popover><FormMessage />
                              </FormItem>)}/>
                            <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isCreateTaskPending}> {isCreateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Task </Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? ( <p className="text-muted-foreground text-center py-4">No tasks yet.</p> ) : (
                Object.entries(tasksByStatus).map(([status, statusTasks]) => (
                  statusTasks.length > 0 && (
                    <div key={status} className="mb-6">
                      <h3 className="text-lg font-semibold mb-2 capitalize border-b pb-1">{status} ({statusTasks.length})</h3>
                      <div className="space-y-3">
                        {statusTasks.map(task => (
                          <Card key={task.uuid} className={cn("p-3 border-l-4", getTaskBorderColor(task.status as TaskStatus), task.isPinned && "bg-primary/5")}>
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2"> {task.isPinned && <Pin className="h-4 w-4 text-primary shrink-0" />} <h4 className="font-semibold break-words">{task.title}</h4> </div>
                                {task.description && <div className="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted-foreground"><ReactMarkdown remarkPlugins={[remarkGfm]}>{task.description}</ReactMarkdown></div>}
                                <div className="mt-2 pt-2 border-t border-dashed">
                                  {task.todoListMarkdown && task.todoListMarkdown.trim() !== '' ? (
                                      <><h5 className="text-xs font-semibold text-muted-foreground mb-1">Sub-tasks:</h5><MarkdownTaskListRenderer content={task.todoListMarkdown} onContentChange={(newMd) => handleTodoListChangeOnCard(task.uuid, newMd)} disabled={!canCreateUpdateDeleteTasks}/></>
                                    ) : ( <p className="text-xs text-muted-foreground"> No sub-tasks. {canCreateUpdateDeleteTasks && <Button variant="link" size="sm" className="h-auto p-0 ml-1 text-xs" onClick={() => openManageSubtasksDialog(task)}>Add</Button>} </p> )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Assigned: {task.assigneeName || (task.assigneeUuid ? 'Unknown' : 'Everyone')}</p>
                                <div className="mt-2 flex flex-wrap gap-1"> {task.tags.map(tag => (<Badge key={tag.uuid} style={{ backgroundColor: tag.color}} className="text-white text-xs">{tag.name}</Badge>))} </div>
                              </div>
                              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0">
                                <Select value={task.status} disabled={!canEditTaskStatus || isUpdateTaskStatusPending} onValueChange={(newStatus) => handleTaskStatusChange(task.uuid, newStatus as TaskStatus)}>
                                  <SelectTrigger className="w-full sm:w-[150px] text-xs h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>{taskStatuses.map(sVal => (<SelectItem key={sVal} value={sVal} className="text-xs">{sVal}</SelectItem>))}</SelectContent>
                                </Select>
                                {canCreateUpdateDeleteTasks && (
                                    <div className="flex mt-1 sm:mt-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Sub-tasks" onClick={() => openManageSubtasksDialog(task)}><ListChecks className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title={task.isPinned ? "Unpin" : "Pin"} onClick={() => handleToggleTaskPin(task.uuid, task.isPinned || false)} disabled={isToggleTaskPinPending && taskToEdit?.uuid === task.uuid}> {isToggleTaskPinPending && taskToEdit?.uuid === task.uuid ? <Loader2 className="h-4 w-4 animate-spin"/> : task.isPinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />} </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTaskDialog(task)}><Edit3 className="h-4 w-4" /></Button>
                                        <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setTaskToDelete(task)}><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                            {taskToDelete?.uuid === task.uuid && (<AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete task "{taskToDelete.title}"?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTaskConfirm} disabled={isDeleteTaskPending}>{isDeleteTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>)}
                                        </AlertDialog>
                                    </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
            <Dialog open={isEditTaskDialogOpen} onOpenChange={(isOpen) => { setIsEditTaskDialogOpen(isOpen); if (!isOpen) { setTaskToEdit(null); setTagSuggestions([]); setShowTagSuggestions(false); setActiveTagInputName(null); setActiveSuggestionIndex(-1); taskForm.clearErrors(); taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '' });} }}>
                  <DialogContent className="sm:max-w-[525px]">
                      <DialogHeader><DialogTitle>Edit Task: {taskToEdit?.title}</DialogTitle><DialogDescription>Update task details.</DialogDescription></DialogHeader>
                      {taskToEdit && ( <Form {...taskForm}> <form onSubmit={taskForm.handleSubmit(handleEditTaskSubmit)} className="space-y-4">
                                  <FormField control={taskForm.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                                  <FormField control={taskForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
                                  <FormField control={taskForm.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                  <FormField control={taskForm.control} name="assigneeUuid" render={({ field }) => ( <FormItem> <FormLabel>Assign To</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value || UNASSIGNED_VALUE}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem> {projectMembersForTasks.map(member => ( <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                                  <Controller control={taskForm.control} name="tagsString" render={({ field }) => (
                                      <FormItem> <FormLabel>Tags</FormLabel>
                                          <Popover open={showTagSuggestions && activeTagInputName === 'tagsString'} onOpenChange={(open) => { if(!open && document.activeElement !== tagInputRef.current) setShowTagSuggestions(false); }}>
                                            <PopoverAnchor><FormControl>
                                              <Input {...field} ref={tagInputRef} placeholder="e.g. frontend, bug"
                                                  onFocus={() => {setActiveTagInputName('tagsString'); if(getCurrentTagFragment(field.value || "")) handleTagsStringInputChange({currentTarget: {value: field.value || ''}} as any, field);}}
                                                  onChange={(e) => handleTagsStringInputChange(e, field)}
                                                  onKeyDown={(e) => handleTagInputKeyDown(e, field)}
                                                  onBlur={() => setTimeout(() => { if (document.activeElement !== tagInputRef.current && !document.querySelector('[data-radix-popper-content-wrapper]:hover')) setShowTagSuggestions(false);}, 150)} />
                                            </FormControl></PopoverAnchor>
                                            {showTagSuggestions && tagSuggestions.length > 0 && (
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                                              <Command shouldFilter={false}><CommandList><CommandEmpty>No tags found.</CommandEmpty><CommandGroup>
                                                  {tagSuggestions.map((suggestion, index) => (
                                                  <CommandItem key={suggestion.uuid} value={suggestion.name} onSelect={() => handleTagSuggestionClick(suggestion, field)} className={cn("cursor-pointer", index === activeSuggestionIndex && "bg-accent text-accent-foreground")}>
                                                      {suggestion.name}
                                                  </CommandItem>))}
                                              </CommandGroup></CommandList></Command>
                                            </PopoverContent>)}
                                          </Popover><FormMessage />
                                      </FormItem>)}/>
                                  <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isUpdateTaskPending}> {isUpdateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes </Button></DialogFooter>
                      </form></Form>)}
                  </DialogContent>
            </Dialog>
            <Dialog open={isManageSubtasksDialogOpen} onOpenChange={(isOpen) => { setIsManageSubtasksDialogOpen(isOpen); if(!isOpen) setTaskToManageSubtasks(null); }}>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader><DialogTitle>Sub-tasks for: {taskToManageSubtasks?.title}</DialogTitle><DialogDescription>Enter one per line. `* item` for open, `** item` for completed.</DialogDescription></DialogHeader>
                    <Textarea placeholder="* Sub-task 1..." value={subtaskInput} onChange={(e) => setSubtaskInput(e.target.value)} rows={8} className="font-mono text-sm"/>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="button" onClick={handleSaveSubtasks} disabled={isUpdateTaskPending}>{isUpdateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Sub-tasks</Button></DialogFooter>
                  </DialogContent>
            </Dialog>
          </Card>
        </TabsContent>

        <TabsContent value="readme" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div><CardTitle>Project README</CardTitle><CardDescription>Overview, setup instructions, or other important project information. Supports Markdown.</CardDescription></div>
              <Button onClick={handleSaveReadme} disabled={isSaveReadmePending || !canEditReadme}>{isSaveReadmePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save README</Button>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none p-4 border rounded-md mb-4 min-h-[100px] bg-background/30">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{projectReadmeContent || ''}</ReactMarkdown>
              </div>
              <Textarea placeholder="Write your project README here using Markdown..." value={projectReadmeContent} onChange={(e) => setProjectReadmeContent(e.target.value)} rows={20} className="font-mono" disabled={!canEditReadme}/>
              {saveReadmeState?.error && <p className="text-sm text-destructive mt-2">{saveReadmeState.error}</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
           <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Documents ({projectDocuments.length})</CardTitle>
              {canManageDocuments && (<Button size="sm" asChild><Link href={`/projects/${projectUuid}/documents/new`}><PlusCircle className="mr-2 h-4 w-4"/> Add Document</Link></Button>)}
            </CardHeader>
            <CardContent>
              {isLoadingDocuments ? (<div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
              ) : projectDocuments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 mb-4" /> <p>No documents in this project yet.</p>
                    {canManageDocuments && <Button size="sm" className="mt-4" asChild><Link href={`/projects/${projectUuid}/documents/new`}><PlusCircle className="mr-2 h-4 w-4"/> Add your first document</Link></Button>}
                </div>
              ) : (
                <div className="space-y-3">
                  {projectDocuments.map(doc => (
                    <Card key={doc.uuid} className="p-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                            <h4 className="font-semibold cursor-pointer hover:underline" onClick={() => openViewDocumentDialog(doc)}>{doc.title}</h4>
                            <Badge variant="outline" className="text-xs capitalize">{doc.fileType}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Created: {new Date(doc.createdAt).toLocaleDateString()} | Updated: {new Date(doc.updatedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0 self-end sm:self-center">
                          {canManageDocuments && (doc.fileType === 'markdown') && (<Button variant="ghost" size="icon" className="h-8 w-8" title="Edit Document" asChild><Link href={`/projects/${projectUuid}/documents/${doc.uuid}/edit`}><Edit3 className="h-4 w-4" /></Link></Button>)}
                          {canManageDocuments && (
                            <AlertDialog><AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete Document" onClick={() => setDocumentToDelete(doc)}><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            {documentToDelete?.uuid === doc.uuid && (
                            <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete Document: "{documentToDelete.title}"?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel onClick={() => setDocumentToDelete(null)}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteDocumentConfirm} disabled={isDeleteDocumentPending}>{isDeleteDocumentPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>)}</AlertDialog>
                          )}
                          <Button variant="outline" size="sm" className="h-8 px-3" onClick={() => openViewDocumentDialog(doc)}>View</Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Dialog open={isViewDocumentDialogOpen} onOpenChange={setIsViewDocumentDialogOpen}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{documentToView?.title}</DialogTitle>
                    <DialogDescription>Type: <Badge variant="outline" className="capitalize text-xs">{documentToView?.fileType}</Badge> | Last updated: {documentToView ? new Date(documentToView.updatedAt).toLocaleString() : 'N/A'}</DialogDescription>
                </DialogHeader>
                <div className="flex-grow overflow-y-auto pr-2">
                    {documentToView?.fileType === 'markdown' && (<div className="prose dark:prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{documentToView?.content || ''}</ReactMarkdown></div>)}
                    {(documentToView?.fileType === 'txt' || documentToView?.fileType === 'html') && (<pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">{documentToView?.content || 'No content.'}</pre>)}
                    {documentToView?.fileType === 'pdf' && (
                        <div className="text-center p-6">
                            <ExternalLink className="h-10 w-10 mx-auto text-primary mb-3" /> <p>This is a PDF document named: <strong>{documentToView?.filePath || documentToView?.title}</strong>.</p>
                            <Button asChild className="mt-3"><a href={documentToView?.filePath || "#"} target="_blank" rel="noopener noreferrer" download={documentToView?.filePath || documentToView?.title}>Download/Open PDF (Simulated)</a></Button>
                            <p className="text-xs text-muted-foreground mt-2">(Actual file download/storage not implemented in this prototype)</p>
                        </div>
                    )}
                    {documentToView?.fileType === 'other' && (<p className="text-muted-foreground">Cannot display this file type directly. File name: {documentToView?.filePath || documentToView?.title}</p>)}
                </div>
                <DialogFooter><DialogClose asChild><Button variant="outline">Close</Button></DialogClose></DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Project Announcements ({projectAnnouncements.length})</CardTitle>
              {(currentUserRole === 'owner' || currentUserRole === 'co-owner') && ( <Button size="sm" onClick={() => { /* TODO: Open create announcement dialog */ }}><PlusCircle className="mr-2 h-4 w-4"/> New Project Announcement</Button>)}
            </CardHeader>
            <CardContent>
              {projectAnnouncements.length > 0 ? projectAnnouncements.map((ann: any) => (
                <Card key={ann.uuid} className="p-3 mb-3">
                  <h4 className="font-semibold">{ann.title}</h4> <p className="text-sm text-muted-foreground">{ann.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">By: {ann.authorUuid} on {new Date(ann.createdAt).toLocaleDateString()}</p>
                </Card>
              )) : ( <div className="text-center py-12 text-muted-foreground"><Megaphone className="mx-auto h-12 w-12 mb-4" /><p>No announcements for this project yet.</p></div> )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codespace" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><FolderGit2 className="mr-2 h-5 w-5 text-primary"/>CodeSpace for {project?.name}</CardTitle><CardDescription>Manage your project's code snippets, scripts, and version control links.</CardDescription></CardHeader>
            <CardContent><div className="text-center py-12 text-muted-foreground"><Code2 className="mx-auto h-12 w-12 mb-4" /><h3 className="text-lg font-medium">CodeSpace is Coming Soon!</h3><p className="mt-1 text-sm">This area will allow you to link to repositories, manage small scripts, and keep track of code-related assets for your project.</p></div></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle>Team & Project Settings for {project?.name}</CardTitle>
                {canManageProjectSettings && (
                    <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
                        <DialogTrigger asChild><Button size="sm" onClick={() => inviteForm.reset()}><Users className="mr-2 h-4 w-4"/>Invite Members</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader><DialogTitle>Invite New Member</DialogTitle><DialogDescription>Enter email and assign a role.</DialogDescription></DialogHeader>
                            <Form {...inviteForm}>
                                <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className="space-y-4">
                                    <FormField control={inviteForm.control} name="emailToInvite" render={({ field }) => ( <FormItem><FormLabel>User Email</FormLabel><div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input placeholder="user@example.com" {...field} className="pl-10" /></FormControl></div><FormMessage /></FormItem> )}/>
                                    <FormField control={inviteForm.control} name="roleToInvite" render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{memberRoles.map(role => (<SelectItem key={role} value={role} className="capitalize">{role.charAt(0).toUpperCase() + role.slice(1)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )}/>
                                    {inviteFormState?.error && <p className="text-sm text-destructive">{inviteFormState.error}</p>}
                                    <DialogFooter><DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isInvitePending}>{isInvitePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send Invitation</Button></DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              <div>
                <h4 className="font-semibold mb-3 text-lg">Current Members ({projectMembersForSettings.length})</h4>
                {projectMembersForSettings.length > 0 ? (
                    <div className="space-y-3">
                        {projectMembersForSettings.map(member => (
                            <Card key={member.userUuid} className="p-3">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10"><AvatarImage src={member.user?.avatar} alt={member.user?.name} data-ai-hint="user avatar"/><AvatarFallback>{getInitials(member.user?.name)}</AvatarFallback></Avatar>
                                        <div><p className="font-medium">{member.user?.name || 'Unknown'}</p><p className="text-xs text-muted-foreground">{member.user?.email || 'No email'}</p></div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                        <Badge variant={member.role === 'owner' ? 'default' : 'secondary'} className="capitalize">{member.role}</Badge>
                                        {canManageProjectSettings && member.role !== 'owner' && (
                                            <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Remove User"><UserX className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove {member.user?.name}?</AlertDialogTitle><AlertDialogDescription>This will remove their access to the project.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant="destructive" onClick={() => handleRemoveMember(member.userUuid)}>Remove</Button></AlertDialogFooter></AlertDialogContent>
                                            </AlertDialog>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : ( <p className="text-muted-foreground">No members (besides owner).</p> )}
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Project Attributes</h4>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <Label htmlFor="project-urgency" className="flex flex-col"><span className="font-medium">Mark as Urgent</span><span className="text-xs font-normal text-muted-foreground">Highlights the project.</span></Label>
                    <Switch id="project-urgency" checked={project?.isUrgent || false} onCheckedChange={handleToggleUrgency} disabled={!canManageProjectSettings || isToggleUrgencyPending}/>
                </div>
                {toggleUrgencyState?.error && <p className="text-sm text-destructive">{toggleUrgencyState.error}</p>}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <Label htmlFor="project-visibility" className="flex flex-col"><span className="font-medium">Private Project</span><span className="text-xs font-normal text-muted-foreground">Only owners/admins can change visibility.</span></Label>
                    <Switch id="project-visibility" checked={project?.isPrivate === undefined ? true : project.isPrivate} onCheckedChange={handleToggleVisibility} disabled={!isProjectOwner && !isAdminUser || isToggleVisibilityPending}/>
                </div>
                {toggleVisibilityState?.error && <p className="text-sm text-destructive">{toggleVisibilityState.error}</p>}
              </div>
              <div>
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-lg">Project Tags Management</h4>
                    {canManageProjectSettings && (
                        <Dialog open={isAddProjectTagDialogOpen} onOpenChange={setIsAddProjectTagDialogOpen}>
                            <DialogTrigger asChild><Button size="sm" onClick={() => projectTagForm.reset({ tagName: '', tagColor: '#6B7280' })}><TagIcon className="mr-2 h-4 w-4"/>Add Project Tag</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add New Project Tag</DialogTitle><DialogDescription>Create a custom tag for this project.</DialogDescription></DialogHeader>
                                <Form {...projectTagForm}>
                                    <form onSubmit={projectTagForm.handleSubmit(handleCreateProjectTagSubmit)} className="space-y-4">
                                        <FormField control={projectTagForm.control} name="tagName" render={({ field }) => ( <FormItem><FormLabel>Tag Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}/>
                                        <FormField control={projectTagForm.control} name="tagColor" render={({ field }) => ( <FormItem><FormLabel>Tag Color</FormLabel><div className="flex items-center gap-2"><FormControl><Input type="color" {...field} className="p-1 h-10 w-14 block" /></FormControl><Input type="text" {...field} placeholder="#RRGGBB" className="max-w-[120px]"/><div className="w-8 h-8 rounded border" style={{ backgroundColor: field.value }}></div></div><FormMessage /></FormItem> )}/>
                                        {createProjectTagState?.error && <p className="text-sm text-destructive">{createProjectTagState.error}</p>}
                                        <DialogFooter><DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose><Button type="submit" disabled={isCreateProjectTagPending}>{isCreateProjectTagPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Add Tag</Button></DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
                <Card className="border p-4 rounded-md">
                    {projectTagsForSettings.length === 0 && <p className="text-muted-foreground text-center py-2">No custom tags defined.</p>}
                    <div className="flex flex-wrap gap-2">
                        {projectTagsForSettings.map(tag => ( <Badge key={tag.uuid} style={{ backgroundColor: tag.color, color: '#fff' }} className="text-sm px-3 py-1">{tag.name}</Badge> ))}
                    </div>
                </Card>
              </div>
              {isProjectOwner && (
                <div>
                    <h4 className="font-semibold mb-2 text-lg text-destructive">Danger Zone</h4>
                    <div className="border border-destructive p-4 rounded-md "><p className="text-destructive">Deleting a project is permanent.</p><Button variant="destructive" className="mt-3" size="sm" disabled><Trash2 className="mr-2 h-4 w-4"/>Delete Project</Button></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
