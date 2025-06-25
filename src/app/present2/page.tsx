'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, CheckSquare, ListChecks, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';

const AnimationStep = ({ step, currentStep, children, className }: { step: number; currentStep: number; children: React.ReactNode; className?: string; }) => (
  <div className={cn('transition-all duration-700 ease-in-out', currentStep >= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5', className)}>
    {children}
  </div>
);

const TaskCard = ({ title, tag, tagColor, userInitials }: { title: string; tag: string; tagColor: string; userInitials: string }) => (
  <Card className="p-3 bg-card/80 mb-2">
    <p className="font-medium text-sm">{title}</p>
    <div className="flex items-center justify-between mt-2">
      <Badge style={{ backgroundColor: tagColor, color: 'white' }}>{tag}</Badge>
      <Avatar className="h-6 w-6"><AvatarFallback>{userInitials}</AvatarFallback></Avatar>
    </div>
  </Card>
);

export default function PresentationPage2() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts = Array.from({ length: 5 }).map((_, i) => setTimeout(() => setStep(i + 1), i * 1500));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-12">
        <AnimationStep step={1} currentStep={step} className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight flex items-center justify-center gap-4"><FolderKanban className="text-primary h-12 w-12" /> Centralize Your Projects</h1>
          <p className="text-xl text-muted-foreground mt-4">Organize everything from tasks and documents to code, all in one place.</p>
        </AnimationStep>

        <AnimationStep step={2} currentStep={step}>
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 p-4 sm:p-6">
            <CardHeader className="p-2">
              <CardTitle className="text-2xl">Project: QuantumLeap AI</CardTitle>
              <CardDescription>An initiative to build the next-generation machine learning platform.</CardDescription>
            </CardHeader>
            <CardContent className="p-2 grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              {/* Kanban Board */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xl font-semibold">Kanban Board</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AnimationStep step={3} currentStep={step} className="p-3 bg-black/20 rounded-lg transition-delay-0">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><ListChecks /> To Do</h4>
                    <TaskCard title="Setup CI/CD pipeline" tag="DevOps" tagColor="#FDE047" userInitials="JD" />
                    <TaskCard title="User authentication research" tag="Backend" tagColor="#D946EF" userInitials="SA" />
                  </AnimationStep>
                  <AnimationStep step={3} currentStep={step} className="p-3 bg-black/20 rounded-lg transition-delay-200">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><ListChecks /> In Progress</h4>
                    <TaskCard title="Develop API endpoints for user data" tag="Backend" tagColor="#D946EF" userInitials="SA" />
                  </AnimationStep>
                   <AnimationStep step={3} currentStep={step} className="p-3 bg-black/20 rounded-lg transition-delay-400">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><CheckSquare /> Done</h4>
                     <TaskCard title="Initial project setup" tag="DevOps" tagColor="#FDE047" userInitials="JD" />
                  </AnimationStep>
                </div>
              </div>

              {/* Members & Readme */}
              <div className="space-y-6">
                <AnimationStep step={4} currentStep={step}>
                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2"><Users /> Team Members</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3"><Avatar><AvatarImage data-ai-hint="female portrait" src="https://placehold.co/40x40.png" /><AvatarFallback>SA</AvatarFallback></Avatar><div><p className="font-medium">Sarah Adams</p><p className="text-xs text-muted-foreground">Lead Developer</p></div></div>
                        <div className="flex items-center gap-3"><Avatar><AvatarImage data-ai-hint="male portrait" src="https://placehold.co/40x40.png" /><AvatarFallback>JD</AvatarFallback></Avatar><div><p className="font-medium">John Doe</p><p className="text-xs text-muted-foreground">DevOps Engineer</p></div></div>
                    </div>
                </AnimationStep>
                 <AnimationStep step={5} currentStep={step}>
                    <h3 className="text-xl font-semibold mb-2">README.md</h3>
                     <div className="p-4 bg-black/20 rounded-lg text-sm text-muted-foreground prose prose-sm prose-invert max-w-none">
                         <h4 className="text-white"># QuantumLeap AI</h4>
                         <p>This project aims to build a scalable and efficient machine learning platform...</p>
                         <pre><code>npm install && npm run dev</code></pre>
                     </div>
                 </AnimationStep>
              </div>
            </CardContent>
          </Card>
        </AnimationStep>
      </div>
    </div>
  );
}
