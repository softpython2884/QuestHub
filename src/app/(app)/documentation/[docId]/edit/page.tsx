
'use client';

import { DocumentEditor } from '@/components/project/DocumentEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getGlobalDocumentAction, saveGlobalDocumentAction } from '../actions'; 
import { useEffect, useState } from 'react';
import type { GlobalDocument } from '@/types';
import { Loader2, ArrowLeft, ShieldAlert, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditGlobalDocumentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const documentUuid = params.docId as string;

  const [document, setDocument] = useState<GlobalDocument | null>(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    async function loadDocumentAndCheckPermissions() {
      if (!user || !documentUuid) return;
      setIsLoadingDocument(true);
      try {
        const fetchedDoc = await getGlobalDocumentAction(documentUuid);
        if (fetchedDoc) {
          if (user.uuid === fetchedDoc.authorUuid || user.role === 'admin') {
            setCanEdit(true);
            setDocument(fetchedDoc);
          } else {
            setCanEdit(false);
            toast({ variant: 'destructive', title: 'Access Denied', description: 'You do not have permission to edit this document.' });
            router.push(`/documentation/${documentUuid}`);
          }
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Document not found.' });
          router.push('/documentation');
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load document.' });
      } finally {
        setIsLoadingDocument(false);
      }
    }
    if (!authLoading) {
      if (!user) router.push('/login');
      else loadDocumentAndCheckPermissions();
    }
  }, [user, authLoading, documentUuid, router, toast]);

  const handleCancel = () => {
    router.push(`/documentation/${documentUuid}`);
  };

  const handleSave = async (data: { uuid?: string, title: string, content: string }) => {
    const result = await saveGlobalDocumentAction(data.uuid || null, data.title, data.content);
    if (result.error) {
      return { error: result.error };
    }
    return { savedEntity: result.document };
  };

  if (authLoading || isLoadingDocument) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!canEdit) {
    return (
      <div className="container mx-auto p-4 py-8 space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-6 bg-card rounded-lg shadow">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to edit this document.</p>
             <Button asChild className="mt-4"><Link href={`/documentation/${documentUuid}`}>Back to Document</Link></Button>
        </div>
      </div>
    );
  }

  if (!document) {
     return (
      <div className="container mx-auto p-4 py-8 space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-6 bg-card rounded-lg shadow">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground">The document you are trying to edit could not be found.</p>
            <Button asChild className="mt-4"><Link href="/documentation">Back to Documentation</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <Button variant="outline" onClick={handleCancel} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Document
      </Button>
      <DocumentEditor
        initialData={document}
        onSave={handleSave}
        onSaveSuccess={(docUuid) => router.push(`/documentation/${docUuid}`)}
        onCancel={handleCancel}
        entityName="Document"
        saveButtonText="Save Changes"
        createButtonText="Create Document"
      />
    </div>
  );
}
