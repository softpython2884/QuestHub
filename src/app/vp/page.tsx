
'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckSquare, FolderGit2, MessageSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface SceneProps {
  currentScene: number;
  sceneNumber: number;
  children: React.ReactNode;
}

const Scene = ({ currentScene, sceneNumber, children }: SceneProps) => (
  <div
    className={cn(
      'absolute inset-0 flex flex-col items-center justify-center text-center transition-opacity duration-1000 ease-in-out',
      // Hide if not the current scene, but keep the final scene visible once it's reached
      currentScene === sceneNumber || (sceneNumber === 6 && currentScene > 5) ? 'opacity-100' : 'opacity-0 pointer-events-none'
    )}
  >
    {children}
  </div>
);

const AnimatedText = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div className={cn("animate-fade-in-up", className)}>{children}</div>
);

const AnimatedCard = ({ icon, title, description, delay }: { icon: React.ElementType, title: string, description: string, delay: string }) => {
    const Icon = icon;
    return (
        <div className={cn("flex flex-col items-center text-center p-4 animate-fade-in-up")} style={{ animationDelay: delay }}>
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4 transition-transform duration-300 hover:scale-110">
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-muted-foreground mt-1">{description}</p>
        </div>
    );
}

export default function VpPage() {
  const [scene, setScene] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      setTimeout(() => {
        audio.play().catch(error => console.error("Audio autoplay failed. User interaction might be required.", error));
      }, 100);
    }

    const sceneTimers = [
      setTimeout(() => setScene(1), 500),      // Scene 1: Initial Fade In (0.5s)
      setTimeout(() => setScene(2), 4500),     // Scene 2: Unified Workspace (4.5s)
      setTimeout(() => setScene(3), 12500),    // Scene 3: AI (12.5s)
      setTimeout(() => setScene(4), 20500),    // Scene 4: Secure & Extensible (20.5s)
      setTimeout(() => setScene(5), 28500),    // Scene 5: Final Slogan (28.5s)
      setTimeout(() => setScene(6), 36500),    // Scene 6: CTA Button (36.5s)
    ];

    return () => {
      sceneTimers.forEach(clearTimeout);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className="relative h-screen w-screen">
      {/* The audio element now uses the src attribute directly */}
      <audio ref={audioRef} src="/vp.mp3" />
      
      <Scene currentScene={scene} sceneNumber={1}>
        <AnimatedText>
          <Logo iconSize={60} textSize="text-6xl" />
          <p className="text-2xl text-muted-foreground mt-4">Rethink Collaboration.</p>
        </AnimatedText>
      </Scene>
      
      <Scene currentScene={scene} sceneNumber={2}>
        <AnimatedText>
            <h2 className="text-4xl font-bold tracking-tight mb-8">A truly unified workspace.</h2>
        </AnimatedText>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
            <AnimatedCard icon={CheckSquare} title="Plan" description="Organize tasks with powerful Kanban boards." delay="0s" />
            <AnimatedCard icon={FolderGit2} title="Code" description="Integrate directly with your GitHub repositories." delay="0.2s" />
            <AnimatedCard icon={MessageSquare} title="Communicate" description="Keep the conversation flowing with built-in chat." delay="0.4s" />
        </div>
      </Scene>

      <Scene currentScene={scene} sceneNumber={3}>
         <AnimatedText className="flex flex-col items-center">
            <div className="flex items-center justify-center h-24 w-24 rounded-full bg-primary/10 mb-6 animate-pulse">
                 <Sparkles className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight">AI-Powered Acceleration.</h2>
            <p className="text-2xl text-muted-foreground mt-4 max-w-2xl">Generate code, summarize documents, and create tasks with your built-in AI copilot.</p>
        </AnimatedText>
      </Scene>
      
      <Scene currentScene={scene} sceneNumber={4}>
         <AnimatedText className="flex flex-col items-center">
             <h2 className="text-4xl font-bold tracking-tight">Secure & Extensible.</h2>
            <p className="text-2xl text-muted-foreground mt-4 max-w-2xl">Built for developers with robust security and powerful APIs for custom integrations.</p>
        </AnimatedText>
      </Scene>

      <Scene currentScene={scene} sceneNumber={5}>
          <AnimatedText>
            <Logo iconSize={60} textSize="text-6xl" />
            <h2 className="text-4xl font-bold tracking-tight mt-6">The Future of Development is Here.</h2>
        </AnimatedText>
      </Scene>

       <Scene currentScene={scene} sceneNumber={6}>
            <AnimatedText className="flex flex-col items-center gap-10">
                <div>
                    <Logo iconSize={60} textSize="text-6xl" />
                    <h2 className="text-4xl font-bold tracking-tight mt-6">The Future of Development is Here.</h2>
                </div>
                 <Button size="lg" className="text-lg animate-fade-in" asChild>
                    <Link href="/signup">Get Started <ArrowRight className="ml-2 h-5 w-5"/></Link>
                </Button>
            </AnimatedText>
        </Scene>

    </div>
  );
}
