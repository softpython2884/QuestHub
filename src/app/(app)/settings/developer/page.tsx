
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
import { getOAuthAppsAction, createOAuthAppAction, deleteOAuthAppAction } from './actions';
import { ArrowLeft, Code2, PlusCircle, Trash2, KeyRound, Copy, Check, Info } from 'lucide-react';
import type { OAuthApp, CreateOAuthAppFormState } from '@/types';
import { Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

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

export default function DeveloperSettingsPage() {
  const { toast } = useToast();
  const [apps, setApps] = useState<OAuthApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createdAppDetails, setCreatedAppDetails] = useState<{ name: string; clientId: string; clientSecret: string } | null>(null);
  const [appToDelete, setAppToDelete] = useState<OAuthApp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState<'clientId' | 'clientSecret' | null>(null);

  const [createState, createFormAction, isCreating] = useActionState(createOAuthAppAction, { message: "", error: ""});
  const form = useForm<OAuthAppFormValues>({
    resolver: zodResolver(oAuthAppFormSchema),
    defaultValues: { name: '', description: '', redirectUris: '', website: '' },
  });

  useEffect(() => {
    async function loadApps() {
      try {
        setIsLoading(true);
        const userApps = await getOAuthAppsAction();
        setApps(userApps);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
      } finally {
        setIsLoading(false);
      }
    }
    loadApps();
  }, [toast]);
  
  useEffect(() => {
      if (createState?.message && !createState.error && createState.createdApp) {
          toast({ title: "Success", description: createState.message });
          setCreatedAppDetails(createState.createdApp);
          setIsCreateDialogOpen(false);
          form.reset();
      }
      if (createState?.error) {
          if (createState.fieldErrors) {
              Object.entries(createState.fieldErrors).forEach(([field, errors]) => {
                  if (errors) {
                    // @ts-ignore
                    form.setError(field, { type: 'manual', message: errors.join(', ') });
                  }
              });
          } else {
            toast({ variant: "destructive", title: "Creation Error", description: createState.error });
          }
      }
  }, [createState, toast, form]);

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    setIsDeleting(true);
    const result = await deleteOAuthAppAction(appToDelete.uuid);
    if (result.success) {
      toast({ title: 'Success', description: 'Application deleted.' });
      setApps(prev => prev.filter(app => app.uuid !== appToDelete.uuid));
      setAppToDelete(null);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsDeleting(false);
  };
  
  const copyToClipboard = (text: string, type: 'clientId' | 'clientSecret') => {
      navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
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
              <CardDescription>Manage OAuth applications to integrate with FlowUp.</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                    <Button><PlusCircle className="mr-2 h-4 w-4"/>Create New Application</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>Register a New OAuth Application</DialogTitle>
                        <DialogDescription>
                            Provide details for your new application. Redirect URIs are required for the OAuth flow.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form action={createFormAction} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Application Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., My Cool Integration"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="website" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Homepage URL (Optional)</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://myapp.com"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField control={form.control} name="redirectUris" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Authorization callback URLs</FormLabel>
                                    <FormControl><Textarea {...field} rows={3} placeholder="https://myapp.com/callback&#x0a;http://localhost:3000/callback"/></FormControl>
                                    <FormDescription>Enter one URL per line. These are the URLs FlowUp will redirect to after a user authorizes your app.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost" disabled={isCreating}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isCreating}>
                                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Register Application
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-12">
              <KeyRound className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Applications Yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first OAuth application to get started.
              </p>
            </div>
          ) : (
             <div className="space-y-4">
              {apps.map(app => (
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
                  <div className="flex items-center gap-1">
                    {/* Add edit button later */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setAppToDelete(app)}>
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </AlertDialogTrigger>
                        {appToDelete?.uuid === app.uuid && (
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete "{appToDelete.name}"?</AlertDialogTitle>
                                    <UIAlertDialogDescription>
                                        This will permanently delete the application and revoke all its existing access tokens. This action cannot be undone.
                                    </UIAlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setAppToDelete(null)}>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteApp} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Delete
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
      
      <Dialog open={!!createdAppDetails} onOpenChange={(open) => !open && setCreatedAppDetails(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Application Created: {createdAppDetails?.name}</DialogTitle>
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
                        <Input readOnly value={createdAppDetails?.clientId || ''} className="font-mono"/>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdAppDetails?.clientId || '', 'clientId')}>
                           {copied === 'clientId' ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                        </Button>
                     </div>
                 </div>
                 <div>
                     <Label>Client Secret</Label>
                      <div className="flex items-center gap-2">
                        <Input readOnly value={createdAppDetails?.clientSecret || ''} className="font-mono"/>
                         <Button variant="outline" size="icon" onClick={() => copyToClipboard(createdAppDetails?.clientSecret || '', 'clientSecret')}>
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
    </div>
  );
}
