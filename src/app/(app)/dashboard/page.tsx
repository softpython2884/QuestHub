
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, CheckCircle2, ListChecks, BarChart3, PieChart, Users, AlertTriangle, FolderKanban, Megaphone } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Mock data - replace with actual data fetching
const mockProjects = [
  { uuid: 'project-uuid-alpha', name: 'Project Alpha', taskCount: 5, status: 'In Progress', progress: 60, updatedAt: new Date().toISOString() },
  { uuid: 'project-uuid-beta', name: 'Project Beta', taskCount: 8, status: 'On Hold', progress: 20, updatedAt: new Date().toISOString() },
  { uuid: 'project-uuid-gamma', name: 'Project Gamma', taskCount: 3, status: 'Completed', progress: 100, updatedAt: new Date().toISOString() },
];

const mockTasks = [
  { id: 't1', title: 'Design homepage', project: 'Project Alpha', dueDate: 'Tomorrow' },
  { id: 't2', title: 'Develop API endpoints', project: 'Project Beta', dueDate: 'Next week' },
  { id: 't3', title: 'User testing session', project: 'Project Gamma', dueDate: 'Today' },
];

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    // You might want to show a more sophisticated loading skeleton here
    // For now, returning null or a simple loader if auth is still loading.
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <PlusCircle className="h-12 w-12 animate-spin text-primary" /> {/* Using PlusCircle as a placeholder spinner */}
        </div>
    );
  }


  return (
    <div className="space-y-8">
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-headline text-primary">
            Welcome back, {user.name}!
          </CardTitle>
          <CardDescription className="text-lg">
            Here&apos;s what&apos;s happening in your NationQuest Hub workspace today.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Button asChild>
            <Link href="/projects/new">
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Project
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProjects.filter(p => p.status !== 'Completed').length}</div>
            <p className="text-xs text-muted-foreground">
              {mockProjects.length} total projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due Soon</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockTasks.filter(t => t.dueDate === 'Today' || t.dueDate === 'Tomorrow').length}</div>
            <p className="text-xs text-muted-foreground">
              Across all active projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div> {/* Mocked */}
            <p className="text-xs text-muted-foreground">
              +5 this week
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Projects Overview</CardTitle>
            <CardDescription>Quick look at your key projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockProjects.slice(0,3).map((project) => (
              <div key={project.uuid} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.taskCount} tasks - {project.status}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.uuid}`}>View</Link>
                </Button>
              </div>
            ))}
             <Button variant="link" asChild className="w-full mt-2">
              <Link href="/projects">View All Projects</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Your most pressing to-dos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockTasks.slice(0,3).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.project} - Due: {task.dueDate}</p>
                </div>
                <Button variant="ghost" size="sm">Details</Button>
              </div>
            ))}
            <Button variant="link" asChild className="w-full mt-2">
              <Link href="/tasks">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <BarChart3 className="h-12 w-12 text-primary mb-4" />
          <CardTitle>Activity Graph</CardTitle>
          <CardDescription className="mt-2">
            (Placeholder for project activity trends)
          </CardDescription>
           <Image src="https://placehold.co/600x300.png" alt="Placeholder Activity Graph" width={600} height={300} className="mt-4 rounded-md opacity-50" data-ai-hint="data graph" />
        </Card>
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <PieChart className="h-12 w-12 text-accent mb-4" />
          <CardTitle>Task Status Chart</CardTitle>
          <CardDescription className="mt-2">
            (Placeholder for task distribution by status)
          </CardDescription>
          <Image src="https://placehold.co/600x300.png" alt="Placeholder Task Status Chart" width={600} height={300} className="mt-4 rounded-md opacity-50" data-ai-hint="pie chart" />
        </Card>
      </div>
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Team Announcements</CardTitle>
          <CardDescription>Latest updates from your team.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for announcements */}
          <div className="border rounded-lg p-4 text-center text-muted-foreground">
            <Megaphone className="h-8 w-8 mx-auto mb-2" />
            No new announcements.
            <Button variant="link" className="block mx-auto mt-2" asChild>
              <Link href="/announcements">View All Announcements</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
