
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Atom, LayoutDashboard, FolderKanban, Sparkles, MessageSquare, CheckSquare, ListChecks, Bot, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

const AnimationStep = ({
  step,
  currentStep,
  children,
  className,
}: {
  step: number;
  currentStep: number;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'transition-all duration-700 ease-in-out',
      currentStep >= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
      className
    )}
  >
    {children}
  </div>
);

export default function PresentationPage() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = [
      () => setStep(1), // Title
      () => setStep(2), // Cards
      () => setStep(3), // Kanban
      () => setStep(4), // AI
      () => setStep(5), // Chat
      () => setStep(6), // Final CTA
    ];

    const timeouts = sequence.map((fn, i) => setTimeout(fn, i * 2000));

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-16">
        {/* Step 1: Main Title */}
        <AnimationStep step={1} currentStep={step} className="text-center">
          <Logo iconSize={48} textSize="text-5xl" />
          <p className="text-xl text-muted-foreground mt-4">The all-in-one platform for modern development teams.</p>
        </AnimationStep>

        {/* Step 2: Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimationStep step={2} currentStep={step} className="transition-delay-0">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><LayoutDashboard className="text-primary"/>Dashboard</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Get a bird's-eye view of all your projects and tasks.</p></CardContent>
            </Card>
          </AnimationStep>
          <AnimationStep step={2} currentStep={step} className="transition-delay-200">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><FolderKanban className="text-primary"/>Projects</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Organize work with Kanban boards, documents, and code integration.</p></CardContent>
            </Card>
          </AnimationStep>
          <AnimationStep step={2} currentStep={step} className="transition-delay-400">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="text-primary"/>AI Studio</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Accelerate development with powerful generative AI tools.</p></CardContent>
            </Card>
          </AnimationStep>
          <AnimationStep step={2} currentStep={step} className="transition-delay-600">
            <Card className="bg-card/60 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="text-primary"/>Team Chat</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Communicate seamlessly with integrated project and direct messaging.</p></CardContent>
            </Card>
          </AnimationStep>
        </div>

        {/* Step 3: Kanban Board */}
        <AnimationStep step={3} currentStep={step}>
          <Card className="bg-card/60 backdrop-blur-sm border-white/10 p-4 sm:p-6">
            <CardTitle className="mb-4">Visualize Your Workflow</CardTitle>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-black/20 rounded-lg">
                <h3 className="font-semibold mb-3">To Do</h3>
                <Card className="p-3 bg-card/80 mb-2">
                  <p className="font-medium text-sm">Design new homepage</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="secondary">UI/UX</Badge>
                    <Avatar className="h-6 w-6"><AvatarFallback>AD</AvatarFallback></Avatar>
                  </div>
                </Card>
              </div>
              <div className="p-3 bg-black/20 rounded-lg">
                <h3 className="font-semibold mb-3">In Progress</h3>
                <Card className="p-3 bg-card/80 border-l-4 border-blue-500 mb-2">
                  <p className="font-medium text-sm">Implement OAuth2 login flow</p>
                  <div className="flex items-center justify-between mt-2">
                    <Badge style={{backgroundColor: '#D946EF', color: 'white'}}>Backend</Badge>
                    <Avatar className="h-6 w-6"><AvatarFallback>BE</AvatarFallback></Avatar>
                  </div>
                </Card>
              </div>
              <div className="p-3 bg-black/20 rounded-lg">
                <h3 className="font-semibold mb-3">Done</h3>
                <Card className="p-3 bg-card/80 border-l-4 border-green-500 mb-2 opacity-70">
                  <p className="font-medium text-sm line-through">Setup project repository</p>
                   <div className="flex items-center justify-between mt-2">
                    <Badge style={{backgroundColor: '#FDE047', color: 'black'}}>DevOps</Badge>
                    <Avatar className="h-6 w-6"><AvatarFallback>AD</AvatarFallback></Avatar>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </AnimationStep>
        
        {/* Step 4 & 5: AI & Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimationStep step={4} currentStep={step}>
                <Card className="bg-card/60 backdrop-blur-sm border-white/10 h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sparkles className="text-primary"/>AI-Powered Assistance</CardTitle>
                        <CardDescription>Generate code, refactor, or get ideas with Flowy.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                       <div className="flex items-start gap-3 justify-end">
                            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground">Create a Python script for a Discord bot</div>
                            <Avatar className="h-8 w-8"><AvatarFallback><User /></AvatarFallback></Avatar>
                       </div>
                       <div className="flex items-start gap-3 justify-start">
                            <Avatar className="h-8 w-8"><AvatarFallback><Bot/></AvatarFallback></Avatar>
                            <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground">
                                <p className="mb-2">Of course! Here is a basic structure for a Discord bot in Python:</p>
                                <pre className="p-2 border rounded-md bg-black/30 text-xs overflow-x-auto font-code"><code>{`import discord

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f'Logged in as {client.user}')

client.run('YOUR_TOKEN_HERE')`}</code></pre>
                            </div>
                       </div>
                    </CardContent>
                </Card>
            </AnimationStep>
            <AnimationStep step={5} currentStep={step}>
                 <Card className="bg-card/60 backdrop-blur-sm border-white/10 h-full">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MessageSquare className="text-primary"/>Collaborate in Real-Time</CardTitle>
                         <CardDescription>Keep the conversation flowing with integrated chat.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-start gap-3 justify-start">
                             <Avatar className="h-8 w-8"><AvatarFallback>BE</AvatarFallback></Avatar>
                             <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground">The staging server is updated. Ready for testing.</div>
                        </div>
                        <div className="flex items-start gap-3 justify-end">
                             <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground">Great! I'll run the E2E tests now.</div>
                             <Avatar className="h-8 w-8"><AvatarFallback>QA</AvatarFallback></Avatar>
                        </div>
                    </CardContent>
                 </Card>
            </AnimationStep>
        </div>

        {/* Step 6: Final CTA */}
        <AnimationStep step={6} currentStep={step} className="text-center">
            <h2 className="text-3xl font-bold">Ready to Supercharge Your Workflow?</h2>
            <p className="text-muted-foreground mt-2 mb-6">Sign up for FlowUp today.</p>
            <Button size="lg" className="text-lg" onClick={() => window.location.href = '/signup'}>
                Get Started
            </Button>
        </AnimationStep>
      </div>

       <div className="fixed bottom-8 right-8 z-10">
        <AnimationStep step={6} currentStep={step}>
            <Button asChild size="lg">
                <Link href="/present2">Next <ArrowRight className="ml-2 h-5 w-5"/></Link>
            </Button>
        </AnimationStep>
      </div>
    </div>
  );
}
