
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Shield, Users, GitBranch, KeyRound, Database, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Input } from '@/components/ui/input';
import Link from 'next/link';


const AnimationStep = ({ step, currentStep, children, className }: { step: number; currentStep: number; children: React.ReactNode; className?: string; }) => (
  <div className={cn('transition-all duration-700 ease-in-out', currentStep >= step ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5', className)}>
    {children}
  </div>
);

const chartData = [
  { month: "Jan", users: 120 }, { month: "Feb", users: 180 }, { month: "Mar", users: 250 },
  { month: "Apr", users: 310 }, { month: "May", users: 450 }, { month: "Jun", users: 600 },
];

export default function PresentationPage3() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts = Array.from({ length: 4 }).map((_, i) => setTimeout(() => setStep(i + 1), i * 1500));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-white p-4 sm:p-8 flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-6xl mx-auto space-y-12">
        <AnimationStep step={1} currentStep={step} className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight flex items-center justify-center gap-4"><Shield className="text-primary h-12 w-12" /> Instance Administration</h1>
          <p className="text-xl text-muted-foreground mt-4">Manage your FlowUp instance with powerful and intuitive admin controls.</p>
        </AnimationStep>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <AnimationStep step={2} currentStep={step}>
                <Card className="bg-card/60 backdrop-blur-sm border-white/10 h-full">
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users /> User & Project Policies</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                            <Label htmlFor="reg-mode" className="flex flex-col">
                                <span>Registration Mode</span>
                                <span className="text-xs font-normal text-muted-foreground">Control how new users sign up.</span>
                            </Label>
                            <div className="flex items-center gap-2 text-sm">
                                <span>Public</span>
                                <Switch id="reg-mode" checked={false} />
                                <span className="text-primary font-medium">Invite-Only</span>
                            </div>
                        </div>
                         <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg">
                            <Label htmlFor="storage-mode" className="flex flex-col">
                                <span>Default Storage</span>
                                <span className="text-xs font-normal text-muted-foreground">Set default storage for new projects.</span>
                            </Label>
                             <div className="flex items-center gap-2 text-sm">
                                <span className="text-primary font-medium">GitHub</span>
                                <Switch id="storage-mode" checked={true} />
                                <span>Local</span>
                            </div>
                        </div>
                        <div className="p-4 bg-black/20 rounded-lg">
                           <Label className="font-medium">Generate Invite Link</Label>
                           <div className="flex gap-2 mt-2">
                             <Input placeholder="user@example.com" className="bg-background/50" />
                             <Button variant="outline"> <KeyRound className="mr-2 h-4 w-4"/> Generate</Button>
                           </div>
                        </div>
                    </CardContent>
                </Card>
            </AnimationStep>
             <AnimationStep step={3} currentStep={step}>
                <Card className="bg-card/60 backdrop-blur-sm border-white/10 h-full">
                    <CardHeader><CardTitle className="flex items-center gap-2"><GitBranch /> Platform Analytics</CardTitle></CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground mb-4">Total Users</p>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{fill: 'hsl(var(--accent) / 0.3)'}} />
                              <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                         <AnimationStep step={4} currentStep={step} className="mt-6">
                            <Button variant="destructive" className="w-full"><Database className="mr-2 h-4 w-4"/> Run Database Migrations</Button>
                         </AnimationStep>
                    </CardContent>
                </Card>
            </AnimationStep>
        </div>
      </div>

       <div className="fixed bottom-8 right-8 z-10 flex gap-4">
        <AnimationStep step={4} currentStep={step}>
            <Button asChild size="lg" variant="outline">
                <Link href="/present2"><ArrowLeft className="mr-2 h-5 w-5"/> Previous</Link>
            </Button>
        </AnimationStep>
        <AnimationStep step={4} currentStep={step}>
            <Button asChild size="lg">
                <Link href="/present4">Next <ArrowRight className="ml-2 h-5 w-5"/></Link>
            </Button>
        </AnimationStep>
      </div>
    </div>
  );
}
