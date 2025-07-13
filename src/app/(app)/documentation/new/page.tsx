
'use client';

import { DocumentEditor } from '@/components/project/DocumentEditor';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { saveGlobalDocumentAction, getLinkableProjectsForUserAction, getKnowledgeBaseData } from '../actions';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Project, DocAlbum } from '@/types';
import { useState, useEffect } from 'react';

export default function NewGlobalDocumentPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [linkableProjects, setLinkableProjects] = useState<Pick<Project, 'uuid' | 'name'>[]>([]);
  const [albums, setAlbums] = useState<DocAlbum[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoadingData(true);
            try {
                const [projects, knowledgeBaseData] = await Promise.all([
                    getLinkableProjectsForUserAction(),
                    getKnowledgeBaseData()
                ]);
                setLinkableProjects(projects);
                setAlbums(knowledgeBaseData.albums);
            } catch (error) {
                 toast({ variant: "destructive", title: "Error", description: "Failed to load necessary data." });
            } finally {
                setIsLoadingData(false);
            }
        }
    }
    if (!authLoading && user) {
        loadData();
    } else if (!authLoading && !user) {
        router.push('/login');
    }
  }, [user, authLoading, router]);

  const { toast } = useToast();

  const handleCancel = () => {
    router.push(`/documentation`);
  };

  const handleSave = async (data: { title: string, content: string, tagsString?: string, linkedProjectUuid?: string | null, albumUuid?: string | null }) => {
    const result = await saveGlobalDocumentAction(null, data.title, data.content, data.tagsString, data.linkedProjectUuid, data.albumUuid);
    if (result.error) {
      return { error: result.error };
    }
    return { savedEntity: result.document };
  };

  if (authLoading || isLoadingData) {
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
        linkableProjects={linkableProjects}
        albums={albums}
      />
    </div>
  );
}
