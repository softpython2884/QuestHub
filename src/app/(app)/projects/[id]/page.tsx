
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit3, PlusCircle, Trash2, CheckSquare, FileText, Megaphone, Users, Settings as SettingsIcon, FolderGit2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Project, Task, Document as ProjectDocumentType, Announcement, Tag as TagType } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { flagApiKeyRisks } from '@/ai/flows/flag-api-key-risks';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getProjectByUuid as dbGetProjectByUuid, getUserByUuid as dbGetUserByUuid } from '@/lib/db';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';

// Mock data for sub-entities (tasks, documents, announcements, tags)
const mockTasks: Task[] = [
    { id: 'task-mock-1', uuid: 'task-uuid-mock-1', title: 'Define MVP features', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', status: 'Done', assigneeUuid: 'user-uuid-1', tags: [{id: 'tag-mock-1', uuid: 'tag-uuid-mock-1', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', name: 'Planning', color: 'bg-blue-500'}], createdAt: '2023-01-01', updatedAt: '2023-01-02'},
    { id: 'task-mock-2', uuid: 'task-uuid-mock-2', title: 'Design UI/UX mockups', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', status: 'In Progress', assigneeUuid: 'user-uuid-2', tags: [{id: 'tag-mock-2', uuid: 'tag-uuid-mock-2', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', name: 'Design', color: 'bg-purple-500'}], createdAt: '2023-01-05', updatedAt: '2023-01-10'},
];
const mockDocuments: ProjectDocumentType[] = [
    { id: 'doc-mock-1', uuid: 'doc-uuid-mock-1', title: 'Project Proposal V1.pdf', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', content: 'Initial project proposal details...', tags: [], createdAt: '2023-01-01', updatedAt: '2023-01-01'},
];
const mockAnnouncements: Announcement[] = [
    { id: 'ann-mock-1', uuid: 'ann-uuid-mock-1', title: 'Project Kick-off Meeting', content: 'Team, our kick-off meeting is scheduled for next Monday at 10 AM.', authorUuid: 'user-uuid-1', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', isGlobal: false, createdAt: '2023-01-02', updatedAt: '2023-01-02' },
];
const mockTags: TagType[] = [{id: 'tag-high-mock', uuid: 'tag-uuid-high-mock', projectUuid: 'CURRENT_PROJECT_UUID_PLACEHOLDER', name: 'High Priority', color: 'bg-red-500'}];

const taskStatuses: Task['status'][] = ['To Do', 'In Progress', 'Done', 'Archived'];

async function fetchProjectAction(uuid: string | undefined): Promise<Project | null> {
  'use server';
  if (!uuid) return null;
  try {
    const project = await dbGetProjectByUuid(uuid);
    if (!project) return null;
    // Potentially fetch owner's name here if needed directly on project object
    // For now, ownerUuid is sufficient for client-side check
    return project;
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return null;
  }
}

async function fetchProjectOwnerNameAction(ownerUuid: string | undefined) : Promise<string | null> {
    'use server';
    if(!ownerUuid) return null;
    const owner = await dbGetUserByUuid(ownerUuid);
    return owner?.name || null;
}


export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectUuid = params.id as string;
  
  const { user, isLoading: authLoading } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [projectOwnerName, setProjectOwnerName] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [newDocContent, setNewDocContent] = useState('');
  const [apiKeyRisk, setApiKeyRisk] = useState<string | null>(null);

  const loadProjectData = useCallback(async () => {
    if (projectUuid && user) { // Ensure user is loaded too for owner check
      setIsLoadingData(true);
      try {
        const projectData = await fetchProjectAction(projectUuid);
        setProject(projectData);
        if (projectData?.ownerUuid) {
            const ownerName = await fetchProjectOwnerNameAction(projectData.ownerUuid);
            setProjectOwnerName(ownerName);
        }
      } catch (err) {
        console.error("Error fetching project on client:", err);
        setProject(null);
        toast({variant: "destructive", title: "Error", description: "Could not load project details."})
      } finally {
        setIsLoadingData(false);
      }
    } else if (!authLoading && !user) {
        router.push('/login');
    }
  }, [projectUuid, user, authLoading, router, toast]);

  useEffect(() => {
    loadProjectData();
  }, [loadProjectData]);


  const handleContentChange = async (content: string) => {
    setNewDocContent(content);
    if(content.trim().length > 10) { 
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
      }
    } else {
      setApiKeyRisk(null);
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-36 mb-4" />
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-5 w-3/4 mt-2" /> {/* Increased top margin */}
             <div className="mt-3 flex flex-wrap gap-2"> {/* Increased top margin */}
                <Skeleton className="h-6 w-20 rounded-full" /> {/* Increased height */}
                <Skeleton className="h-6 w-24 rounded-full" /> {/* Increased height */}
              </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2"> {/* Added padding top */}
                <div><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-5 w-24" /></div>
                <div><Skeleton className="h-4 w-20 mb-1" /><Skeleton className="h-5 w-12" /></div>
                <div><Skeleton className="h-4 w-16 mb-1" /><Skeleton className="h-5 w-28" /></div>
                <div><Skeleton className="h-4 w-24 mb-1" /><Skeleton className="h-5 w-28" /></div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-full" /> 
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card> 
      </div>
    );
  }


  if (!project) {
    return (
        <div className="space-y-6 text-center">
             <Button variant="outline" onClick={() => router.back()} className="mb-4 mr-auto block">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Button>
            <FolderKanban className="mx-auto h-16 w-16 text-muted-foreground mt-12" />
            <h2 className="text-2xl font-semibold mt-4">Project Not Found</h2>
            <p className="text-muted-foreground">The project (ID: {projectUuid}) could not be found or you may not have permission to view it.</p>
        </div>
    );
  }
  
  // TODO: Replace with actual data fetched based on project.uuid
  const projectTasks = mockTasks; 
  const projectDocuments = mockDocuments;
  const projectAnnouncements = mockAnnouncements;
  const projectTags = mockTags;


  const isOwner = user?.uuid === project.ownerUuid;

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => router.back()} className="mb-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
      </Button>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <CardTitle className="text-3xl font-headline">{project.name}</CardTitle>
              <CardDescription className="mt-1">{project.description || "No description provided."}</CardDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                {projectTags.map(tag => ( 
                  <Badge key={tag.uuid} style={{ backgroundColor: tag.color }} className="text-white">{tag.name}</Badge>
                ))}
              </div>
            </div>
            {isOwner && (
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" disabled><Edit3 className="mr-2 h-4 w-4" /> Edit</Button>
                <Button variant="destructive" size="sm" disabled><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm pt-2">
                <div><strong className="block text-muted-foreground">Owner:</strong> {projectOwnerName || project.ownerUuid}</div>
                <div><strong className="block text-muted-foreground">Members:</strong> {/* Placeholder */} 1</div>
                <div><strong className="block text-muted-foreground">Created:</strong> {new Date(project.createdAt).toLocaleDateString()}</div>
                <div><strong className="block text-muted-foreground">Last Update:</strong> {new Date(project.updatedAt).toLocaleDateString()}</div>
            </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          <TabsTrigger value="tasks"><CheckSquare className="mr-2 h-4 w-4"/>Tasks</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-2 h-4 w-4"/>Documents</TabsTrigger>
          <TabsTrigger value="announcements"><Megaphone className="mr-2 h-4 w-4"/>Announcements</TabsTrigger>
          <TabsTrigger value="repository"><FolderGit2 className="mr-2 h-4 w-4"/>Repository</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="mr-2 h-4 w-4"/>Team & Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Tasks ({projectTasks.length})</CardTitle>
              <Button size="sm" disabled><PlusCircle className="mr-2 h-4 w-4"/> Add Task</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectTasks.map(task => (
                  <Card key={task.uuid} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{task.title}</h4>
                        <p className="text-xs text-muted-foreground">Assigned to: {task.assigneeUuid || 'Unassigned'}</p>
                         <div className="mt-1 flex flex-wrap gap-1">
                            {task.tags.map(tag => (
                                <Badge key={tag.uuid} variant="secondary" style={{ backgroundColor: tag.color }} className="text-xs text-white">{tag.name}</Badge>
                            ))}
                        </div>
                      </div>
                      <Select defaultValue={task.status} disabled>
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
                 {projectTasks.length === 0 && <p className="text-muted-foreground text-center py-4">No tasks in this project yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Documents ({projectDocuments.length})</CardTitle>
              <Button size="sm" disabled><PlusCircle className="mr-2 h-4 w-4"/> Add Document</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {projectDocuments.map(doc => (
                  <Card key={doc.uuid} className="p-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{doc.title}</span>
                    </div>
                    <Button variant="ghost" size="sm" disabled>View</Button>
                  </Card>
                ))}
                 {projectDocuments.length === 0 && <p className="text-muted-foreground text-center py-4">No documents in this project yet.</p>}
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
              <CardTitle>Announcements ({projectAnnouncements.length})</CardTitle>
              {isOwner && <Button size="sm" disabled><PlusCircle className="mr-2 h-4 w-4"/> New Announcement</Button>}
            </CardHeader>
            <CardContent>
              {projectAnnouncements.length > 0 ? projectAnnouncements.map(ann => (
                <Card key={ann.uuid} className="p-3 mb-3">
                  <h4 className="font-semibold">{ann.title}</h4>
                  <p className="text-sm text-muted-foreground">{ann.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">By: {ann.authorUuid} on {new Date(ann.createdAt).toLocaleDateString()}</p>
                </Card>
              )) : <p className="text-muted-foreground text-center py-4">No announcements for this project yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repository" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Project Repository</CardTitle></CardHeader>
            <CardContent>
              <div className="border p-6 rounded-md text-center text-muted-foreground">
                <FolderGit2 className="mx-auto h-12 w-12 mb-3" />
                <p>Repository feature (GitHub-like integration or file management) is planned for a future update.</p>
                <p className="text-xs mt-1">This section will allow you to manage project code, files, and versions.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Team & Project Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6"> {/* Increased spacing */}
              <div>
                <h4 className="font-semibold mb-2 text-lg">Manage Team Members</h4>
                <div className="border p-4 rounded-md text-muted-foreground">
                    <p>Currently, only the project owner ({projectOwnerName || 'Loading...'}) has access.</p>
                    <p className="text-xs mt-2">Full team management (inviting users, assigning roles like 'co-owner', 'editor', 'viewer') is coming soon.</p>
                    {isOwner && <Button className="mt-3" size="sm" disabled><Users className="mr-2 h-4 w-4"/>Invite Members</Button> }
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-lg">Project Tags</h4>
                 <div className="border p-4 rounded-md text-muted-foreground">
                    <p>Project-specific tag management (creating, editing, deleting tags) is planned.</p>
                    {isOwner && <Button className="mt-3" size="sm" disabled><PlusCircle className="mr-2 h-4 w-4"/>Manage Tags</Button>}
                 </div>
              </div>
               {isOwner && (
                <div>
                    <h4 className="font-semibold mb-2 text-lg">Project Details & Privacy</h4>
                    <div className="border p-4 rounded-md text-muted-foreground">
                        <p>Editing project name, description, and privacy settings (e.g., making project public or private to specific roles/users) will be available here.</p>
                        <Button className="mt-3" size="sm" disabled><Edit3 className="mr-2 h-4 w-4"/>Edit Details</Button>
                    </div>
                </div>
               )}
               {isOwner && (
                <div>
                    <h4 className="font-semibold mb-2 text-lg text-destructive">Danger Zone</h4>
                    <div className="border border-destructive p-4 rounded-md ">
                        <p className="text-destructive">Deleting a project is permanent and cannot be undone.</p>
                        <Button variant="destructive" className="mt-3" size="sm" disabled><Trash2 className="mr-2 h-4 w-4"/>Delete Project</Button>
                    </div>
                </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
