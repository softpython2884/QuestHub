
'use client';

import { DocumentEditor } from '@/components/project/DocumentEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { createDocumentAction, fetchProjectAction, fetchProjectMemberRoleAction } from '../../actions'; 
import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewDocumentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const projectUuid = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [canEdit, setCanEdit] = useState(false);


  useEffect(() => {
    async function checkPermissions() {
      if (!user || !projectUuid) return;
      setIsLoadingPermissions(true);
      try {
        const fetchedProject = await fetchProjectAction(projectUuid);
        setProject(fetchedProject);
        if (!fetchedProject) {
          toast({ variant: 'destructive', title: 'Error', description: 'Project not found.' });
          router.push(`/projects/${projectUuid}`);
          return;
        }
        
        const roleResult = await fetchProjectMemberRoleAction(projectUuid, user.uuid);

        if (roleResult.role && ['owner', 'co-owner', 'editor'].includes(roleResult.role)) {
          setCanEdit(true);
        } else {
          setCanEdit(false);
          toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to create documents in this project.' });
          router.push(`/projects/${projectUuid}`);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to verify permissions.' });
        router.push(`/projects/${projectUuid}`);
      } finally {
        setIsLoadingPermissions(false);
      }
    }

    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else {
        checkPermissions();
      }
    }
  }, [user, authLoading, projectUuid, router, toast]);


  const handleCancel = () => {
    router.push(`/projects/${projectUuid}?tab=documents`);
  };

  if (authLoading || isLoadingPermissions) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!canEdit && !isLoadingPermissions) {
     return (
      <div className="container mx-auto p-4 py-8 space-y-6">
         <Button variant="outline" onClick={() => router.push(`/projects/${projectUuid}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Button>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-6 bg-card rounded-lg shadow">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to create documents in this project.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto p-4 py-8">
       <Button variant="outline" onClick={handleCancel} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project Documents
        </Button>
      <DocumentEditor
        projectUuid={projectUuid}
        onSaveSuccess={(docUuid) => router.push(`/projects/${projectUuid}?tab=documents`)}
        onCancel={handleCancel}
      />
    </div>
  );
}
