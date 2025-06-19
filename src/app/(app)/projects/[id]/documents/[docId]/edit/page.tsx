
'use client';

import { DocumentEditor } from '@/components/project/DocumentEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { fetchDocumentAction, fetchProjectMemberRoleAction, fetchProjectAction } from '../../../actions';
import { useEffect, useState } from 'react';
import type { ProjectDocumentType, Project } from '@/types';
import { Loader2, ArrowLeft, ShieldAlert, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditDocumentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const projectUuid = params.id as string;
  const documentUuid = params.docId as string;

  const [document, setDocument] = useState<ProjectDocumentType | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [canEdit, setCanEdit] = useState(false);


  useEffect(() => {
    async function loadDocumentAndCheckPermissions() {
      if (!user || !projectUuid || !documentUuid) return;
      setIsLoadingDocument(true);
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
          const fetchedDoc = await fetchDocumentAction(documentUuid);
          if (fetchedDoc) {
            if (fetchedDoc.projectUuid !== projectUuid) {
                 toast({ variant: 'destructive', title: 'Error', description: 'Document does not belong to this project.' });
                 router.push(`/projects/${projectUuid}?tab=documents`);
                 return;
            }
            if (fetchedDoc.fileType !== 'markdown') {
                toast({ variant: 'destructive', title: 'Error', description: 'Only markdown documents can be edited this way.' });
                router.push(`/projects/${projectUuid}?tab=documents`);
                return;
            }
            setDocument(fetchedDoc);
          } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Document not found.' });
            router.push(`/projects/${projectUuid}?tab=documents`);
          }
        } else {
          setCanEdit(false);
          toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to edit documents in this project.' });
          router.push(`/projects/${projectUuid}`);
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load document or verify permissions.' });
        router.push(`/projects/${projectUuid}?tab=documents`);
      } finally {
        setIsLoadingDocument(false);
      }
    }
    if (!authLoading) {
         if (!user) {
            router.push('/login');
        } else {
            loadDocumentAndCheckPermissions();
        }
    }
  }, [user, authLoading, projectUuid, documentUuid, router, toast]);


  const handleCancel = () => {
    router.push(`/projects/${projectUuid}?tab=documents`);
  };


  if (authLoading || isLoadingDocument) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!canEdit && !isLoadingDocument) {
     return (
      <div className="container mx-auto p-4 py-8 space-y-6">
         <Button variant="outline" onClick={() => router.push(`/projects/${projectUuid}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Button>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-6 bg-card rounded-lg shadow">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to edit this document.</p>
        </div>
      </div>
    );
  }

  if (!document && !isLoadingDocument) {
     return (
      <div className="container mx-auto p-4 py-8 space-y-6">
        <Button variant="outline" onClick={() => router.push(`/projects/${projectUuid}`)} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Project
        </Button>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-6 bg-card rounded-lg shadow">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground">The document you are trying to edit could not be found.</p>
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
        document={document}
        onSaveSuccess={(docUuid) => router.push(`/projects/${projectUuid}?tab=documents`)}
        onCancel={handleCancel}
      />
    </div>
  );
}
