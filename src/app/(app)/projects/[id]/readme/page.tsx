
'use client';

import { useState, useEffect, useCallback, startTransition as ReactStartTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { Project, ProjectMemberRole, User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { saveProjectReadmeAction, type SaveProjectReadmeFormState } from '../actions';
import { useActionState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProjectReadmePageProps {
  project: Project; // Passed from layout
  currentUserRole: ProjectMemberRole | null; // Passed from layout
  projectUuid: string; // Passed from layout
  user: User; // Passed from layout
}

export default function ProjectReadmePage({ project: initialProject, currentUserRole, projectUuid }: ProjectReadmePageProps) {
  const { toast } = useToast();
  const [project, setProject] = useState<Project>(initialProject);
  const [projectReadmeContent, setProjectReadmeContent] = useState('');

  const [saveReadmeState, saveReadmeFormAction, isSaveReadmePending] = useActionState(saveProjectReadmeAction, { message: "", error: "" });

  useEffect(() => {
    if (project) {
      setProjectReadmeContent(project.readmeContent || '');
    }
  }, [project]);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);


  useEffect(() => {
    if (!isSaveReadmePending && saveReadmeState) {
        if (saveReadmeState.message && !saveReadmeState.error) {
            toast({ title: "Success", description: saveReadmeState.message });
            if(saveReadmeState.project) {
                setProject(saveReadmeState.project);
                setProjectReadmeContent(saveReadmeState.project.readmeContent || '');
            }
        }
        if (saveReadmeState.error) {
            toast({ variant: "destructive", title: "README Error", description: saveReadmeState.error });
        }
    }
  }, [saveReadmeState, isSaveReadmePending, toast]);

  const handleSaveReadme = () => {
    if (!project) return;
    const formData = new FormData();
    formData.append('projectUuid', project.uuid);
    formData.append('readmeContent', projectReadmeContent);
    ReactStartTransition(() => {
      saveReadmeFormAction(formData);
    });
  };

  const canEditReadme = currentUserRole === 'owner' || currentUserRole === 'co-owner' || currentUserRole === 'editor';

  if (!project) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project data...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Project README</CardTitle>
          <CardDescription>
            Overview, setup instructions, or other important project information. Supports Markdown.
          </CardDescription>
        </div>
         <Button onClick={handleSaveReadme} disabled={isSaveReadmePending || !canEditReadme}>
          {isSaveReadmePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save README
        </Button>
      </CardHeader>
      <CardContent>
        <div className="prose dark:prose-invert max-w-none p-4 border rounded-md mb-4 min-h-[100px] bg-background/30">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {projectReadmeContent || ''}
          </ReactMarkdown>
        </div>
        <Textarea
          placeholder="Write your project README here using Markdown..."
          value={projectReadmeContent}
          onChange={(e) => setProjectReadmeContent(e.target.value)}
          rows={20}
          className="font-mono"
          disabled={!canEditReadme}
        />
        {saveReadmeState?.error && <p className="text-sm text-destructive mt-2">{saveReadmeState.error}</p>}
      </CardContent>
    </Card>
  );
}
