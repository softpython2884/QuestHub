
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit3, Trash2, ListChecks, Pin, PinOff, Loader2 } from 'lucide-react';
import type { Project, Task, Tag as TagType, ProjectMember, TaskStatus, ProjectMemberRole, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback, startTransition as ReactStartTransition, useRef } from 'react';
import { useActionState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  createTaskAction,
  type CreateTaskFormState,
  fetchTasksAction,
  updateTaskStatusAction,
  type UpdateTaskStatusFormState,
  updateTaskAction,
  type UpdateTaskFormState,
  deleteTaskAction,
  type DeleteTaskFormState,
  toggleTaskPinAction,
  type ToggleTaskPinState,
  fetchProjectTagsAction,
  fetchProjectMembersAction,
} from './actions';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
const UNASSIGNED_VALUE = "__UNASSIGNED__";

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(taskStatuses),
  assigneeUuid: z.string().optional(),
  tagsString: z.string().optional().describe("Comma-separated tag names"),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

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

interface ProjectTasksPageProps {
  project: Project;
  currentUserRole: ProjectMemberRole | null;
  projectUuid: string;
  user: User;
}

export default function ProjectTasksPage({ project, currentUserRole, projectUuid, user }: ProjectTasksPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTags, setProjectTags] = useState<TagType[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

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

  const loadProjectMembers = useCallback(async () => {
    if (projectUuid) {
        try {
            const members = await fetchProjectMembersAction(projectUuid);
            setProjectMembers(members);
        } catch (error) {
            console.error("Failed to load project members", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load project members." });
        }
    }
  }, [projectUuid, toast]);

  useEffect(() => {
    if (projectUuid) {
      loadTasks();
      loadProjectTagsData();
      loadProjectMembers();
    }
  }, [projectUuid, loadTasks, loadProjectTagsData, loadProjectMembers]);

  useEffect(() => {
    if (!isCreateTaskPending && createTaskState) {
      if (createTaskState.message && !createTaskState.error) {
        toast({ title: "Success", description: createTaskState.message });
        setIsCreateTaskDialogOpen(false);
        taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: ''});
        loadTasks();
      }
      if (createTaskState.error) {
        toast({ variant: "destructive", title: "Task Creation Error", description: createTaskState.error });
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
        toast({ variant: "destructive", title: "Task Update Error", description: updateTaskState.error });
        lastSubmitSourceRef.current = null;
        return;
    }
    if (updateTaskState.message && !updateTaskState.error && updateTaskState.updatedTask) {
        toast({ title: "Success", description: updateTaskState.message });
        loadTasks();
        if (lastSubmitSourceRef.current === 'subtasks' && taskToManageSubtasks?.uuid === updateTaskState.updatedTask.uuid) {
             setIsManageSubtasksDialogOpen(false);
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
      });
    }
  }, [isEditTaskDialogOpen, taskToEdit, taskForm]);

  useEffect(() => {
    if (isManageSubtasksDialogOpen && taskToManageSubtasks) {
      setSubtaskInput(convertMarkdownToSubtaskInput(taskToManageSubtasks.todoListMarkdown));
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

  const openEditTaskDialog = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskDialogOpen(true);
  };

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
        const filtered = projectTags.filter(tag => tag.name.toLowerCase().startsWith(lowerFragment) && !currentTagsInInput.slice(0, -1).includes(tag.name.toLowerCase())).slice(0, 5);
        setTagSuggestions(filtered);
        setShowTagSuggestions(filtered.length > 0);
        if (fragment !== lastTypedFragmentRef.current) setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = fragment;
    } else {
        setTagSuggestions([]);
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = "";
    }
  };

  const handleTagSuggestionClick = ( suggestion: TagType, fieldApi: any ) => {
    const currentFieldValue = fieldApi.value || "";
    const parts = currentFieldValue.split(',');
    parts[parts.length - 1] = suggestion.name;
    let newValue = parts.join(',');
    if (!newValue.endsWith(', ')) newValue += ', ';
    fieldApi.onChange(newValue);
    setTagSuggestions([]);
    setShowTagSuggestions(false);
    setActiveSuggestionIndex(-1);
    lastTypedFragmentRef.current = "";
    setTimeout(() => tagInputRef.current?.focus(), 0);
  };

  const handleTagInputKeyDown = ( event: React.KeyboardEvent<HTMLInputElement>, fieldApi: any ) => {
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
        handleTagSuggestionClick(tagSuggestions[activeSuggestionIndex], fieldApi);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = "";
      }
    } else if (event.key === 'Escape') {
        setShowTagSuggestions(false);
        setActiveSuggestionIndex(-1);
        lastTypedFragmentRef.current = "";
    }
  };

  if (!project) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project data...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Tasks ({tasks.length})</CardTitle>
         <Dialog open={isCreateTaskDialogOpen} onOpenChange={(isOpen) => { setIsCreateTaskDialogOpen(isOpen); if (!isOpen) { setTagSuggestions([]); setShowTagSuggestions(false); setActiveTagInputName(null); setActiveSuggestionIndex(-1);} }}>
          <DialogTrigger asChild>
              <Button size="sm" disabled={!canCreateUpdateDeleteTasks} onClick={() => taskForm.reset({ title: '', description: '', status: 'To Do', assigneeUuid: UNASSIGNED_VALUE, tagsString: '' })}>
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
                      <FormField control={taskForm.control} name="assigneeUuid" render={({ field }) => ( <FormItem> <FormLabel>Assign To</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value || UNASSIGNED_VALUE}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem> {projectMembers.map(member => ( <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
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
      <Dialog open={isEditTaskDialogOpen} onOpenChange={(isOpen) => { setIsEditTaskDialogOpen(isOpen); if (!isOpen) { setTaskToEdit(null); setTagSuggestions([]); setShowTagSuggestions(false); setActiveTagInputName(null); setActiveSuggestionIndex(-1); } }}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader><DialogTitle>Edit Task: {taskToEdit?.title}</DialogTitle><DialogDescription>Update task details.</DialogDescription></DialogHeader>
                {taskToEdit && ( <Form {...taskForm}> <form onSubmit={taskForm.handleSubmit(handleEditTaskSubmit)} className="space-y-4">
                            <FormField control={taskForm.control} name="title" render={({ field }) => ( <FormItem> <FormLabel>Title</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="description" render={({ field }) => ( <FormItem> <FormLabel>Description</FormLabel> <FormControl><Textarea {...field} rows={3} /></FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="status" render={({ field }) => ( <FormItem> <FormLabel>Status</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
                            <FormField control={taskForm.control} name="assigneeUuid" render={({ field }) => ( <FormItem> <FormLabel>Assign To</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value || UNASSIGNED_VALUE}> <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl> <SelectContent> <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem> {projectMembers.map(member => ( <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem> ))} </SelectContent> </Select> <FormMessage /> </FormItem> )}/>
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
  );
}
