
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Megaphone, PlusCircle, Loader2 } from "lucide-react";
import type { Project, ProjectMemberRole, User } from '@/types';
// Mock data - replace with actual data fetching and state management
const projectAnnouncements: any[] = [];

interface ProjectAnnouncementsPageProps {
  project: Project; // Passed from layout
  currentUserRole: ProjectMemberRole | null; // Passed from layout
  projectUuid: string; // Passed from layout
  user: User; // Passed from layout
}

export default function ProjectAnnouncementsPage({ project, currentUserRole, projectUuid }: ProjectAnnouncementsPageProps) {
  
  const canManageAnnouncements = currentUserRole === 'owner' || currentUserRole === 'co-owner';

  if (!project) {
    return <div className="flex items-center justify-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> Loading project data...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Project Announcements ({projectAnnouncements.length})</CardTitle>
        {canManageAnnouncements && (
          <Button size="sm" onClick={() => { /* TODO: Open create announcement dialog */ }}>
            <PlusCircle className="mr-2 h-4 w-4"/> New Project Announcement
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {projectAnnouncements.length > 0 ? projectAnnouncements.map((ann: any) => (
          <Card key={ann.uuid} className="p-3 mb-3">
            <h4 className="font-semibold">{ann.title}</h4>
            <p className="text-sm text-muted-foreground">{ann.content}</p>
            <p className="text-xs text-muted-foreground mt-1">
              By: {ann.authorUuid} on {new Date(ann.createdAt).toLocaleDateString()}
            </p>
          </Card>
        )) : (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="mx-auto h-12 w-12 mb-4" />
            <p>No announcements for this project yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
