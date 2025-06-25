'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CheckCircle, GitCommit, ListChecks, User, Github } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Cell } from 'recharts';

const AnimationStep = ({ step, currentStep, children, className, delay = 0 }: { step: number; currentStep: number; children: React.ReactNode; className?: string; delay?: number }) => (
  <div className={cn('transition-all duration-700 ease-in-out', currentStep >= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5', className)} style={{ transitionDelay: `${delay}ms`}}>
    {children}
  </div>
);

const commitData = [
  { day: "Mon", commits: 4 }, { day: "Tue", commits: 8 }, { day: "Wed", commits: 15 },
  { day: "Thu", commits: 5 }, { day: "Fri", commits: 12 }, { day: "Sat", commits: 2 }, { day: "Sun", commits: 0 },
];

const taskData = [
  { name: 'Features', value: 400, color: 'hsl(var(--chart-1))' },
  { name: 'Bugs', value: 300, color: 'hsl(var(--chart-2))' },
  { name: 'Refactors', value: 300, color: 'hsl(var(--chart-3))' },
  { name: 'Docs', value: 200, color: 'hsl(var(--chart-4))' },
];

export default function PresentationPage5() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts = Array.from({ length: 4 }).map((_, i) => setTimeout(() => setStep(i + 1), i * 1200));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <AnimationStep step={1} currentStep={step} className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Your Productivity Hub</h1>
          <p className="text-xl text-muted-foreground mt-4">Stay on top of your work and celebrate your progress.</p>
        </AnimationStep>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <AnimationStep step={2} currentStep={step} className="lg:col-span-1">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10 h-full">
              <CardContent className="p-6 text-center flex flex-col items-center justify-center h-full">
                <Avatar className="h-28 w-28 mb-4 ring-4 ring-primary ring-offset-4 ring-offset-background">
                  <AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="female portrait" /><AvatarFallback className="text-4xl">AD</AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold">Alex Durand</h2>
                <p className="text-muted-foreground">Senior Software Engineer</p>
                 <a href="#" className="text-sm text-primary hover:underline flex items-center justify-center gap-1 pt-2"><Github className="h-4 w-4"/>alex-durand</a>
                 <Button className="w-full mt-6">View Public Profile</Button>
              </CardContent>
            </Card>
          </AnimationStep>

          {/* Stats & Graphs */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
               <AnimationStep step={3} currentStep={step} delay={0}>
                  <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                      <CheckCircle className="text-green-500" />
                    </CardHeader>
                    <CardContent><div className="text-4xl font-bold">1,254</div><p className="text-xs text-muted-foreground">+12% from last month</p></CardContent>
                  </Card>
               </AnimationStep>
               <AnimationStep step={3} currentStep={step} delay={200}>
                  <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Commits This Week</CardTitle>
                      <GitCommit className="text-primary"/>
                    </CardHeader>
                    <CardContent><div className="text-4xl font-bold">42</div><p className="text-xs text-muted-foreground">Peak on Wednesday</p></CardContent>
                  </Card>
               </AnimationStep>
            </div>
             <AnimationStep step={4} currentStep={step} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><GitCommit /> Weekly Commits</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                             <BarChart data={commitData}>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{fill: 'hsl(var(--accent) / 0.3)'}} />
                                <Bar dataKey="commits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} axisLine={false} tickLine={false}/>
                             </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                 <Card className="bg-card/60 backdrop-blur-sm border-white/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks /> Task Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={taskData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                {taskData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </AnimationStep>
          </div>
        </div>
      </div>
    </div>
  );
}
