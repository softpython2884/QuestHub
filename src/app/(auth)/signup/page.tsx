
'use client';

import { Suspense } from 'react';
import { SignupForm } from '@/components/auth/SignupForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams }from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSignupPageData, type SignupPageData } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Play } from 'lucide-react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SignupPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageData, setPageData] = useState<SignupPageData | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
      const token = searchParams.get('token');
      getSignupPageData(token).then(data => {
          setPageData(data);
          setIsLoadingPageData(false);
      });
  }, [searchParams]);
  
  if (authLoading || isLoadingPageData || (!isLoadingPageData && user)) {
     return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (pageData?.mode === 'private' && pageData.error) {
    return (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Registration Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>{pageData.error}</AlertDescription>
            </Alert>
             <p className="text-center text-sm text-muted-foreground !mt-6">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
    );
  }


  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Create your Account</CardTitle>
        <CardDescription>Join FlowUp and streamline your projects.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm prefilledEmail={pageData?.email} invitationToken={pageData?.token} />
         <div className="!mt-6 text-center">
            <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/present"><Play className="mr-2 h-4 w-4" /> Watch Presentation</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <SignupPageContent />
    </Suspense>
  )
}
