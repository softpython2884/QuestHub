'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit3, PlusCircle, Trash2, CheckSquare, FileText, Megaphone, TagIcon, Users } from 'lucide-react';
import Link from 'next/link';
import type { Project, Task, Document, Announcement, Tag as TagType } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { flagApiKeyRisks } from '@/ai/flows/flag-api-key-risks';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

// Mock data for a single project - replace with actual data fetching
const mockProjectData: Project = {
  id: 'proj-1',
  name: 'Project Alpha',
  description: 'This is an innovative new platform designed for AI content generation. It aims to revolutionize how creators approach content workflows by providing intelligent assistance and automation tools.',
  ownerId: 'user-1',
  memberIds: ['user-1', 'user-2', 'user-3'],
  tasks: [
    { id: 'task-1', title: 'Define MVP features', projectId: 'proj-1', status: 'Done', assigneeId: 'user-1', tags: [{id: 'tag-1', name: 'Planning', color: 'bg-blue-500'}], createdAt: '2023-01-01', updatedAt: '2023-01-02'},
    { id: 'task-2', title: 'Design UI/UX mockups', projectId: 'proj-1', status: 'In Progress', assigneeId: 'user-2', tags: [{id: 'tag-2', name: 'Design', color: 'bg-purple-500'}], createdAt: '2023-01-05', updatedAt: '2023-01-10'},
    { id: 'task-3', title: 'Develop core API', projectId: 'proj-1', status: 'To Do', assigneeId: 'user-3', tags: [{id: 'tag-3', name: 'Development', color: 'bg-green-500'}], createdAt: '2023-01-15', updatedAt: '2023-01-15'},
  ],
  documents: [
    { id: 'doc-1', title: 'Project Proposal V1.pdf', projectId: 'proj-1', content: 'Initial project proposal details...', tags: [], createdAt: '2023-01-01', updatedAt: '2023-01-01'},
    { id: 'doc-2', title: 'Technical Specification.md', projectId: 'proj-1', content: '# Tech Spec...', tags: [], createdAt: '2023-01-10', updatedAt: '2023-01-10'},
  ],
  announcements: [
    { id: 'ann-1', title: 'Project Kick-off Meeting', content: 'Team, our kick-off meeting is scheduled for next Monday at 10 AM.', authorId: 'user-1', projectId: 'proj-1', isGlobal: false, createdAt: '2023-01-02', updatedAt: '2023-01-02' },
  ],
  tags: [{id: 'tag-high', name: 'High Priority', color: 'bg-red-500'}],
  createdAt: '2023-01-01T10:00:00Z',
  updatedAt: '2023-01-15T14:30:00Z',
};

const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Archived'];


export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const project = mockProjectData; // In a real app, fetch project by ID

  const [newDocContent, setNewDocContent] = useState('');
  const [apiKeyRisk, setApiKeyRisk] = useState<string | null>(null);


  const handleContentChange = async (content: string) => {
    setNewDocContent(content);
    if(content.trim().length > 10) { // Basic check to avoid spamming AI
      try {
        const riskResult = await flagApiKeyRisks({ text: content });
        if (riskResult.flagged) {
          setApiKeyRisk(riskResult.reason || "Potential API key or secret detected. Remember to use the Secure Vault for sensitive information.");
           toast({
            variant: "destructive",
            title: "Security Alert",
            description: riskResult.reason || "Potential API key or secret detected in the content. Please use the Secure Vault.",
          });
        } else {
          setApiKeyRisk(null);
        }
      } catch (error) {
        console.error("Error flagging API key risks:", error);
        // Optionally notify user about the error in risk scanning
      }
    } else {
      setApiKeyRisk(null);
    }
  };


  if (!project) {
    // TODO: Add a not found component or redirect
    return <p>Project not found.</p>;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-3xl font-headline">{project.name}</CardTitle>
              <CardDescription className="mt-1">{project.description}</CardDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                {project.tags.map(tag => (
                  <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white">{tag.name}</Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="outline" size="sm"><Edit3 className="mr-2 h-4 w-4" /> Edit</Button>
              <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><strong className="block text-muted-foreground">Owner:</strong> {project.ownerId}</div>
                <div><strong className="block text-muted-foreground">Members:</strong> {project.memberIds.length}</div>
                <div><strong className="block text-muted-foreground">Created:</strong> {new Date(project.createdAt).toLocaleDateString()}</div>
                <div><strong className="block text-muted-foreground">Last Update:</strong> {new Date(project.updatedAt).toLocaleDateString()}</div>
            </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="tasks"><CheckSquare className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4"/>Documents</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4"/>Announcements</TabsTrigger>
          <TabsTrigger value="settings"><Users className="mr-2 h-4 w-4"/>Team & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Tasks ({project.tasks.length})</CardTitle>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Task</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.tasks.map(task => (
                  <Card key={task.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{task.title}</h4>
                        <p className="text-xs text-muted-foreground">Assigned to: {task.assigneeId || 'Unassigned'}</p>
                         <div className="mt-1 flex flex-wrap gap-1">
                            {task.tags.map(tag => (
                                <Badge key={tag.id} variant="secondary" style={{ backgroundColor: tag.color }} className="text-xs text-white">{tag.name}</Badge>
                            ))}
                        </div>
                      </div>
                      <Select defaultValue={task.status}>
                        <SelectTrigger className="w-[150px] text-xs h-8">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {taskStatuses.map(status => (
                            <SelectItem key={status} value={status} className="text-xs">{status}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Documents ({project.documents.length})</CardTitle>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Document</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {project.documents.map(doc => (
                  <Card key={doc.id} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                    <Button variant="ghost" size="sm">View</Button>
                  </Card>
                ))}
              </div>
              <div className="mt-6">
                <h4 className="font-semibold mb-2">Add New Document Content (AI Security Check Demo)</h4>
                <Textarea 
                  placeholder="Paste or type document content here. Potential API keys will be flagged."
                  value={newDocContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  rows={5}
                  className={apiKeyRisk ? "border-destructive ring-2 ring-destructive" : ""}
                />
                {apiKeyRisk && <p className="text-sm text-destructive mt-1">{apiKeyRisk}</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Announcements ({project.announcements.length})</CardTitle>
              <Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/> New Announcement</Button>
            </CardHeader>
            <CardContent>
              {project.announcements.length > 0 ? project.announcements.map(ann => (
                <Card key={ann.id} className="p-3 mb-3">
                  <h4 className="font-semibold">{ann.title}</h4>
                  <p className="text-sm text-muted-foreground">{ann.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">By: {ann.authorId} on {new Date(ann.createdAt).toLocaleDateString()}</p>
                </Card>
              )) : <p className="text-muted-foreground">No announcements for this project.</p>}
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Team & Project Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Manage Team Members</h4>
                {/* Placeholder for team management */}
                <div className="border p-4 rounded-md text-center text-muted-foreground">Team management UI coming soon.</div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Manage Tags</h4>
                 {/* Placeholder for tag management */}
                <div className="border p-4 rounded-md text-center text-muted-foreground">Tag management UI coming soon.</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
