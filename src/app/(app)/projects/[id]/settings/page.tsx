
'use client';

import { useState, useEffect, useCallback, startTransition as ReactStartTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Mail, UserX, Tag as TagIcon, PlusCircle, Palette, Trash2, Loader2 } from 'lucide-react';
import type { Project, ProjectMember, ProjectMemberRole, Tag as TagType, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { 
  fetchProjectMembersAction, 
  removeUserFromProjectAction,
  inviteUserToProjectAction, type InviteUserFormState,
  fetchProjectTagsAction, createProjectTagAction, type CreateProjectTagFormState,
  toggleProjectUrgencyAction, type ToggleProjectUrgencyFormState,
  toggleProjectVisibilityAction, type ToggleProjectVisibilityFormState
} from '../actions';
import { useActionState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserByUuid } from '@/lib/db'; // For admin check, might need an action if direct DB access is an issue

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

interface ProjectSettingsPageProps {
  project: Project; // Passed from layout
  currentUserRole: ProjectMemberRole | null; // Passed from layout
  projectUuid: string; // Passed from layout
  user: User; // Passed from layout (global user object)
}

export default function ProjectSettingsPage({ project: initialProject, currentUserRole, projectUuid, user }: ProjectSettingsPageProps) {
  const { toast } = useToast();
  const [project, setProject] = useState<Project>(initialProject);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectTags, setProjectTags] = useState<TagType[]>([]);

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
  
  // For syncing project data if it's updated in the layout (e.g., after project name/desc edit)
  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const loadProjectMembersAndRole = useCallback(async () => {
    if (projectUuid && user) {
        try {
            const members = await fetchProjectMembersAction(projectUuid);
            setProjectMembers(members);
        } catch (error) {
            console.error("Failed to load project members or determine role", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load project members." });
        }
    }
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

  useEffect(() => {
    if (projectUuid && user) {
      loadProjectMembersAndRole();
      loadProjectTagsData();
    }
  }, [projectUuid, user, loadProjectMembersAndRole, loadProjectTagsData]);


  useEffect(() => {
    if (!isInvitePending && inviteFormState) {
        if (inviteFormState.message && !inviteFormState.error) {
            toast({ title: "Success", description: inviteFormState.message });
            setIsInviteUserDialogOpen(false);
            inviteForm.reset();
            loadProjectMembersAndRole(); // Reload members
        }
        if (inviteFormState.error) {
            toast({ variant: "destructive", title: "Invitation Error", description: inviteFormState.error });
        }
    }
  }, [inviteFormState, isInvitePending, toast, loadProjectMembersAndRole, inviteForm]);

  useEffect(() => {
    if (!isToggleUrgencyPending && toggleUrgencyState) {
        if (toggleUrgencyState.message && !toggleUrgencyState.error) {
            toast({ title: "Success", description: toggleUrgencyState.message });
            if(toggleUrgencyState.project) setProject(toggleUrgencyState.project); // Update local project
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
            if(toggleVisibilityState.project) setProject(toggleVisibilityState.project); // Update local project
        }
        if (toggleVisibilityState.error) {
            toast({ variant: "destructive", title: "Visibility Error", description: toggleVisibilityState.error });
        }
    }
  }, [toggleVisibilityState, isToggleVisibilityPending, toast]);
  
  useEffect(() => {
    if (!isCreateProjectTagPending && createProjectTagState) {
      if (createProjectTagState.message && !createProjectTagState.error) {
        toast({ title: "Success", description: createProjectTagState.message });
        setIsAddProjectTagDialogOpen(false);
        projectTagForm.reset({ tagName: '', tagColor: '#6B7280' });
        loadProjectTagsData(); // Reload tags
      }
      if (createProjectTagState.error) {
        toast({ variant: "destructive", title: "Tag Creation Error", description: createProjectTagState.error });
      }
    }
  }, [createProjectTagState, isCreateProjectTagPending, toast, projectTagForm, loadProjectTagsData]);

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
      if (result.success) {
          toast({ title: "Success", description: result.message });
          loadProjectMembersAndRole(); // Reload members
      } else {
          toast({ variant: "destructive", title: "Error", description: result.error });
      }
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

  if (!project || !user) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project settings...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Team & Project Settings for {project.name}</CardTitle>
          {canManageProjectSettings && (
              <Dialog open={isInviteUserDialogOpen} onOpenChange={setIsInviteUserDialogOpen}>
                  <DialogTrigger asChild>
                      <Button size="sm" onClick={() => inviteForm.reset()}><Users className="mr-2 h-4 w-4"/>Invite Members</Button>
                  </DialogTrigger>
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
          <h4 className="font-semibold mb-3 text-lg">Current Members ({projectMembers.length})</h4>
           {projectMembers.length > 0 ? (
              <div className="space-y-3">
                  {projectMembers.map(member => (
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
              {projectTags.length === 0 && <p className="text-muted-foreground text-center py-2">No custom tags defined.</p>}
              <div className="flex flex-wrap gap-2">
                  {projectTags.map(tag => ( <Badge key={tag.uuid} style={{ backgroundColor: tag.color, color: '#fff' }} className="text-sm px-3 py-1">{tag.name}</Badge> ))}
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
  );
}
