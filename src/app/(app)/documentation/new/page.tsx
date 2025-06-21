
'use client';

import { DocumentEditor } from '@/components/project/DocumentEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { saveGlobalDocumentAction } from './actions'; 
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NewGlobalDocumentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const handleCancel = () => {
    router.push(`/documentation`);
  };

  const handleSave = async (data: { title: string, content: string }) => {
    const result = await saveGlobalDocumentAction(null, data.title, data.content);
    if (result.error) {
      return { error: result.error };
    }
    return { savedEntity: result.document };
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-8">
       <Button variant="outline" onClick={handleCancel} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Documentation
        </Button>
      <DocumentEditor
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
