
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Mail, Shield, Edit3, Image as ImageIcon, Github, Link2, PowerOff, ExternalLink, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState, useActionState, startTransition as ReactStartTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as authService from '@/lib/authService';
import { fetchUserGithubOAuthTokenAction, disconnectGithubAction, fetchGithubUserDetailsAction } from '@/app/(app)/projects/[id]/actions'; // Re-using from project actions for now
import { useRouter } from 'next/navigation';
import Link from 'next/link';


const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  avatar: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface GithubUserDetails {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
}

export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUserDetails, setGithubUserDetails] = useState<GithubUserDetails | null>(null);
  const [isLoadingGithub, setIsLoadingGithub] = useState(true);

  const [disconnectState, disconnectFormAction, isDisconnectPending] = useActionState(disconnectGithubAction, { success: false });


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
      });
    }
  }, [user, form]);

  useEffect(() => {
    async function loadGithubData() {
      if (user) {
        setIsLoadingGithub(true);
        const tokenData = await fetchUserGithubOAuthTokenAction();
        if (tokenData?.accessToken) {
          setGithubToken(tokenData.accessToken);
          const userDetails = await fetchGithubUserDetailsAction();
          setGithubUserDetails(userDetails);
        } else {
          setGithubToken(null);
          setGithubUserDetails(null);
        }
        setIsLoadingGithub(false);
      }
    }
    if (!authLoading) loadGithubData();
  }, [user, authLoading]);
  
  useEffect(() => {
    if (!isDisconnectPending && disconnectState) {
      if (disconnectState.success) {
        toast({ title: "Success", description: disconnectState.message });
        setGithubToken(null);
        setGithubUserDetails(null);
      } else if (disconnectState.error) {
        toast({ variant: "destructive", title: "Error", description: disconnectState.error });
      }
    }
  }, [disconnectState, isDisconnectPending, toast]);


  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-2/3" />
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            <Skeleton className="h-8 w-1/2 mx-auto mt-4" />
            <Skeleton className="h-6 w-1/3 mx-auto mt-2" />
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-md">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
             <Skeleton className="h-10 w-full mt-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    // Should be redirected by useAuth hook or AppLayout, but as a fallback:
    router.push('/login');
    return <p>Redirecting to login...</p>;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await authService.updateUserProfile(user.uuid, data.name, data.email, data.avatar || undefined);

      if (result) {
        toast({ title: "Success", description: "Profile updated successfully." });
        refreshUser(); 
        setIsEditing(false);
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update profile." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectGitHub = () => {
    // Redirect to the GitHub OAuth login flow
    window.location.href = `/api/auth/github/oauth/login?redirectTo=/profile`;
  };

  const handleDisconnectGitHub = () => {
     const dummyFormData = new FormData(); // useActionState requires FormData
     ReactStartTransition(() => {
        disconnectFormAction(dummyFormData);
     });
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-headline font-semibold">My Profile</h1>
          <p className="text-muted-foreground">View and manage your personal information and connections.</p>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        )}
      </div>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2 ring-offset-background">
              <AvatarImage src={user.avatar || `https://placehold.co/100x100.png?text=${getInitials(user.name)}`} alt={user.name} data-ai-hint="user avatar" />
              <AvatarFallback className="text-3xl">{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            {!isEditing ? (
              <>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </>
            ) : (
               <CardTitle className="text-2xl">Edit Profile</CardTitle>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {isEditing ? (
              <>
                <div className="space-y-1">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                   {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="avatar" placeholder="https://example.com/avatar.png" {...form.register("avatar")} className="pl-10" />
                  </div>
                  {form.formState.errors.avatar && <p className="text-sm text-destructive">{form.formState.errors.avatar.message}</p>}
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
            <div className="flex items-center p-3 bg-muted/50 rounded-md">
              <Shield className="h-5 w-5 mr-3 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
            </div>
             <div className="flex items-center p-3 bg-muted/50 rounded-md">
                <Shield className="h-5 w-5 mr-3 text-primary" /> 
                <div>
                    <p className="text-sm text-muted-foreground">User ID (UUID)</p>
                    <p className="font-medium text-xs">{user.uuid}</p>
                </div>
            </div>
          </CardContent>
          {isEditing && (
            <CardFooter className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => { setIsEditing(false); form.reset({ name: user.name, email: user.email, avatar: user.avatar || '' }); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>

      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Link2 className="mr-2 h-5 w-5 text-primary"/>External Connections</CardTitle>
          <CardDescription>Manage your connections to third-party services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GitHub Connection */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Github className="h-8 w-8" />
                <div>
                  <h4 className="font-semibold">GitHub</h4>
                  {isLoadingGithub ? (
                    <Skeleton className="h-4 w-32 mt-1" />
                  ) : githubUserDetails ? (
                    <div className="text-sm text-muted-foreground">
                      Connected as: <a href={githubUserDetails.html_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">{githubUserDetails.login}</a> ({githubUserDetails.name || 'Name not public'})
                      <Avatar className="h-5 w-5 inline-block ml-2 align-middle">
                          <AvatarImage src={githubUserDetails.avatar_url} alt={githubUserDetails.login} data-ai-hint="github avatar" />
                          <AvatarFallback>{getInitials(githubUserDetails.login)}</AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Connected</p>
                  )}
                </div>
              </div>
              {isLoadingGithub ? (
                 <Skeleton className="h-9 w-24" />
              ) : githubToken ? (
                <Button variant="outline" onClick={handleDisconnectGitHub} disabled={isDisconnectPending}>
                  {isDisconnectPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <PowerOff className="mr-2 h-4 w-4" />}
                  Disconnect
                </Button>
              ) : (
                <Button onClick={handleConnectGitHub}>
                  <Github className="mr-2 h-4 w-4" /> Connect
                </Button>
              )}
            </div>
          </Card>

          {/* Discord Connection (Placeholder) */}
           <Card className="p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-indigo-500" />
                <div>
                  <h4 className="font-semibold">Discord</h4>
                  <p className="text-sm text-muted-foreground">Connect to receive notifications (Coming Soon).</p>
                </div>
              </div>
              <Button disabled>
                <MessageSquare className="mr-2 h-4 w-4" /> Connect (Soon)
              </Button>
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
