
'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getFlowAppConsentsAction, handleFlowAppConsentAction, revokeFlowAppConsentAction } from '../actions';
import type { FlowAppConsent, FlowAppScope } from '@/types';
import { ALL_SCOPES } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, KeyRound, Copy, Check, ArrowLeft, CheckCircle, XCircle, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';

function MyUuidPageContent() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    
    const [consents, setConsents] = useState<FlowAppConsent[]>([]);
    const [isLoadingConsents, setIsLoadingConsents] = useState(true);
    const [isSubmitting, startTransition] = useTransition();

    const loadConsents = async () => {
        setIsLoadingConsents(true);
        const result = await getFlowAppConsentsAction();
        if ('error' in result) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setConsents([]);
        } else {
            setConsents(result.filter(c => c.status === 'pending'));
        }
        setIsLoadingConsents(false);
    };

    useEffect(() => {
        if (user) {
            loadConsents();
        }
    }, [user]);

    const handleDecision = (flowAppUuid: string, decision: 'granted' | 'denied') => {
        startTransition(async () => {
            const result = await handleFlowAppConsentAction(flowAppUuid, decision);
            if (result.success) {
                toast({ title: 'Success', description: `Permission ${decision}.` });
                loadConsents();
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            }
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const getInitials = (name?: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() : '??';

    const ScopeDescription: React.FC<{ scope: FlowAppScope }> = ({ scope }) => {
        const scopeInfo = ALL_SCOPES.find(s => s.id === scope);
        return <li className="text-xs">{scopeInfo?.description || scope}</li>;
    };

    if (isAuthLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>;
    }

    return (
        <div className="space-y-8">
             <Button variant="outline" asChild>
                <Link href="/settings">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center"><KeyRound className="mr-2 h-6 w-6 text-primary"/>Your User ID (UUID)</CardTitle>
                    <CardDescription>This is your unique identifier for use with FlowApps and the API. Keep it private.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <Input value={user?.uuid || 'Loading...'} readOnly className="font-mono text-base" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(user?.uuid || '')} disabled={!user?.uuid}>
                            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center"><Bot className="mr-2 h-6 w-6 text-primary"/>Pending Application Requests</CardTitle>
                    <CardDescription>Review applications that have requested access to your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoadingConsents ? (
                        <Skeleton className="h-24 w-full" />
                    ) : consents.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4 text-center">No pending application requests.</p>
                    ) : (
                        <div className="space-y-4">
                            {consents.map(consent => (
                                <Card key={consent.flowAppUuid} className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-500/50">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10"><AvatarFallback>{getInitials(consent.flowAppName)}</AvatarFallback></Avatar>
                                            <div>
                                                <p className="font-semibold">{consent.flowAppName}</p>
                                                <p className="text-xs text-muted-foreground">Owned by {consent.flowAppOwnerName}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 self-end sm:self-center">
                                            <Button size="sm" variant="destructive" onClick={() => handleDecision(consent.flowAppUuid, 'denied')} disabled={isSubmitting}>Deny</Button>
                                            <Button size="sm" onClick={() => handleDecision(consent.flowAppUuid, 'granted')} disabled={isSubmitting}>Allow</Button>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-amber-500/30">
                                        <p className="text-xs font-semibold">This app is requesting permission to:</p>
                                        <ul className="list-disc pl-5 mt-1 space-y-1">
                                            {consent.scopes.map(scope => <ScopeDescription key={scope} scope={scope} />)}
                                        </ul>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


export default function MyUuidPageWrapper() {
    return <MyUuidPageContent />;
}
