'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getOrCreateSecureVaultProjectAction } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert, KeyRound, Github } from 'lucide-react';
import Link from 'next/link';

export default function SecureVaultPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'error' | 'redirecting'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initializeVault() {
      const result = await getOrCreateSecureVaultProjectAction();
      
      if (result.error) {
        setErrorMessage(result.error);
        setStatus('error');
        toast({
          variant: 'destructive',
          title: 'Vault Initialization Failed',
          description: result.error,
        });
      } else if (result.projectUuid) {
        setStatus('redirecting');
        router.replace(`/projects/${result.projectUuid}/codespace/files`);
      } else {
        setErrorMessage('An unknown error occurred.');
        setStatus('error');
      }
    }
    initializeVault();
  }, [router, toast]);

  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <KeyRound className="h-16 w-16 text-primary mb-4 animate-pulse" />
        <h2 className="text-2xl font-semibold mb-2 flex items-center">
            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
            {status === 'loading' ? 'Initializing Your Secure Vault...' : 'Redirecting to Vault...'}
        </h2>
        <p className="text-muted-foreground max-w-md">
            We're setting up a private, dedicated project for your secrets. This may take a moment.
        </p>
      </div>
    );
  }
  
  if (status === 'error') {
     return (
       <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center">
        <Card className="max-w-lg shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                    <ShieldAlert className="h-6 w-6"/>
                    Could Not Initialize Vault
                </CardTitle>
                <CardDescription>
                    An error occurred while setting up your secure vault.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <p className="text-destructive-foreground bg-destructive/80 p-3 rounded-md text-sm">{errorMessage || 'An unknown error occurred.'}</p>
                 {errorMessage?.includes('GitHub account is not connected') && (
                    <Button asChild>
                        <Link href="/profile">
                            <Github className="mr-2 h-4 w-4" /> Connect GitHub Account
                        </Link>
                    </Button>
                 )}
            </CardContent>
        </Card>
      </div>
     )
  }

  return null;
}
