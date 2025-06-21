
'use client';

import { DocumentEditor } from '@/components/project/DocumentEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { saveGlobalDocumentAction, getPublicProjectsAction } from './actions'; 
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project } from '@/types';
import { useState, useEffect } from 'react';

export default function NewGlobalDocumentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [publicProjects, setPublicProjects] = useState<Pick<Project, 'uuid' | 'name'>[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  useEffect(() => {
    async function loadProjects() {
        if (user) {
            setIsLoadingProjects(true);
            const projects = await getPublicProjectsAction();
            setPublicProjects(projects);
            setIsLoadingProjects(false);
        }
    }
    loadProjects();
  }, [user]);

  const handleCancel = () => {
    router.push(`/documentation`);
  };

  const handleSave = async (data: { title: string, content: string, tagsString?: string, linkedProjectUuid?: string | null }) => {
    const result = await saveGlobalDocumentAction(null, data.title, data.content, data.tagsString, data.linkedProjectUuid);
    if (result.error) {
      return { error: result.error };
    }
    return { savedEntity: result.document };
  };

  if (authLoading || isLoadingProjects) {
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
        showMetadataControls={true}
        publicProjects={publicProjects}
      />
    </div>
  );
}
