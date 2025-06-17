
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, Filter, FolderKanban, Flame } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback } from "react";
import type { Project } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { fetchProjectsAction } from "./actions";
import { cn } from "@/lib/utils";


export default function ProjectsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
                <Card 
                  key={project.uuid} 
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
                    <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                       <Link href={`/projects/${project.uuid}`}>View Details</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

