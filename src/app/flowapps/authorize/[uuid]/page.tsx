
'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFlowAppAction } from '@/app/(app)/settings/developer/actions';
import { handleFlowAppConsentAction } from '@/app/(app)/settings/actions';
import { useAuth } from '@/hooks/useAuth';
import { ArrowRight, Bot, CheckCircle2, KeyRound, Loader2, LogIn, ShieldAlert } from 'lucide-react';
import type { FlowApp } from '@/types';
import { ALL_SCOPES } from '@/types';
import { cn } from '@/lib/utils';


function AuthorizePageContent() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const appUuid = params.uuid as string;

    const [app, setApp] = useState<FlowApp | null>(null);
    const [isLoadingApp, setIsLoadingApp] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isSubmitting, startTransition] = useTransition();

    useEffect(() => {
        async function loadApp() {
            if (!appUuid) {
                setError("Application ID is missing.");
                setIsLoadingApp(false);
                return;
            }
            setIsLoadingApp(true);
            const result = await getFlowAppAction(appUuid);
            if ('error' in result) {
                setError(result.error);
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            } else {
                setApp(result);
            }
            setIsLoadingApp(false);
        }
        loadApp();
    }, [appUuid, toast]);
    
    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '??';

    const handleDecision = (decision: 'granted' | 'denied') => {
        if (!app) return;
        startTransition(async () => {
            const result = await handleFlowAppConsentAction(app.uuid, decision);
            if (result.success) {
                toast({ title: 'Success', description: `Permission has been ${decision}. You can now close this page.` });
                setApp(prev => prev ? { ...prev, consentStatus: decision } : null);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };
    
    if (isAuthLoading || isLoadingApp) {
        return (
            <Card className="shadow-xl">
                <CardHeader>
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-5 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-6 mt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }
    
    if (!user) {
        return (
            <Card className="shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Authentication Required</CardTitle>
                    <CardDescription>You must be logged in to authorize an application.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href={`/login?callbackUrl=${window.location.pathname}`}><LogIn className="mr-2 h-4 w-4"/>Sign In</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    if (error || !app) {
         return (
            <Card className="shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center text-destructive"><ShieldAlert className="mr-2 h-5 w-5" />Authorization Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant="destructive">
                        <AlertTitle>Invalid Request</AlertTitle>
                        <AlertDescription>{error || "This application could not be found."}</AlertDescription>
                    </Alert>
                    <Button asChild variant="link" className="mt-4"><Link href="/dashboard">Go to Dashboard</Link></Button>
                </CardContent>
            </Card>
        );
    }
    
    const appScopes = ALL_SCOPES.filter(s => app.scopes.includes(s.id));

    return (
        <Card className="shadow-xl w-full">
            <CardHeader className="text-center">
                <div className="flex justify-center items-center gap-4">
                    <Avatar className="h-12 w-12 border"><AvatarFallback className="text-xl"><Bot/></AvatarFallback></Avatar>
                    <ArrowRight className="h-6 w-6 text-muted-foreground"/>
                    <Avatar className="h-12 w-12 border">
                        <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar"/>
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                </div>
                <CardTitle className="text-xl font-headline mt-4">Authorize {app.name}</CardTitle>
                <CardDescription>
                    <span className="font-semibold text-primary">{app.name}</span> wants to access your FlowUp account{' '}
                    <span className="font-semibold text-foreground">({user.name})</span>.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="border rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium">This application will be able to:</p>
                    <ul className="space-y-2">
                        {appScopes.map(scope => (
                            <li key={scope.id} className="flex items-start text-sm gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 shrink-0"/>
                                <span className="text-muted-foreground">{scope.description} (<code className="text-xs bg-muted/50 px-1 py-0.5 rounded font-mono">{scope.id}</code>)</span>
                            </li>
                        ))}
                    </ul>
                </div>
                 <p className="text-xs text-muted-foreground text-center">
                    By authorizing, you allow this application to use your data as described.
                    You can revoke access at any time in your settings.
                </p>
            </CardContent>
            <CardFooter>
                 <div className="w-full grid grid-cols-2 gap-4">
                    <Button variant="outline" onClick={() => handleDecision('denied')} disabled={isSubmitting}>Deny</Button>
                    <Button onClick={() => handleDecision('granted')} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Authorize
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function AuthorizePage() {
    return <AuthorizePageContent />
}
