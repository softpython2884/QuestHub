
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Compass, Star, Search, User, Github, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';


const AnimationStep = ({ step, currentStep, children, className, delay = 0 }: { step: number; currentStep: number; children: React.ReactNode; className?: string; delay?: number }) => (
  <div className={cn('transition-all duration-700 ease-in-out', currentStep >= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5', className)} style={{ transitionDelay: `${delay}ms`}}>
    {children}
  </div>
);

const projects = [
  { name: "Genkit AI Framework", desc: "The open source framework for building production-ready AI apps.", stars: 1200, owner: 'Google', hint: "code" },
  { name: "Awesome Design Patterns", desc: "A curated list of software design patterns and principles.", stars: 850, owner: 'Community', hint: "design" },
  { name: "React Component Library", desc: "A set of reusable and accessible React components.", stars: 2300, owner: 'JaneDoe', hint: "atom" },
  { name: "3D WebGL Engine", desc: "A lightweight and powerful 3D engine for the web.", stars: 980, owner: 'ThreeJSFan', hint: "cube" },
  { name: "DataVis Toolkit", desc: "Tools for creating beautiful and interactive data visualizations.", stars: 450, owner: 'DataCorp', hint: "chart" },
  { name: "FlowUp - The App", desc: "The repository for this very application!", stars: 5000, owner: 'FlowUpTeam', hint: "logo" },
];

export default function PresentationPage4() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts = Array.from({ length: 4 }).map((_, i) => setTimeout(() => setStep(i + 1), i * 1500));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-7xl mx-auto space-y-12">
        <AnimationStep step={1} currentStep={step} className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight flex items-center justify-center gap-4"><Compass className="text-primary h-12 w-12" /> Discover & Collaborate</h1>
          <p className="text-xl text-muted-foreground mt-4">Explore public projects, find talented developers, and join the community.</p>
        </AnimationStep>

        <AnimationStep step={2} currentStep={step}>
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search for public projects or users..." className="pl-12 h-12 text-lg bg-card/60" />
          </div>
        </AnimationStep>

        <AnimationStep step={3} currentStep={step}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((p, i) => (
                    <AnimationStep key={p.name} step={3} currentStep={step} delay={i * 100}>
                        <Card className="bg-card/60 backdrop-blur-sm border-white/10 hover:border-primary/50 transition-all h-full flex flex-col">
                            <CardHeader>
                                <CardTitle>{p.name}</CardTitle>
                                <CardDescription>{p.desc}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow flex flex-col justify-end">
                               <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6"><AvatarFallback><User size={14}/></AvatarFallback></Avatar>
                                        <span>{p.owner}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Star className="text-yellow-400" size={16}/>
                                        <span>{p.stars.toLocaleString('en-US')}</span>
                                    </div>
                               </div>
                                <Button variant="outline" className="w-full mt-4"><Github className="mr-2 h-4 w-4"/> View on GitHub</Button>
                            </CardContent>
                        </Card>
                    </AnimationStep>
                ))}
            </div>
        </AnimationStep>
      </div>

      <div className="fixed bottom-8 right-8 z-10 flex gap-4">
        <AnimationStep step={3} currentStep={step} delay={projects.length * 100}>
            <Button asChild size="lg" variant="outline">
                <Link href="/present3"><ArrowLeft className="mr-2 h-5 w-5"/> Previous</Link>
            </Button>
        </AnimationStep>
        <AnimationStep step={3} currentStep={step} delay={projects.length * 100}>
            <Button asChild size="lg">
                <Link href="/present5">Next <ArrowRight className="ml-2 h-5 w-5"/></Link>
            </Button>
        </AnimationStep>
      </div>
    </div>
  );
}
