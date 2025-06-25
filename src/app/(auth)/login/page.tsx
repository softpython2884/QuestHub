
'use client';

import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || (!isLoading && user)) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-1/2 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
        <CardDescription>Sign in to access your FlowUp workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
         <div className="!mt-6 text-center">
            <Button variant="link" asChild className="text-muted-foreground">
                <Link href="/present"><Play className="mr-2 h-4 w-4" /> Watch Presentation</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
