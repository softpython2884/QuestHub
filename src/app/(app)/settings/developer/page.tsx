
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as UIAlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { getFlowAppsAction, deleteFlowAppAction } from './actions';
import { ArrowLeft, Code2, PlusCircle, Trash2, Bot, MoreVertical, Edit } from 'lucide-react';
import type { FlowApp } from '@/types';
import { Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';


export default function DeveloperSettingsPage() {
  const { toast } = useToast();
  
  // FlowApp State
  const [flowApps, setFlowApps] = useState<Omit<FlowApp, 'token' | 'secretHash'>[]>([]);
  const [isLoadingFlowApps, setIsLoadingFlowApps] = useState(true);
  const [flowAppToDelete, setFlowAppToDelete] = useState<FlowApp | null>(null);
  const [isDeletingFlowApp, setIsDeletingFlowApp] = useState(false);
  

  useEffect(() => {
    async function loadApps() {
      setIsLoadingFlowApps(true);
      try {
        const userFlowApps = await getFlowAppsAction();
        setFlowApps(userFlowApps);
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your applications.' });
      } finally {
        setIsLoadingFlowApps(false);
      }
    }
    loadApps();
  }, [toast]);
  
  
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
              <CardDescription>Manage your personal access tokens (FlowApps) to integrate with the FlowUp API.</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <CardTitle className="flex items-center"><Bot className="mr-2 h-5 w-5"/>FlowApps (Personal Access Tokens)</CardTitle>
              <CardDescription>For personal scripts, automations, and server-to-server integrations.</CardDescription>
            </div>
            <Button asChild>
                <Link href="/settings/developer/new-flow-app">
                    <PlusCircle className="mr-2 h-4 w-4"/>Create New FlowApp
                </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFlowApps ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
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
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                           <Link href={`/settings/developer/edit-flow-app/${app.uuid}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </Link>
                        </DropdownMenuItem>
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setFlowAppToDelete(app as FlowApp); }}>
                                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                    <span className="text-destructive">Delete</span>
                                </DropdownMenuItem>
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
