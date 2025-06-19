
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FolderGit2, Code2, Loader2 } from "lucide-react";
import type { Project, ProjectMemberRole, User } from '@/types';

interface ProjectCodeSpacePageProps {
  project: Project; // Passed from layout
  currentUserRole: ProjectMemberRole | null; // Passed from layout
  projectUuid: string; // Passed from layout
  user: User; // Passed from layout
}

export default function ProjectCodeSpacePage({ project }: ProjectCodeSpacePageProps) {

  if (!project) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><FolderGit2 className="mr-2 h-5 w-5 text-primary"/>CodeSpace for {project.name}</CardTitle>
        <CardDescription>Manage your project's code snippets, scripts, and version control links.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Code2 className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-lg font-medium">CodeSpace is Coming Soon!</h3>
          <p className="mt-1 text-sm">
            This area will allow you to link to repositories, manage small scripts,
            and keep track of code-related assets for your project.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
