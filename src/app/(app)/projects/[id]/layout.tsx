
'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, startTransition as ReactStartTransition } from 'react';
import type { Project, ProjectMemberRole, User } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit3, Loader2, Flame, ShieldAlert, AlertCircle, FolderKanban, BookOpen, Megaphone, FolderGit2, SettingsIcon as Settings } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { fetchProjectAction, fetchProjectOwnerNameAction, fetchProjectMemberRoleAction, updateProjectAction } from './actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useActionState } from 'react';


const editProjectFormSchema = z.object({
  name: z.string().min(3, { message: 'Project name must be at least 3 characters.' }).max(100),
  description: z.string().max(5000, {message: "Description cannot exceed 5000 characters."}).optional().or(z.literal('')),
});
type EditProjectFormValues = z.infer<typeof editProjectFormSchema>;


export default function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const projectUuid = params.id as string;

  const { user, isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwnerName, setProjectOwnerName] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<ProjectMemberRole | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const editProjectForm = useForm<EditProjectFormValues>({
    resolver: zodResolver(editProjectFormSchema),
    defaultValues: { name: '', description: '' },
  });

  const [updateProjectFormState, updateProjectFormAction, isUpdateProjectPending] = useActionState(updateProjectAction, { message: "", errors: {} });

  const loadProjectData = useCallback(async () => {
    if (projectUuid && user && !authLoading) {
      setIsLoadingData(true);
      setAccessDenied(false);
      try {
        const projectData = await fetchProjectAction(projectUuid);
        if (projectData) {
          const roleResult = await fetchProjectMemberRoleAction(projectUuid, user.uuid);
          const userRoleForProject = roleResult.role;
          setCurrentUserRole(userRoleForProject);

          if (projectData.isPrivate && !userRoleForProject && user.role !== 'admin') {
            setAccessDenied(true);
            setProject(null);
            toast({variant: "destructive", title: "Access Denied", description: "This project is private and you are not a member."});
            router.push('/projects');
            return;
          }

          setProject(projectData);
          editProjectForm.reset({ name: projectData.name, description: projectData.description || '' });

          if (projectData.ownerUuid) {
            const ownerName = await fetchProjectOwnerNameAction(projectData.ownerUuid);
            setProjectOwnerName(ownerName);
          }
        } else {
          setAccessDenied(true);
          setProject(null);
          toast({variant: "destructive", title: "Project Not Found", description: "The project could not be loaded or you don't have access."});
           router.push('/projects');
        }
      } catch (err) {
        console.error("[ProjectLayout] Error fetching project:", err);
        setProject(null);
        setAccessDenied(true);
        toast({variant: "destructive", title: "Error", description: "Could not load project details."})
         router.push('/projects');
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [projectUuid, user, authLoading, router, toast, editProjectForm]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);

  useEffect(() => {
    if (!isUpdateProjectPending && updateProjectFormState) {
      if (updateProjectFormState.message && !updateProjectFormState.error) {
        toast({ title: "Success", description: updateProjectFormState.message });
        setIsEditDialogOpen(false);
        if(updateProjectFormState.project) {
          setProject(updateProjectFormState.project); // Update project state in layout
        }
        // No need to call loadProjectData() here, as the state 'project' is updated directly
      }
      if (updateProjectFormState.error) {
        toast({ variant: "destructive", title: "Error", description: updateProjectFormState.error });
      }
    }
  }, [updateProjectFormState, isUpdateProjectPending, toast]);

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

  const getActiveTab = () => {
    if (pathname.endsWith(`/projects/${projectUuid}/readme`)) return 'readme';
    if (pathname.startsWith(`/projects/${projectUuid}/documents`)) return 'documents';
    if (pathname.endsWith(`/projects/${projectUuid}/announcements`)) return 'announcements';
    if (pathname.endsWith(`/projects/${projectUuid}/codespace`)) return 'codespace';
    if (pathname.endsWith(`/projects/${projectUuid}/settings`)) return 'settings';
    if (pathname.endsWith(`/projects/${projectUuid}`)) return 'tasks'; // Default for /projects/[id]
    return 'tasks'; // Fallback
  };

  const canManageProjectSettings = currentUserRole === 'owner' || currentUserRole === 'co-owner';

  if (authLoading || isLoadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-36 mb-4" />
        <Card className="shadow-lg">
          <CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-5 w-3/4 mt-2" /></CardHeader>
          <CardContent><div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2"><div><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-5 w-24" /></div></div></CardContent>
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
              {accessDenied ? "You do not have permission to view this project." : `Project (ID: ${projectUuid}) not found.`}
            </p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.push('/projects')} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects List
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
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={!canManageProjectSettings}>
                    <Edit3 className="mr-2 h-4 w-4" /> Edit Project Details
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update the name and description (Markdown supported) of your project.</DialogDescription>
                  </DialogHeader>
                  <Form {...editProjectForm}>
                    <form onSubmit={editProjectForm.handleSubmit(handleEditProjectSubmit)} className="space-y-4">
                      <FormField control={editProjectForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Project Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      <FormField control={editProjectForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Project Description</FormLabel><FormControl><Textarea {...field} rows={5} /></FormControl><FormMessage /></FormItem>)}/>
                      {updateProjectFormState?.error && <p className="text-sm text-destructive">{updateProjectFormState.error}</p>}
                      {updateProjectFormState?.errors?.name && <p className="text-sm text-destructive">{updateProjectFormState.errors.name[0]}</p>}
                      {updateProjectFormState?.errors?.description && <p className="text-sm text-destructive">{updateProjectFormState.errors.description[0]}</p>}
                      <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
                        <Button type="submit" disabled={isUpdateProjectPending}>{isUpdateProjectPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                <div><strong className="block text-muted-foreground">Owner:</strong> {projectOwnerName || project.ownerUuid}</div>
                <div><strong className="block text-muted-foreground">Created:</strong> {new Date(project.createdAt).toLocaleDateString()}</div>
                <div><strong className="block text-muted-foreground">Last Update:</strong> {new Date(project.updatedAt).toLocaleDateString()}</div>
                 <div><strong className="block text-muted-foreground">Your Role:</strong> <span className="capitalize">{currentUserRole || 'N/A'}</span></div>
            </div>
        </CardContent>
      </Card>

      <Tabs value={getActiveTab()} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="tasks" asChild><Link href={`/projects/${projectUuid}`}><FolderKanban className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Tasks</Link></TabsTrigger>
          <TabsTrigger value="readme" asChild><Link href={`/projects/${projectUuid}/readme`}><BookOpen className="mr-1 h-4 w-4 hidden sm:inline-flex"/>README</Link></TabsTrigger>
          <TabsTrigger value="documents" asChild><Link href={`/projects/${projectUuid}/documents`}><BookOpen className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Documents</Link></TabsTrigger>
          <TabsTrigger value="announcements" asChild><Link href={`/projects/${projectUuid}/announcements`}><Megaphone className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Announcements</Link></TabsTrigger>
          <TabsTrigger value="codespace" asChild><Link href={`/projects/${projectUuid}/codespace`}><FolderGit2 className="mr-1 h-4 w-4 hidden sm:inline-flex"/>CodeSpace</Link></TabsTrigger>
          <TabsTrigger value="settings" asChild><Link href={`/projects/${projectUuid}/settings`}><Settings className="mr-1 h-4 w-4 hidden sm:inline-flex"/>Settings & Team</Link></TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="mt-4">
        {React.cloneElement(children as React.ReactElement, { project, currentUserRole, projectUuid, user })}
      </div>
    </div>
  );
}
