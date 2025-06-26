
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, CheckCircle2, ListChecks, FolderKanban, Megaphone, Users, Loader2, BarChart3, PieChart as PieChartIcon, Info, Keyboard, DownloadCloud } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getDashboardDataAction, type DashboardData } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
      if (choiceResult.outcome === 'accepted') {
        toast({ title: "App Installed!", description: "FlowUp is now available on your device." });
      }
      setDeferredPrompt(null);
      setIsInstallable(false);
    });
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const loadDashboardData = async () => {
        if (!user) return;
        setIsLoading(true);
        const result = await getDashboardDataAction();
        if (result.data) {
            setDashboardData(result.data);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error loading dashboard',
                description: result.error || 'An unknown error occurred.',
            });
        }
        setIsLoading(false);
    }
    if (!authLoading && user) {
        loadDashboardData();
    }
  }, [authLoading, user, toast]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
           <Skeleton className="h-64 w-full" />
           <Skeleton className="h-64 w-full" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
           <Skeleton className="h-64 w-full" />
           <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user || !dashboardData) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" /> 
        </div>
    );
  }

  const { projects, tasks, announcements, activity } = dashboardData;
  const activeProjectCount = projects.length;
  const openTasks = tasks.filter(t => t.status === 'To Do' || t.status === 'In Progress');
  const completedTaskCount = tasks.filter(t => t.status === 'Done').length;
  const myUpcomingTasks = openTasks
    .filter(t => t.assigneeUuid === user.uuid)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  
  const taskStatusData = [
    { name: 'To Do', value: tasks.filter(t => t.status === 'To Do').length, fill: 'hsl(var(--chart-1))' },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'In Progress').length, fill: 'hsl(var(--chart-2))' },
    { name: 'Done', value: tasks.filter(t => t.status === 'Done').length, fill: 'hsl(var(--chart-3))' },
    { name: 'Archived', value: tasks.filter(t => t.status === 'Archived').length, fill: 'hsl(var(--chart-4))' },
  ].filter(item => item.value > 0);


  return (
    <div className="space-y-8">
      {isInstallable && !isStandalone && (
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DownloadCloud className="h-5 w-5"/> Install FlowUp</CardTitle>
            <CardDescription>Get a desktop-like experience by installing FlowUp on your device for faster access.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleInstallClick}>Install App</Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline sm:text-3xl text-primary">
            Welcome back, {user.name}!
          </CardTitle>
          <CardDescription className="text-base sm:text-lg">
            Here&apos;s what&apos;s happening in your FlowUp workspace today.
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
            <CardTitle className="text-sm font-medium">Your Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjectCount}</div>
            <p className="text-xs text-muted-foreground">
              Total projects you are a member of
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all your projects
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTaskCount}</div>
            <p className="text-xs text-muted-foreground">
             Total tasks marked as 'Done'
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Projects Overview</CardTitle>
            <CardDescription>Quick look at your recently updated projects.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.slice(0,3).map((project) => (
              <div key={project.uuid} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{tasks.filter(t => t.projectUuid === project.uuid).length} tasks</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${project.uuid}`}>View</Link>
                </Button>
              </div>
            ))}
            {projects.length === 0 && <p className="text-muted-foreground text-center py-4">You are not part of any projects yet.</p>}
             <Button variant="link" asChild className="w-full mt-2">
              <Link href="/projects">View All Projects</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Upcoming Tasks</CardTitle>
            <CardDescription>Your assigned tasks that are not yet completed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {myUpcomingTasks.map((task) => (
              <div key={task.uuid} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.projectName} - {task.status}</p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                   <Link href={`/projects/${task.projectUuid}?tab=tasks`}>Details</Link>
                </Button>
              </div>
            ))}
            {myUpcomingTasks.length === 0 && <p className="text-muted-foreground text-center py-4">You have no open assigned tasks. Great job!</p>}
            <Button variant="link" asChild className="w-full mt-2">
              <Link href="/projects">View All Tasks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5 text-primary"/>Recent Activity</CardTitle>
            <CardDescription>Tasks updated across your projects in the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
              <ResponsiveContainer>
                <BarChart data={activity} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><PieChartIcon className="mr-2 h-5 w-5 text-primary"/>Task Status Distribution</CardTitle>
            <CardDescription>A summary of task statuses across all your projects.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            {taskStatusData.length > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                    <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Pie>
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="text-center text-muted-foreground p-8">
                    <Info className="h-8 w-8 mx-auto mb-2" />
                    No tasks to display in the chart.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Team Announcements</CardTitle>
          <CardDescription>Latest updates from your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {announcements.length > 0 ? (
             <div className="space-y-3">
              {announcements.map((ann) => (
                <div key={ann.uuid} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="flex-shrink-0 pt-1"><Megaphone className="h-5 w-5 text-muted-foreground"/></div>
                  <div className="flex-grow">
                    <p className="font-semibold">{ann.title}</p>
                    <p className="text-xs text-muted-foreground">
                      In <span className="font-medium">{ann.projectName}</span> by {ann.authorName}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/projects/${ann.projectUuid}?tab=announcements`}>View</Link>
                  </Button>
                </div>
              ))}
              </div>
          ) : (
            <div className="border rounded-lg p-4 text-center text-muted-foreground">
              <Megaphone className="h-8 w-8 mx-auto mb-2" />
              No new announcements in your projects.
            </div>
          )}
          <Button variant="link" className="block mx-auto mt-4" asChild>
            <Link href="/announcements">View Global Announcements</Link>
          </Button>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Keyboard className="mr-2 h-5 w-5 text-primary"/>Keyboard Shortcuts</CardTitle>
            <CardDescription>Navigate FlowUp faster with these shortcuts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
            <span>Open Command Palette</span>
            <div className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono text-xs">⌘</Badge>
                <Badge variant="outline" className="font-mono text-xs">K</Badge>
            </div>
            </div>
            <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-md">
            <span>Toggle Sidebar</span>
            <div className="flex items-center gap-1">
                <Badge variant="outline" className="font-mono text-xs">⌘</Badge>
                <Badge variant="outline" className="font-mono text-xs">B</Badge>
            </div>
            </div>
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
