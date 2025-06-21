
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, Filter, FolderKanban, Flame, MoreHorizontal, Copy, Link as LinkIcon, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback, useActionState } from "react";
import type { Project, DuplicateProjectFormState } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { fetchProjectsAction } from "./actions";
import { duplicateProjectAction } from "./[id]/actions";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";


export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [projectToDuplicate, setProjectToDuplicate] = useState<Project | null>(null);
  const [duplicateFormState, duplicateFormAction, isDuplicating] = useActionState(duplicateProjectAction, { message: "", error: ""});


  const loadProjects = useCallback(async () => {
    if (user && !authLoading) {
      setIsLoadingProjects(true);
      try {
        const data = await fetchProjectsAction(user.uuid);
        setProjects(data);
      } catch (err) {
        console.error("Error fetching projects on client:", err);
        setProjects([]); 
      } finally {
        setIsLoadingProjects(false);
      }
    } else if (!authLoading && !user) {
      setIsLoadingProjects(false);
      setProjects([]); 
      router.push('/login'); 
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!isDuplicating && duplicateFormState) {
        if (duplicateFormState.message && !duplicateFormState.error) {
            toast({ title: "Success!", description: duplicateFormState.message });
            setProjectToDuplicate(null); // Close dialog
            loadProjects(); // Refresh the list
        }
        if (duplicateFormState.error) {
            toast({ variant: "destructive", title: "Duplication Error", description: duplicateFormState.error });
        }
    }
  }, [duplicateFormState, isDuplicating, toast, loadProjects]);

  if (authLoading && isLoadingProjects) { 
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-64 mt-1" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <Skeleton className="h-7 w-24" />
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Skeleton className="h-9 w-full sm:w-[200px] lg:w-[300px]" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => (
              <Card key={i}>
                <CardHeader> <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-4 w-full mt-1" />  <Skeleton className="h-4 w-1/2 mt-1" /> </CardHeader>
                <CardContent> <Skeleton className="h-8 w-full mt-2" /> </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-semibold">Projects</h1>
          <p className="text-muted-foreground">Manage all your team's projects from one place.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Project
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>My Projects ({filteredProjects.length})</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search projects..." 
                  className="pl-8 w-full sm:w-[200px] lg:w-[300px]" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingProjects ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => (
                <Card key={i}>
                    <CardHeader> <Skeleton className="h-6 w-3/4" /> <Skeleton className="h-10 w-full mt-1" /> </CardHeader>
                    <CardContent> 
                        <Skeleton className="h-4 w-2/3 mb-1" />
                        <Skeleton className="h-4 w-1/2 mb-1" />
                        <Skeleton className="h-4 w-3/4 mb-3" />
                        <Skeleton className="h-9 w-full" /> 
                    </CardContent>
                </Card>
                ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">{searchTerm ? 'No projects match your search.' : 'No projects yet.'}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new project.'}
              </p>
              {!searchTerm && (
                <Button className="mt-6" asChild>
                  <Link href="/projects/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Project
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProjects.map((project) => (
                <Dialog key={project.uuid} open={projectToDuplicate?.uuid === project.uuid} onOpenChange={(open) => !open && setProjectToDuplicate(null)}>
                  <Card 
                    className={cn(
                      "hover:shadow-lg transition-shadow flex flex-col",
                      project.isUrgent && "border-destructive ring-1 ring-destructive"
                    )}
                  >
                    <CardHeader className="flex-grow">
                      <div className="flex justify-between items-start">
                        <CardTitle className="hover:text-primary">
                          <Link href={`/projects/${project.uuid}`}>{project.name}</Link>
                        </CardTitle>
                        {project.isUrgent && <Flame className="h-5 w-5 text-destructive flex-shrink-0" />}
                      </div>
                      <CardDescription className="h-12 overflow-hidden text-ellipsis line-clamp-2"> 
                        {project.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Owner: <span className="font-medium text-foreground">{project.ownerUuid === user?.uuid ? 'You' : 'Other'}</span></p>
                        <p>Updated: <span className="font-medium text-foreground">{new Date(project.updatedAt).toLocaleDateString()}</span></p>
                        <p>Status: <span className={cn("font-medium", project.isPrivate ? "text-foreground" : "text-green-600")}>{project.isPrivate ? 'Private' : 'Public'}</span></p>
                      </div>
                       <div className="mt-3">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="w-full">
                                    Actions <ChevronDown className="ml-auto h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <Link href={`/projects/${project.uuid}`}>
                                        <FolderKanban className="mr-2 h-4 w-4"/>
                                        <span>View Details</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => navigator.clipboard.writeText(`${window.location.origin}/projects/${project.uuid}`)}>
                                    <LinkIcon className="mr-2 h-4 w-4"/>
                                    <span>Copy Link</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setProjectToDuplicate(project); }}>
                                        <Copy className="mr-2 h-4 w-4"/>
                                        <span>Duplicate</span>
                                    </DropdownMenuItem>
                                </DialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                       </div>
                    </CardContent>
                  </Card>
                   <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Duplicate Project: {project.name}</DialogTitle>
                            <DialogDescription>
                                This will create a new project with a copy of all tasks, documents, and settings. Members and integrations will not be copied.
                            </DialogDescription>
                        </DialogHeader>
                        <form action={duplicateFormAction}>
                            <input type="hidden" name="originalProjectUuid" value={project.uuid} />
                            <div className="space-y-4 my-4">
                                {project.githubRepoUrl && (
                                    <div className="flex items-start space-x-3 rounded-md border p-3">
                                        <Checkbox id={`fork-repo-${project.uuid}`} name="forkGithubRepo" />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor={`fork-repo-${project.uuid}`}>
                                                Also fork the GitHub repository
                                            </Label>
                                            <p className="text-sm text-muted-foreground">
                                                This will fork <span className="font-mono bg-muted/50 px-1 py-0.5 rounded text-xs">{project.githubRepoName}</span> to your GitHub account. Requires a connected GitHub account.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="ghost" disabled={isDuplicating}>Cancel</Button></DialogClose>
                                <Button type="submit" disabled={isDuplicating}>
                                    {isDuplicating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Duplicate Project
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
