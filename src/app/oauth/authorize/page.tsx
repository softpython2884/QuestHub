
import { Suspense } from 'react';
import { getAuthorizePageData } from './actions';
import { AuthorizeView } from './_components/AuthorizeView';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AuthorizePageProps {
  searchParams: {
    client_id?: string;
    redirect_uri?: string;
    response_type?: string;
    state?: string;
    scope?: string;
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
            <AlertTitle>Missing Required Parameters</AlertTitle>
            <AlertDescription>
              The authorization request is incomplete. Please ensure `client_id`, `redirect_uri`, `response_type`, and `state` are provided.
            </AlertDescription>
          </Alert>
          <Button asChild variant="link" className="mt-4">
             <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const result = await getAuthorizePageData(client_id, redirect_uri, response_type, state, scope);

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
