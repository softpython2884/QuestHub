
'use client';

import { Suspense } from 'react';
import { AuthorizeView } from './_components/AuthorizeView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { OAuthApp } from '@/types';
// This entire page is part of a deprecated feature.
// It is kept for potential future use but is not actively used.

function AuthorizePageFallback() {
    return (
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>Authorizing...</CardTitle>
                <CardDescription>Please wait while we verify the application request.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </CardContent>
        </Card>
    );
}

function ErrorCard({ title, description }: { title: string, description: string }) {
    return (
        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle className="flex items-center text-destructive">
                <ShieldAlert className="mr-2 h-5 w-5" />
                {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                <AlertTitle>Invalid Request</AlertTitle>
                <AlertDescription>{description}</AlertDescription>
                </Alert>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

// This component is now client-side to avoid server-side execution issues
// in a feature that is not fully implemented or used.
function AuthorizeContent() {
  return <ErrorCard title="Feature Deprecated" description="The OAuth App authorization flow is currently not in use. Please use FlowApps for API integrations." />;
}

export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<AuthorizePageFallback />}>
      <AuthorizeContent />
    </Suspense>
  );
}
