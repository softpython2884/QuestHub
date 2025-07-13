
'use client';

// This component is a placeholder and not currently used in the application.
// The OAuth App system has been deprecated in favor of the simpler FlowApps system.
// This file can be safely removed if no longer needed.

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, KeyRound } from 'lucide-react';

export default function EditOAuthAppPage() {
    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/settings/developer">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Developer Settings
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center"><KeyRound className="mr-2 h-6 w-6 text-primary"/>Edit OAuth Application</CardTitle>
                    <CardDescription>
                        Update your application's details.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-10 w-full" />
                         <Skeleton className="h-24 w-full" />
                        <div className="flex justify-end">
                            <Skeleton className="h-10 w-24" />
                        </div>
                    </div>
                     <p className="text-center text-muted-foreground mt-4">Editing is not yet implemented as this feature is deprecated.</p>
                </CardContent>
            </Card>
        </div>
    );
}
