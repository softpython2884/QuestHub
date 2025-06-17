
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Search, Filter, FolderKanban } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

// Mock data for projects
const mockProjects = [
  { id: "proj-1", name: "Project Alpha", description: "Innovative new platform for AI content generation.", status: "In Progress", teamSize: 5, lastUpdate: "2 days ago" },
  { id: "proj-2", name: "Project Beta", description: "Mobile application for task management.", status: "Planning", teamSize: 3, lastUpdate: "5 days ago" },
  { id: "proj-3", name: "Project Gamma", description: "Website redesign for e-commerce client.", status: "Completed", teamSize: 7, lastUpdate: "1 week ago" },
  { id: "proj-4", name: "Project Delta", description: "Internal tooling for DevOps automation.", status: "On Hold", teamSize: 2, lastUpdate: "3 weeks ago" },
];


export default function ProjectsPage() {
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
            <CardTitle>All Projects</CardTitle>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search projects..." className="pl-8 w-full sm:w-[200px] lg:w-[300px]" />
              </div>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {mockProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by creating a new project.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/projects/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Project
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="hover:text-primary">
                      <Link href={`/projects/${project.id}`}>{project.name}</Link>
                    </CardTitle>
                    <CardDescription className="truncate h-10">{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Status: <span className="font-medium text-foreground">{project.status}</span></p>
                      <p>Team Size: <span className="font-medium text-foreground">{project.teamSize}</span></p>
                      <p>Last Update: <span className="font-medium text-foreground">{project.lastUpdate}</span></p>
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                       <Link href={`/projects/${project.id}`}>View Details</Link>
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
