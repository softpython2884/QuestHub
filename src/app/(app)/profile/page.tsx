
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Mail, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-2/3" />
        <Card>
          <CardHeader>
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            <Skeleton className="h-8 w-1/2 mx-auto mt-4" />
            <Skeleton className="h-6 w-1/3 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // This should ideally be handled by the AppLayout redirecting to login
    return <p>User not found. Please log in.</p>;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline font-semibold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your personal information.</p>
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background">
            <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="user avatar" />
            <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{user.name}</CardTitle>
          <CardDescription>Your personal account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex items-center p-3 bg-muted/50 rounded-md">
            <UserIcon className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-muted/50 rounded-md">
            <Mail className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email Address</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center p-3 bg-muted/50 rounded-md">
            <Shield className="h-5 w-5 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
