'use client';

import { useActionState } from 'react';
import { handleAuthorization } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, ArrowRight, XCircle } from 'lucide-react';
import type { OAuthApp } from '@/types';

interface AuthorizeViewProps {
  data: {
    app: Pick<OAuthApp, 'name' | 'description' | 'website' | 'logoUrl'>;
    user: { uuid: string; name: string; avatar?: string };
    scopes: string[];
    redirectUri: string;
    clientId: string;
    state: string;
  };
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
    'projects:read': 'Read your projects and tasks.',
    'projects:write': 'Read and write to your projects and tasks.',
    'profile:read': 'Read your basic profile information.',
    'default': 'Access your basic account information.'
};

export function AuthorizeView({ data }: AuthorizeViewProps) {
  const [state, formAction, isPending] = useActionState(handleAuthorization, { error: null });

  const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  return (
    <Card className="shadow-xl w-full">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-4">
            <Avatar className="h-12 w-12 border">
                <AvatarImage src={data.app.logoUrl || `https://placehold.co/100x100.png?text=${getInitials(data.app.name)}`} alt={data.app.name} data-ai-hint="app logo"/>
                <AvatarFallback>{getInitials(data.app.name)}</AvatarFallback>
            </Avatar>
            <ArrowRight className="h-6 w-6 text-muted-foreground"/>
             <Avatar className="h-12 w-12 border">
                <AvatarImage src={data.user.avatar} alt={data.user.name} data-ai-hint="user avatar"/>
                <AvatarFallback>{getInitials(data.user.name)}</AvatarFallback>
            </Avatar>
        </div>
        <CardTitle className="text-xl font-headline mt-4">Authorize {data.app.name}</CardTitle>
        <CardDescription>
            <span className="font-semibold text-primary">{data.app.name}</span> wants to access your FlowUp account{' '}
            <span className="font-semibold text-foreground">({data.user.name})</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.error && (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4"/>
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
            </Alert>
        )}
        <div className="border rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">This application will be able to:</p>
          <ul className="space-y-2">
            {data.scopes.length > 0 ? data.scopes.map(scope => (
                <li key={scope} className="flex items-center text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/>
                    <span>{SCOPE_DESCRIPTIONS[scope] || `Perform action: ${scope}`}</span>
                </li>
            )) : (
                 <li className="flex items-center text-sm">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/>
                    <span>{SCOPE_DESCRIPTIONS['default']}</span>
                </li>
            )}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground text-center">
            By authorizing, you allow this application to use your data as described.
            You can revoke access at any time in your settings.
        </p>
      </CardContent>
      <CardFooter>
        <form action={formAction} className="w-full grid grid-cols-2 gap-4">
            <input type="hidden" name="userUuid" value={data.user.uuid} />
            <input type="hidden" name="clientId" value={data.clientId} />
            <input type="hidden" name="redirectUri" value={data.redirectUri} />
            <input type="hidden" name="state" value={data.state} />
            <input type="hidden" name="scope" value={data.scopes.join(' ')} />
            <Button name="decision" value="deny" variant="outline" type="submit" disabled={isPending}>Deny</Button>
            <Button name="decision" value="accept" type="submit" disabled={isPending}>Authorize</Button>
        </form>
      </CardFooter>
    </Card>
  );
}
