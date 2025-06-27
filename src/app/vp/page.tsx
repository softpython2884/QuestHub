'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckSquare, FolderGit2, MessageSquare, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

// Helper component for animated scenes
const Scene = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
  <div
    className={cn(
      'absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-1000 ease-in-out',
      active ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
    )}
  >
    {children}
  </div>
);

// Helper for staggered text animation
const AnimatedText = ({ text, className }: { text: string, className?: string }) => (
    <h2 className={cn("text-4xl md:text-5xl font-bold tracking-tight animate-fade-in-up", className)}>
        {text}
    </h2>
);

// Re-styled card for this page
const FeatureCard = ({ icon, title, description, delay }: { icon: React.ElementType, title: string, description: string, delay: string }) => {
    const Icon = icon;
    return (
        <div className={cn("flex flex-col items-center text-center p-6 bg-card/5 border border-white/10 rounded-xl backdrop-blur-sm animate-fade-in-up transition-transform hover:scale-105 hover:border-primary/50")} style={{ animationDelay: delay }}>
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-muted-foreground mt-2">{description}</p>
        </div>
    );
};

export default function VpPage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  
  // Total of 5 scenes (0 to 4)
  const totalScenes = 5;
  const sceneDuration = 5000; // 5 seconds per scene

  useEffect(() => {
    const interval = setInterval(() => {
      setSceneIndex((prevIndex) => (prevIndex + 1) % totalScenes);
    }, sceneDuration);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-screen w-screen text-white">
      
      {/* Scene 1: Intro */}
      <Scene active={sceneIndex === 0}>
        <div className="animate-fade-in">
            <Logo iconSize={60} textSize="text-6xl" />
            <p className="text-2xl text-muted-foreground mt-4 animate-fade-in-up" style={{animationDelay: '0.5s'}}>The All-In-One Development Platform.</p>
        </div>
      </Scene>
      
      {/* Scene 2: Core Features */}
      <Scene active={sceneIndex === 1}>
        <AnimatedText text="Plan, Code, and Communicate. Seamlessly." />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
            <FeatureCard icon={CheckSquare} title="Plan" description="Organize tasks with powerful Kanban boards." delay="0.2s" />
            <FeatureCard icon={FolderGit2} title="Code" description="Integrate directly with your GitHub repositories." delay="0.4s" />
            <FeatureCard icon={MessageSquare} title="Communicate" description="Keep the conversation flowing with built-in chat." delay="0.6s" />
        </div>
      </Scene>

      {/* Scene 3: AI */}
      <Scene active={sceneIndex === 2}>
         <div className="flex flex-col items-center animate-fade-in">
            <div className="flex items-center justify-center h-28 w-28 rounded-full bg-primary/10 mb-8 border-4 border-primary/20 animate-pulse">
                 <Sparkles className="h-16 w-16 text-primary" />
            </div>
            <AnimatedText text="Supercharge Your Workflow with AI" />
            <p className="text-xl text-muted-foreground mt-4 max-w-3xl animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                Generate code, refactor complex functions, and get project ideas instantly. Flowy, your AI assistant, is here to help.
            </p>
        </div>
      </Scene>
      
      {/* Scene 4: Secure & Extensible */}
      <Scene active={sceneIndex === 3}>
        <AnimatedText text="Secure & Extensible by Design." />
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
             <FeatureCard icon={ShieldCheck} title="Secure Vault" description="A private, encrypted space for your API keys and secrets." delay="0.2s" />
             <FeatureCard icon={Zap} title="Powerful API" description="Build custom integrations with FlowApps and OAuth." delay="0.4s" />
        </div>
      </Scene>

      {/* Scene 5: CTA */}
      <Scene active={sceneIndex === 4}>
        <div className="animate-fade-in">
            <h2 className="text-5xl md:text-6xl font-bold tracking-tight">Ready to build faster?</h2>
             <p className="text-xl text-muted-foreground mt-6 max-w-2xl">
                Join thousands of developers who trust FlowUp to bring their ideas to life.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Button size="lg" className="text-lg w-full sm:w-auto" asChild>
                    <Link href="/signup">Get Started Free <ArrowRight className="ml-2 h-5 w-5"/></Link>
                </Button>
                <Button size="lg" variant="outline" className="text-lg w-full sm:w-auto" asChild>
                    <Link href="/login">Sign In</Link>
                </Button>
            </div>
        </div>
      </Scene>
    </div>
  );
}
