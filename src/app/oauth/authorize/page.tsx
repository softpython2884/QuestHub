
import { Suspense } from 'react';
import { AuthorizeView } from './_components/AuthorizeView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOAuthAppByClientId } from '@/lib/db';
import { auth } from '@/lib/authEdge';
import type { OAuthApp } from '@/types';


interface AuthorizePageProps {
  searchParams: {
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    state?: string;
    scope?: string;
  };
}

interface AuthorizePageData {
  app: Pick<OAuthApp, 'name' | 'description' | 'website' | 'logoUrl'>;
  user: { name: string; avatar?: string };
  scopes: string[];
  redirectUri: string;
  clientId: string;
  state: string;
}

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

async function AuthorizeContent({ searchParams }: AuthorizePageProps) {
  const { client_id, redirect_uri, response_type, state, scope } = searchParams;
  
  if (!client_id || !redirect_uri || !response_type || !state) {
    return (
        <Card className="shadow-xl">
        <CardHeader>
            <CardTitle className="flex items-center text-destructive">
            <ShieldAlert className="mr-2 h-5 w-5" />
            Authorization Error
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Alert variant="destructive">
            <AlertTitle>Invalid Request</AlertTitle>
            <AlertDescription>The authorization request is incomplete. Please ensure `client_id`, `redirect_uri`, `response_type`, and `state` are provided.</AlertDescription>
            </Alert>
            <Button asChild variant="link" className="mt-4">
                <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
        </CardContent>
        </Card>
    );
  }

  if (response_type !== 'code') {
     return <Card className="shadow-xl"><CardContent><Alert variant="destructive"><AlertTitle>Invalid 'response_type'. Only 'code' is supported.</AlertTitle></Alert></CardContent></Card>;
  }

  const app = await getOAuthAppByClientId(client_id);
  if (!app) {
     return <Card className="shadow-xl"><CardContent><Alert variant="destructive"><AlertTitle>Invalid 'client_id'. No application found.</AlertTitle></Alert></CardContent></Card>;
  }

  if (!app.redirectUris.includes(redirect_uri)) {
     return <Card className="shadow-xl"><CardContent><Alert variant="destructive"><AlertTitle>Invalid 'redirect_uri'. The provided URL is not registered for this application.</AlertTitle></Alert></CardContent></Card>;
  }

  const session = await auth();
  if (!session?.user) {
    const callbackUrl = new URLSearchParams(searchParams as Record<string, string>).toString();
    redirect(`/login?callbackUrl=/oauth/authorize?${callbackUrl}`);
  }

  const data: AuthorizePageData = {
    app,
    user: { name: session.user.name, avatar: session.user.avatar },
    scopes: scope ? scope.split(' ') : [],
    redirectUri: redirect_uri,
    clientId: client_id,
    state,
  };

  return <AuthorizeView data={data} />;
}

export default function OAuthAuthorizePage({ searchParams }: AuthorizePageProps) {
  return (
    <Suspense fallback={<AuthorizePageFallback />}>
      <AuthorizeContent searchParams={searchParams} />
    </Suspense>
  );
}
