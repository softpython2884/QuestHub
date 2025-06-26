
'use client';

import { useState, useEffect, useActionState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as UIAlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getOAuthAppsAction, createOAuthAppAction, deleteOAuthAppAction, getFlowAppsAction, createFlowAppAction, deleteFlowAppAction, updateOAuthAppAction } from './actions';
import { ArrowLeft, Code2, PlusCircle, Trash2, KeyRound, Copy, Check, Info, Bot, MoreVertical, Edit } from 'lucide-react';
import type { OAuthApp, CreateOAuthAppFormState, FlowApp, CreateFlowAppFormState, UpdateOAuthAppFormState } from '@/types';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const oAuthAppFormSchema = z.object({
  name: z.string().min(3, "App name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description cannot exceed 200 characters.").optional(),
  redirectUris: z.string().min(1, "At least one Redirect URI is required.").refine(
    (value) => {
      const uris = value.split('\n').map(uri => uri.trim()).filter(Boolean);
      try {
        uris.forEach(uri => new URL(uri));
        return true;
      } catch {
        return false;
      }
    },
    "Please enter valid URLs, one per line."
  ),
  website: z.string().url("Please enter a valid website URL.").optional().or(z.literal('')),
});
type OAuthAppFormValues = z.infer<typeof oAuthAppFormSchema>;

const flowAppFormSchema = z.object({
  name: z.string().min(3, "App name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description cannot exceed 200 characters.").optional(),
});
type FlowAppFormValues = z.infer<typeof flowAppFormSchema>;

export default function DeveloperSettingsPage() {
  const { toast } = useToast();
  
  // OAuth App State
  const [oauthApps, setOauthApps] = useState<OAuthApp[]>([]);
  const [isLoadingOauthApps, setIsLoadingOauthApps] = useState(true);
  const [isCreateOauthDialogOpen, setIsCreateOauthDialogOpen] = useState(false);
  const [appToEdit, setAppToEdit] = useState<OAuthApp | null>(null);
  const [createdOauthAppDetails, setCreatedOauthAppDetails] = useState<{ name: string; clientId: string; clientSecret: string } | null>(null);
  const [oauthAppToDelete, setOauthAppToDelete] = useState<OAuthApp | null>(null);
  const [isDeletingOauthApp, setIsDeletingOauthApp] = useState(false);
  const [copied, setCopied] = useState<'clientId' | 'clientSecret' | 'flowAppToken' | null>(null);
  
  // FlowApp State
  const [flowApps, setFlowApps] = useState<Omit<FlowApp, 'token'>[]>([]);
  const [isLoadingFlowApps, setIsLoadingFlowApps] = useState(true);
  const [isCreateFlowAppDialogOpen, setIsCreateFlowAppDialogOpen] = useState(false);
  const [createdFlowApp, setCreatedFlowApp] = useState<{ name: string; token: string } | null>(null);
  const [flowAppToDelete, setFlowAppToDelete] = useState<FlowApp | null>(null);
  const [isDeletingFlowApp, setIsDeletingFlowApp] = useState(false);
  
  // OAuth Create Form
  const [createOauthState, createOauthFormAction, isCreatingOauth] = useActionState(createOAuthAppAction, { message: "", error: ""});
  const oauthForm = useForm<OAuthAppFormValues>({ resolver: zodResolver(oAuthAppFormSchema), defaultValues: { name: '', description: '', redirectUris: '', website: '' } });
  
  // OAuth Edit Form
  const [updateOauthState, updateOauthFormAction, isUpdatingOauth] = useActionState(updateOAuthAppAction, { message: "", error: ""});
  const oauthEditForm = useForm<OAuthAppFormValues>({ resolver: zodResolver(oAuthAppFormSchema) });

  // FlowApp Form
  const [createFlowAppState, createFlowAppFormAction, isCreatingFlowApp] = useActionState(createFlowAppAction, { message: "", error: ""});
  const flowAppForm = useForm<FlowAppFormValues>({ resolver: zodResolver(flowAppFormSchema), defaultValues: { name: '', description: '' } });

  useEffect(() => {
    async function loadApps() {
      setIsLoadingOauthApps(true);
      setIsLoadingFlowApps(true);
      try {
        const [userOauthApps, userFlowApps] = await Promise.all([
          getOAuthAppsAction(),
          getFlowAppsAction()
        ]);
        setOauthApps(userOauthApps);
        setFlowApps(userFlowApps);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your applications.' });
      } finally {
        setIsLoadingOauthApps(false);
        setIsLoadingFlowApps(false);
      }
    }
    loadApps();
  }, [toast]);
  
  useEffect(() => {
    if (createOauthState?.message && !createOauthState.error && createOauthState.createdApp) {
        toast({ title: "Success", description: createOauthState.message });
        setOauthApps(prev => [createOauthState.createdApp as OAuthApp, ...prev]);
        setCreatedOauthAppDetails(createOauthState.createdApp);
        setIsCreateOauthDialogOpen(false);
        oauthForm.reset();
    }
    if (createOauthState?.error) {
        if (createOauthState.fieldErrors) {
            Object.entries(createOauthState.fieldErrors).forEach(([field, errors]) => {
                if (errors) {
                  // @ts-ignore
                  oauthForm.setError(field, { type: 'manual', message: errors.join(', ') });
                }
            });
        } else {
          toast({ variant: "destructive", title: "Creation Error", description: createOauthState.error });
        }
    }
  }, [createOauthState, toast, oauthForm]);

  useEffect(() => {
    if (updateOauthState?.message && !updateOauthState.error && updateOauthState.updatedApp) {
        toast({ title: "Success", description: updateOauthState.message });
        setOauthApps(prev => prev.map(app => app.uuid === updateOauthState.updatedApp!.uuid ? updateOauthState.updatedApp! : app));
        setAppToEdit(null);
    }
    if (updateOauthState?.error) {
        if (updateOauthState.fieldErrors) {
             Object.entries(updateOauthState.fieldErrors).forEach(([field, errors]) => {
                if (errors) {
                  // @ts-ignore
                  oauthEditForm.setError(field, { type: 'manual', message: errors.join(', ') });
                }
            });
        } else {
            toast({ variant: "destructive", title: "Update Error", description: updateOauthState.error });
        }
    }
  }, [updateOauthState, toast, oauthEditForm]);

  useEffect(() => {
      if (createFlowAppState?.message && !createFlowAppState.error && createFlowAppState.createdApp) {
          toast({ title: "Success", description: createFlowAppState.message });
          setFlowApps(prev => [createFlowAppState.createdApp as FlowApp, ...prev]);
          setCreatedFlowApp(createFlowAppState.createdApp);
          setIsCreateFlowAppDialogOpen(false);
          flowAppForm.reset();
      }
      if (createFlowAppState?.error) {
           if (createFlowAppState.fieldErrors) {
              Object.entries(createFlowAppState.fieldErrors).forEach(([field, errors]) => {
                  if (errors) {
                    // @ts-ignore
                    flowAppForm.setError(field, { type: 'manual', message: errors.join(', ') });
                  }
              });
          } else {
              toast({ variant: "destructive", title: "Creation Error", description: createFlowAppState.error });
          }
      }
  }, [createFlowAppState, toast, flowAppForm]);

  useEffect(() => {
    if (appToEdit) {
      oauthEditForm.reset({
        name: appToEdit.name,
        description: appToEdit.description || '',
        website: appToEdit.website || '',
        redirectUris: appToEdit.redirectUris.join('\n'),
      });
    }
  }, [appToEdit, oauthEditForm]);

  const handleDeleteOAuthApp = async () => {
    if (!oauthAppToDelete) return;
    setIsDeletingOauthApp(true);
    const result = await deleteOAuthAppAction(oauthAppToDelete.uuid);
    if (result.success) {
      toast({ title: 'Success', description: 'Application deleted.' });
      setOauthApps(prev => prev.filter(app => app.uuid !== oauthAppToDelete.uuid));
      setOauthAppToDelete(null);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsDeletingOauthApp(false);
  };
  
  const handleDeleteFlowApp = async () => {
    if (!flowAppToDelete) return;
    setIsDeletingFlowApp(true);
    const result = await deleteFlowAppAction(flowAppToDelete.uuid);
    if (result.success) {
      toast({ title: 'Success', description: 'FlowApp deleted.' });
      setFlowApps(prev => prev.filter(app => app.uuid !== flowAppToDelete.uuid));
      setFlowAppToDelete(null);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsDeletingFlowApp(false);
  };

  const copyToClipboard = (text: string, type: 'clientId' | 'clientSecret' | 'flowAppToken') => {
      navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild>
        <Link href="/settings">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-headline flex items-center"><Code2 className="mr-2 h-6 w-6 text-primary"/>Developer Settings</CardTitle>
              <CardDescription>Manage applications and personal tokens to integrate with FlowUp.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <CardTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5"/>OAuth Applications</CardTitle>
              <CardDescription>For third-party apps that need to act on behalf of other users.</CardDescription>
            </div>
            <Dialog open={isCreateOauthDialogOpen} onOpenChange={setIsCreateOauthDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/>Create OAuth App</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Register a New OAuth Application</DialogTitle>
                        <DialogDescription>
                            Provide details for your new application. Redirect URIs are required for the OAuth flow.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...oauthForm}>
                        <form action={createOauthFormAction} className="space-y-4">
                            <FormField control={oauthForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Application Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., My Cool Integration"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={oauthForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={oauthForm.control} name="website" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Homepage URL (Optional)</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://myapp.com"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={oauthForm.control} name="redirectUris" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authorization callback URLs</FormLabel>
                                    <FormControl><Textarea {...field} rows={3} placeholder="https://myapp.com/callback&#x0a;http://localhost:3000/callback"/></FormControl>
                                    <FormDescription>Enter one URL per line. These are the URLs FlowUp will redirect to after a user authorizes your app.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreatingOauth}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isCreatingOauth}>
                                    {isCreatingOauth && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Register Application
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingOauthApps ? (
            <div className="space-y-4">
              {[...Array(1)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : oauthApps.length === 0 ? (
            <div className="text-center py-8">
              <p className="mt-1 text-sm text-muted-foreground">
                You haven't created any OAuth applications yet.
              </p>
            </div>
          ) : (
             <div className="space-y-4">
              {oauthApps.map(app => (
                <Card key={app.uuid} className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted p-3 rounded-md">
                        <KeyRound className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">{app.name}</h3>
                        <p className="text-sm text-muted-foreground">Client ID: <span className="font-mono">{app.clientId.substring(0,8)}...</span></p>
                         <p className="text-xs text-muted-foreground">Created: {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAppToEdit(app)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOauthAppToDelete(app); }}>
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                <span className="text-destructive">Delete</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          {oauthAppToDelete?.uuid === app.uuid && (
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Delete "{oauthAppToDelete.name}"?</AlertDialogTitle>
                                      <UIAlertDialogDescription>
                                          This will permanently delete the application and revoke all its existing access tokens. This action cannot be undone.
                                      </UIAlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setOauthAppToDelete(null)}>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteOAuthApp} disabled={isDeletingOauthApp} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                          {isDeletingOauthApp && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          )}
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!appToEdit} onOpenChange={(open) => !open && setAppToEdit(null)}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit: {appToEdit?.name}</DialogTitle>
            <DialogDescription>
              Update your application's details.
            </DialogDescription>
          </DialogHeader>
          <Form {...oauthEditForm}>
            <form action={updateOauthFormAction} className="space-y-4">
              <input type="hidden" name="uuid" value={appToEdit?.uuid || ''} />
              <FormField control={oauthEditForm.control} name="name" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Application Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={oauthEditForm.control} name="description" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea {...field} rows={2} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}/>
              <FormField control={oauthEditForm.control} name="website" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Homepage URL (Optional)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}/>
               <FormField control={oauthEditForm.control} name="redirectUris" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Authorization callback URLs</FormLabel>
                      <FormControl><Textarea {...field} rows={3} /></FormControl>
                      <FormDescription>Enter one URL per line.</FormDescription>
                      <FormMessage />
                  </FormItem>
              )}/>
              <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="ghost" disabled={isUpdatingOauth}>Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isUpdatingOauth}>
                      {isUpdatingOauth && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Changes
                  </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <CardTitle className="flex items-center"><Bot className="mr-2 h-5 w-5"/>FlowApps (Personal Access Tokens)</CardTitle>
              <CardDescription>For personal scripts, automations, and server-to-server integrations.</CardDescription>
            </div>
            <Dialog open={isCreateFlowAppDialogOpen} onOpenChange={setIsCreateFlowAppDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/>Create New FlowApp</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Create a New FlowApp</DialogTitle>
                        <DialogDescription>
                          This will generate a personal access token. Treat it like a password.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...flowAppForm}>
                        <form action={createFlowAppFormAction} className="space-y-4">
                            <FormField control={flowAppForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>FlowApp Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., My CI/CD Script"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={flowAppForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreatingFlowApp}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isCreatingFlowApp}>
                                    {isCreatingFlowApp && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create FlowApp
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFlowApps ? (
            <div className="space-y-4">
              {[...Array(1)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : flowApps.length === 0 ? (
            <div className="text-center py-8">
              <p className="mt-1 text-sm text-muted-foreground">
                You haven't created any FlowApps yet.
              </p>
            </div>
          ) : (
             <div className="space-y-4">
              {flowApps.map(app => (
                <Card key={app.uuid} className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-muted p-3 rounded-md">
                        <Bot className="h-6 w-6 text-primary"/>
                    </div>
                    <div>
                        <h3 className="font-semibold">{app.name}</h3>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{app.description || "No description"}</p>
                         <p className="text-xs text-muted-foreground">Created: {new Date(app.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setFlowAppToDelete(app)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </AlertDialogTrigger>
                        {flowAppToDelete?.uuid === app.uuid && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{flowAppToDelete.name}"?</AlertDialogTitle>
                                    <UIAlertDialogDescription>
                                        This will permanently delete the FlowApp and its token. Any application using this token will no longer be able to access the API.
                                    </UIAlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setFlowAppToDelete(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteFlowApp} disabled={isDeletingFlowApp} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        {isDeletingFlowApp && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        )}
                    </AlertDialog>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={!!createdOauthAppDetails} onOpenChange={(open) => !open && setCreatedOauthAppDetails(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Application Created: {createdOauthAppDetails?.name}</DialogTitle>
                <DialogDescription>
                    Your application has been registered. Here are your client credentials.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                 <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-md text-destructive flex items-start gap-3">
                     <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                     <p className="text-sm">This is the only time your Client Secret will be displayed. Store it securely.</p>
                 </div>
                 <div>
                     <Label>Client ID</Label>
                     <div className="flex items-center gap-2">
                        <Input readOnly value={createdOauthAppDetails?.clientId || ''} className="font-mono"/>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdOauthAppDetails?.clientId || '', 'clientId')}>
                           {copied === 'clientId' ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                        </Button>
                     </div>
                 </div>
                 <div>
                     <Label>Client Secret</Label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={createdOauthAppDetails?.clientSecret || ''} className="font-mono"/>
                         <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdOauthAppDetails?.clientSecret || '', 'clientSecret')}>
                           {copied === 'clientSecret' ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                        </Button>
                     </div>
                 </div>
            </div>
             <DialogFooter>
                <DialogClose asChild><Button>Done</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdFlowApp} onOpenChange={(open) => !open && setCreatedFlowApp(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>FlowApp Created: {createdFlowApp?.name}</DialogTitle>
                <DialogDescription>
                    Your personal access token has been generated.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
                 <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-md text-destructive flex items-start gap-3">
                     <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                     <p className="text-sm">This is the **only** time your token will be displayed. Copy it now and store it in a secure place.</p>
                 </div>
                 <div>
                     <Label>Personal Access Token</Label>
                     <div className="flex items-center gap-2">
                        <Input readOnly value={createdFlowApp?.token || ''} className="font-mono"/>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdFlowApp?.token || '', 'flowAppToken')}>
                           {copied === 'flowAppToken' ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                        </Button>
                     </div>
                 </div>
            </div>
             <DialogFooter>
                <DialogClose asChild><Button>Done</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
