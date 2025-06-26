
import { Suspense } from 'react';
import { AuthorizeView } from './_components/AuthorizeView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOAuthAppByClientId } from '@/lib/db';
import { auth, type Session } from '@/lib/authEdge';
import type { OAuthApp, User } from '@/types';


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

async function getAuthorizePageData(
  searchParams: AuthorizePageProps['searchParams'],
  session: Session | null
): Promise<{ data?: AuthorizePageData; error?: string }> {
  
  const clientId = searchParams?.client_id;
  const redirectUri = searchParams?.redirect_uri;
  const responseType = searchParams?.response_type;
  const state = searchParams?.state;
  const scope = searchParams?.scope;

  if (!clientId || !redirectUri || !responseType || !state) {
    return { error: "The authorization request is incomplete. Please ensure `client_id`, `redirect_uri`, `response_type`, and `state` are provided." };
  }
  
  if (!session?.user) {
    const callbackUrl = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      state: state,
      scope: scope || '',
    });
    redirect(`/login?callbackUrl=/oauth/authorize?${callbackUrl.toString()}`);
  }
  
  if (responseType !== 'code') {
    return { error: "Invalid 'response_type'. Only 'code' is supported." };
  }

  const app = await getOAuthAppByClientId(clientId);
  if (!app) {
    return { error: `Invalid 'client_id'. No application found with ID: ${clientId}` };
  }

  if (!app.redirectUris.includes(redirectUri)) {
    return { error: "Invalid 'redirect_uri'. The provided URL is not registered for this application." };
  }
  
  const requestedScopes = scope ? scope.split(' ') : [];

  return {
    data: {
      app,
      user: { name: session.user.name, avatar: session.user.avatar },
      scopes: requestedScopes,
      redirectUri,
      clientId,
      state,
    },
  };
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
  const session = await auth();
  const result = await getAuthorizePageData(searchParams, session);

  if (result.error) {
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
            <AlertDescription>{result.error}</AlertDescription>
          </Alert>
           <Button asChild variant="link" className="mt-4">
             <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <AuthorizeView data={result.data!} />;
}

export default function OAuthAuthorizePage({ searchParams }: AuthorizePageProps) {
  return (
    <Suspense fallback={<AuthorizePageFallback />}>
      <AuthorizeContent searchParams={searchParams} />
    </Suspense>
  );
}
