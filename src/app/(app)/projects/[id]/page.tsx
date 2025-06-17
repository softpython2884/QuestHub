
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Edit3, PlusCircle, Trash2, CheckSquare, FileText, Megaphone, Users, FolderGit2, Loader2, UploadCloud, Mail, UserX } from 'lucide-react';
import Link from 'next/link';
import type { Project, Task, Document as ProjectDocumentType, Announcement, Tag as TagType, ProjectMember, ProjectMemberRole, TaskStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { flagApiKeyRisks } from '@/ai/flows/flag-api-key-risks';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback, useActionState as useActionStateReact } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { 
  fetchProjectAction, 
  fetchProjectOwnerNameAction, 
  updateProjectAction, 
  inviteUserToProjectAction, 
  fetchProjectMembersAction, 
  removeUserFromProjectAction, 
  type InviteUserFormState,
  createTaskAction,
  type CreateTaskFormState,
  fetchTasksAction,
  updateTaskStatusAction,
  type UpdateTaskStatusFormState,
} from './actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';


const mockDocuments: ProjectDocumentType[] = [
    { id: 'doc-mock-1', uuid: 'doc-uuid-mock-1', title: 'Project Proposal V1.pdf', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', content: 'Initial project proposal details...', tags: [], createdAt: '2023-01-01', updatedAt: '2023-01-01'},
];
const mockAnnouncements: Announcement[] = [
    { id: 'ann-mock-1', uuid: 'ann-uuid-mock-1', title: 'Project Kick-off Meeting', content: 'Team, our kick-off meeting is scheduled for next Monday at 10 AM.', authorUuid: 'user-uuid-1', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', isGlobal: false, createdAt: '2023-01-02', updatedAt: '2023-01-02' },
];
const mockTags: TagType[] = [{uuid: 'tag-uuid-high-mock', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', name: 'High Priority', color: 'bg-red-500'}];

export const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Done', 'Archived'];
const memberRoles: Exclude<ProjectMemberRole, 'owner'>[] = ['co-owner', 'editor', 'viewer'];


const editProjectFormSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }).max(100),
  description: z.string().max(500, {message: "Description cannot exceed 500 characters."}).optional().or(z.literal('')),
});
type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;

const inviteUserFormSchema = z.object({
  emailToInvite: z.string().email({ message: "Please enter a valid email address." }),
  roleToInvite: z.enum(memberRoles, { errorMap: () => ({ message: "Please select a role."}) }),
});
type InviteUserFormValues = z.infer<typeof inviteUserFormSchema>;

const createTaskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
  status: z.enum(taskStatuses),
  assigneeUuid: z.string().optional(), // Can be empty for "unassigned"
});
type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;


export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectUuid = params.id as string;

  const { user, isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwnerName, setProjectOwnerName] = useState<string | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectMemberRole | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteUserDialogOpen, setIsInviteUserDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);

  const [newDocContent, setNewDocContent] = useState('');
  const [apiKeyRisk, setApiKeyRisk] = useState<string | null>(null);
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptContentValue, setNewScriptContent] = useState('');


  const editForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const inviteForm = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserFormSchema),
    defaultValues: { emailToInvite: '', roleToInvite: 'viewer' },
  });
  
  const createTaskForm = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: { title: '', description: '', status: 'To Do', assigneeUuid: ''},
  });

  const [updateFormState, updateProjectFormAction, isUpdatePending] = useActionStateReact(updateProjectAction, { message: "", errors: {} });
  const [inviteFormState, inviteUserFormAction, isInvitePending] = useActionStateReact(inviteUserToProjectAction, { message: "", error: "" });
  const [createTaskState, createTaskFormAction, isCreateTaskPending] = useActionStateReact(createTaskAction, { message: "", error: "" });
  // updateTaskStatusAction doesn't need a form state like others because it's triggered by a select change directly, not a full form submission
  // We'll handle its toast notifications directly in the handler.


  const loadProjectMembers = useCallback(async () => {
    if (projectUuid && user) {
        try {
            const members = await fetchProjectMembersAction(projectUuid);
            setProjectMembers(members);
            const member = members.find(m => m.userUuid === user.uuid);
            setCurrentUserRole(member?.role || null);
        } catch (error) {
            console.error("Failed to load project members", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load project members." });
        }
    }
  }, [projectUuid, user, toast]);

  const loadTasks = useCallback(async () => {
    if (projectUuid) {
      try {
        const fetchedTasks = await fetchTasksAction(projectUuid);
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("Failed to load tasks:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load tasks." });
      }
    }
  }, [projectUuid, toast]);


  const loadProjectData = useCallback(async () => {
    if (projectUuid && user) {
      setIsLoadingData(true);
      try {
        const projectData = await fetchProjectAction(projectUuid);
        setProject(projectData);
        if (projectData) {
          editForm.reset({ name: projectData.name, description: projectData.description || '' });
          if (projectData.ownerUuid) {
              const ownerName = await fetchProjectOwnerNameAction(projectData.ownerUuid);
              setProjectOwnerName(ownerName);
          }
          await loadProjectMembers(); 
          await loadTasks();
        }
      } catch (err) {
        console.error("Error fetching project on client:", err);
        setProject(null);
        toast({variant: "destructive", title: "Error", description: "Could not load project details."})
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authLoading && !user) {
        router.push('/login');
    }
  }, [projectUuid, user, authLoading, router, toast, editForm, loadProjectMembers, loadTasks]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  useEffect(() => {
    if (updateFormState.message && !updateFormState.error && !isUpdatePending) {
      toast({ title: "Success", description: updateFormState.message });
      setIsEditDialogOpen(false);
      loadProjectData(); // Reload all project data
    }
    if (updateFormState.error && !isUpdatePending) {
      toast({ variant: "destructive", title: "Error", description: updateFormState.error });
    }
  }, [updateFormState, toast, loadProjectData, isUpdatePending]);

  useEffect(() => {
    if (!isInvitePending) {
        if (inviteFormState.message && !inviteFormState.error) {
            toast({ title: "Success", description: inviteFormState.message });
            setIsInviteUserDialogOpen(false);
            inviteForm.reset();
            loadProjectMembers(); 
        }
        if (inviteFormState.error) {
            toast({ variant: "destructive", title: "Invitation Error", description: inviteFormState.error });
        }
    }
  }, [inviteFormState, toast, loadProjectMembers, isInvitePending, inviteForm]);

  useEffect(() => {
    if (!isCreateTaskPending) {
      if (createTaskState.message && !createTaskState.error) {
        toast({ title: "Success", description: createTaskState.message });
        setIsCreateTaskDialogOpen(false);
        createTaskForm.reset();
        loadTasks(); // Reload tasks
      }
      if (createTaskState.error) {
        toast({ variant: "destructive", title: "Task Creation Error", description: createTaskState.error });
      }
    }
  }, [createTaskState, toast, loadTasks, isCreateTaskPending, createTaskForm]);


  const handleContentChange = async (content: string) => {
    setNewDocContent(content);
    if(content.trim().length > 10) {
      try {
        const riskResult = await flagApiKeyRisks({ text: content });
        if (riskResult.flagged) {
          setApiKeyRisk(riskResult.reason || "Potential API key or secret detected. Remember to use the Secure Vault for sensitive information.");
           toast({
            variant: "destructive",
            title: "Security Alert",
            description: riskResult.reason || "Potential API key or secret detected in the content. Please use the Secure Vault.",
          });
        } else {
          setApiKeyRisk(null);
        }
      } catch (error) {
        console.error("Error flagging API key risks:", error);
      }
    } else {
      setApiKeyRisk(null);
    }
  };

  const isOwner = user?.uuid === project?.ownerUuid;
  const canManageProjectSettings = isOwner || currentUserRole === 'co-owner';
  const canCreateTasks = isOwner || currentUserRole === 'co-owner' || currentUserRole === 'editor';
  const canEditTaskStatus = !!currentUserRole; // Any member can edit status

  const handleEditSubmit = async (values: EditProjectFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('description', values.description || '');
    formData.append('projectUuid', project.uuid); 
    updateProjectFormAction(formData);
  };

  const handleInviteSubmit = async (values: InviteUserFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('emailToInvite', values.emailToInvite);
    formData.append('roleToInvite', values.roleToInvite);
    inviteUserFormAction(formData);
  };

  const handleCreateTaskSubmit = async (values: CreateTaskFormValues) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('title', values.title);
    formData.append('description', values.description || '');
    formData.append('status', values.status);
    if (values.assigneeUuid) {
      formData.append('assigneeUuid', values.assigneeUuid);
    }
    createTaskFormAction(formData);
  };

  const handleTaskStatusChange = async (taskUuid: string, newStatus: TaskStatus) => {
    if (!project) return;
    const formData = new FormData();
    formData.append('taskUuid', taskUuid);
    formData.append('projectUuid', project.uuid); // Pass projectUuid for permission check
    formData.append('status', newStatus);
    
    // Directly call the server action, not using useActionState for this one
    const result = await updateTaskStatusAction({} as UpdateTaskStatusFormState, formData); // Pass empty initial state

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else if (result.message) {
      toast({ title: 'Success', description: result.message });
      loadTasks(); // Refresh task list
    }
  };


  const handleRemoveMember = async (memberUuidToRemove: string) => {
    if (!project) return;
    const result = await removeUserFromProjectAction(project.uuid, memberUuidToRemove);
    if (result.success) {
        toast({ title: "Success", description: result.message });
        loadProjectMembers();
    } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
    }
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

  if (!project) {
    return (
        <div className="space-y-6 text-center">
             <Button variant="outline" onClick={() => router.back()} className="mb-4 mr-auto block">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Button>
            <FolderKanban className="mx-auto h-16 w-16 text-muted-foreground mt-12" />
            <h2 className="text-2xl font-semibold mt-4">Project Not Found</h2>
            <p className="text-muted-foreground">The project (ID: {projectUuid}) could not be found or you may not have permission to view it.</p>
        </div>
    );
  }

  const projectDocuments = mockDocuments;
  const projectAnnouncements = mockAnnouncements;
  const projectTags = mockTags;


  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-3xl font-headline">{project.name}</CardTitle>
              <CardDescription className="mt-1">{project.description || "No description provided."}</CardDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                {projectTags.map(tag => (
                  <Badge key={tag.uuid} style={{ backgroundColor: tag.color }} className="text-white">{tag.name}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!canManageProjectSettings} onClick={() => editForm.reset({ name: project.name, description: project.description || '' })}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update the name and description of your project.</DialogDescription>
                  </DialogHeader>
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                      <FormField
                        control={editForm.control}
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
                        control={editForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Project Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       {updateFormState.errors?.name && <p className="text-sm text-destructive">{Array.isArray(updateFormState.errors.name) ? updateFormState.errors.name.join(', ') : updateFormState.errors.name}</p>}
                       {updateFormState.errors?.description && <p className="text-sm text-destructive">{Array.isArray(updateFormState.errors.description) ? updateFormState.errors.description.join(', ') : updateFormState.errors.description}</p>}
                       {updateFormState.error && !updateFormState.errors && <p className="text-sm text-destructive">{updateFormState.error}</p>}
                      <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="ghost">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isUpdatePending}>
                          {isUpdatePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              <Button variant="destructive" size="sm" disabled={!isOwner}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
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

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="tasks"><CheckSquare className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4"/>Documents</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4"/>Announcements</TabsTrigger>
          <TabsTrigger value="repository"><FolderGit2 className="mr-2 h-4 w-4"/>Repository</TabsTrigger>
          <TabsTrigger value="settings"><Users className="mr-2 h-4 w-4"/>Team & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Tasks ({tasks.length})</CardTitle>
               <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" disabled={!canCreateTasks} onClick={() => createTaskForm.reset()}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Task
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Task</DialogTitle>
                        <DialogDescription>Fill in the details for the new task.</DialogDescription>
                    </DialogHeader>
                    <Form {...createTaskForm}>
                        <form onSubmit={createTaskForm.handleSubmit(handleCreateTaskSubmit)} className="space-y-4">
                            <FormField
                                control={createTaskForm.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createTaskForm.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl><Textarea {...field} rows={3} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createTaskForm.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={createTaskForm.control}
                                name="assigneeUuid"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign To (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select assignee" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="">Unassigned / Everyone</SelectItem>
                                                {projectMembers.map(member => (
                                                    <SelectItem key={member.userUuid} value={member.userUuid}>{member.user?.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {createTaskState.error && <p className="text-sm text-destructive">{createTaskState.error}</p>}
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isCreateTaskPending}>
                                    {isCreateTaskPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Task
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
               </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.map(task => (
                  <Card key={task.uuid} className={`p-3 border-l-4 ${getTaskBorderColor(task.status)}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{task.title}</h4>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">{task.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">
                          Assigned to: {task.assigneeName || (task.assigneeUuid ? 'Unknown User' : 'Everyone')}
                        </p>
                         {/* <div className="mt-1 flex flex-wrap gap-1">
                            {task.tags.map(tag => ( // TODO: Implement tag display
                                <Badge key={tag.uuid} variant="secondary" style={{ backgroundColor: tag.color }} className="text-xs text-white">{tag.name}</Badge>
                            ))}
                        </div> */}
                      </div>
                      <Select 
                        defaultValue={task.status} 
                        disabled={!canEditTaskStatus}
                        onValueChange={(newStatus) => handleTaskStatusChange(task.uuid, newStatus as TaskStatus)}
                      >
                        <SelectTrigger className="w-[150px] text-xs h-8">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskStatuses.map(status => (
                            <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                ))}
                 {tasks.length === 0 && <p className="text-muted-foreground text-center py-4">No tasks in this project yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Documents ({projectDocuments.length})</CardTitle>
              <Button size="sm" onClick={() => { /* TODO */ }}><PlusCircle className="mr-2 h-4 w-4"/> Add Document</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectDocuments.map(doc => (
                  <Card key={doc.uuid} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                    <Button variant="ghost" size="sm" disabled>View</Button>
                  </Card>
                ))}
                 {projectDocuments.length === 0 && <p className="text-muted-foreground text-center py-4">No documents in this project yet.</p>}
              </div>
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Add New Document Content (AI Security Check Demo)</h4>
                <Textarea
                  placeholder="Paste or type document content here. Potential API keys will be flagged."
                  value={newDocContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  rows={5}
                  className={apiKeyRisk ? "border-destructive ring-2 ring-destructive" : ""}
                />
                {apiKeyRisk && <p className="text-sm text-destructive mt-1">{apiKeyRisk}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Announcements ({projectAnnouncements.length})</CardTitle>
              {canManageProjectSettings && <Button size="sm" onClick={() => { /* TODO */ }}><PlusCircle className="mr-2 h-4 w-4"/> New Announcement</Button>}
            </CardHeader>
            <CardContent>
              {projectAnnouncements.length > 0 ? projectAnnouncements.map(ann => (
                <Card key={ann.uuid} className="p-3 mb-3">
                  <h4 className="font-semibold">{ann.title}</h4>
                  <p className="text-sm text-muted-foreground">{ann.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">By: {ann.authorUuid} on {new Date(ann.createdAt).toLocaleDateString()}</p>
                </Card>
              )) : <p className="text-muted-foreground text-center py-4">No announcements for this project yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repository" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Repository & Scripts</CardTitle>
              <CardDescription>Manage simple scripts and code snippets for this project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border p-4 rounded-md">
                <h4 className="font-semibold mb-2 text-lg">Add New Script</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="script-name">Script Name</Label>
                    <Input
                      id="script-name"
                      placeholder="e.g., deployment_script.sh, data_analysis.py"
                      value={newScriptName}
                      onChange={(e) => setNewScriptName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="script-content">Script Content</Label>
                    <Textarea
                      id="script-content"
                      placeholder="Paste or write your script content here..."
                      value={newScriptContentValue}
                      onChange={(e) => setNewScriptContent(e.target.value)}
                      rows={8}
                      className="font-code text-sm"
                    />
                  </div>
                  <Button disabled> 
                    <UploadCloud className="mr-2 h-4 w-4"/> Add Script to Repository
                  </Button>
                </div>
              </div>
              <div className="border p-4 rounded-md text-center text-muted-foreground">
                <FolderGit2 className="mx-auto h-12 w-12 mb-3" />
                <p>Currently, you can add script names and their content.</p>
                <p className="text-xs mt-1">Full Git integration, tags, status, type, and notes for scripts are larger features planned for future updates.</p>
              </div>
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
                            <Button size="sm"><Users className="mr-2 h-4 w-4"/>Invite Members</Button>
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
                                    {inviteFormState.fieldErrors?.projectUuid && <p className="text-sm text-destructive">{inviteFormState.fieldErrors.projectUuid.join(', ')}</p>}
                                    {inviteFormState.error && !inviteFormState.fieldErrors && <p className="text-sm text-destructive">{inviteFormState.error}</p>}
                                    <DialogFooter>
                                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
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
                                            <AvatarImage src={member.user?.avatar} alt={member.user?.name} data-ai-hint="user avatar" />
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
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" title="Remove User">
                                                        <UserX className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Remove Member</DialogTitle>
                                                        <DialogDescription>
                                                            Are you sure you want to remove {member.user?.name || 'this user'} from the project?
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                                                        <Button variant="destructive" onClick={() => handleRemoveMember(member.userUuid)}>Remove</Button>
                                                    </DialogFooter>
                                                </DialogContent>
                                            </Dialog>
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
              <div>
                <h4 className="font-semibold mb-2 text-lg">Project Tags</h4>
                 <div className="border p-4 rounded-md text-muted-foreground">
                    <p>Project-specific tag management (creating, editing, deleting tags) is planned.</p>
                    {canManageProjectSettings && <Button className="mt-3" size="sm" disabled><PlusCircle className="mr-2 h-4 w-4"/>Manage Tags</Button>}
                 </div>
              </div>
               {isOwner && (
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
