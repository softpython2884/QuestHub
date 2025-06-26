'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon, Mail, Shield, Edit3, Image as ImageIcon, Github, Link2, PowerOff, ExternalLink, Loader2, Globe, MessageSquare } from 'lucide-react'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState, useActionState, startTransition, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as authService from '@/lib/authService';
import { fetchUserGithubOAuthTokenAction, disconnectGithubAction, fetchGithubUserDetailsAction, fetchDiscordUserDetailsAction, disconnectDiscordAction } from '@/app/(app)/projects/[id]/actions'; 
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';


const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  avatar: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  bio: z.string().max(280, { message: "Bio cannot exceed 280 characters." }).optional(),
  websiteUrl: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  showGithubOnProfile: z.boolean().default(false),
  showDiscordOnProfile: z.boolean().default(false),
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface GithubUserDetails {
  login: string;
  avatar_url: string;
  html_url: string;
  name: string | null;
}

interface DiscordUserDetails {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
}

type AvatarSource = 'flowup' | 'github' | 'discord';


export default function ProfilePage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUserDetails, setGithubUserDetails] = useState<GithubUserDetails | null>(null);
  const [isLoadingGithub, setIsLoadingGithub] = useState(true);

  const [discordUserDetails, setDiscordUserDetails] = useState<DiscordUserDetails | null>(null);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);
  
  const [avatarSource, setAvatarSource] = useState<AvatarSource>('flowup');

  const [disconnectGithubState, disconnectGithubFormAction, isDisconnectGithubPending] = useActionState(disconnectGithubAction, { success: false, error: undefined, message: undefined });
  const [disconnectDiscordState, disconnectDiscordFormAction, isDisconnectDiscordPending] = useActionState(disconnectDiscordAction, { success: false, error: undefined, message: undefined });


  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      avatar: user?.avatar || '',
      bio: user?.bio || '',
      websiteUrl: user?.websiteUrl || '',
      showGithubOnProfile: user?.showGithubOnProfile || false,
      showDiscordOnProfile: user?.showDiscordOnProfile || false,
    },
  });

  const loadExternalData = useCallback(async () => {
    if (user) {
      setIsLoadingGithub(true);
      setIsLoadingDiscord(true);

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
      
      const discordDetails = await fetchDiscordUserDetailsAction();
      setDiscordUserDetails(discordDetails);
      setIsLoadingDiscord(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        email: user.email,
        avatar: user.avatar || '',
        bio: user.bio || '',
        websiteUrl: user.websiteUrl || '',
        showGithubOnProfile: user.showGithubOnProfile || false,
        showDiscordOnProfile: user.showDiscordOnProfile || false,
      });
    }
  }, [user, form]);
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!authLoading) {
      loadExternalData();
    }
  }, [authLoading, loadExternalData]);

  useEffect(() => {
    const githubStatus = searchParams.get('oauth_status');
    const discordStatus = searchParams.get('discord_oauth_status');
    const authError = searchParams.get('error');
    const errorMessage = searchParams.get('message');
    let urlModified = false;
    const newUrl = new URL(window.location.href);

    if (githubStatus === 'success') {
        toast({ title: "GitHub Connected!", description: "Your GitHub account has been successfully linked." });
        loadExternalData();
        newUrl.searchParams.delete('oauth_status');
        urlModified = true;
    }

    if (discordStatus === 'success') {
        toast({ title: "Discord Connected!", description: "Your Discord account has been successfully linked." });
        loadExternalData();
        newUrl.searchParams.delete('discord_oauth_status');
        urlModified = true;
    }
    
    if (authError) {
        toast({ variant: 'destructive', title: "Connection Error", description: errorMessage || authError });
        newUrl.searchParams.delete('error');
        newUrl.searchParams.delete('message');
        urlModified = true;
    }

    if (urlModified) {
        router.replace(newUrl.toString(), { scroll: false });
    }
  }, [searchParams, router, toast, loadExternalData]);
  
  useEffect(() => {
    if (user && !isLoadingGithub && !isLoadingDiscord) {
        let source: AvatarSource = 'flowup';
        if (githubUserDetails?.avatar_url && user.avatar === githubUserDetails.avatar_url) {
            source = 'github';
        } else if (discordUserDetails?.avatar && user.avatar === `https://cdn.discordapp.com/avatars/${discordUserDetails.id}/${discordUserDetails.avatar}.png`) {
            source = 'discord';
        }
        setAvatarSource(source);
    }
  }, [user, githubUserDetails, discordUserDetails, isLoadingGithub, isLoadingDiscord]);

  useEffect(() => {
    if (!isDisconnectGithubPending && disconnectGithubState) {
      if (disconnectGithubState.success && disconnectGithubState.message) {
        toast({ title: "Success", description: disconnectGithubState.message });
        setGithubToken(null);
        setGithubUserDetails(null);
      } else if (disconnectGithubState.error) {
        toast({ variant: "destructive", title: "Error", description: disconnectGithubState.error });
      }
    }
  }, [disconnectGithubState, isDisconnectGithubPending, toast]);

  useEffect(() => {
    if (!isDisconnectDiscordPending && disconnectDiscordState) {
        if (disconnectDiscordState.success && disconnectDiscordState.message) {
            toast({ title: "Success", description: disconnectDiscordState.message });
            setDiscordUserDetails(null);
        } else if (disconnectDiscordState.error) {
            toast({ variant: "destructive", title: "Error", description: disconnectDiscordState.error });
        }
    }
  }, [disconnectDiscordState, isDisconnectDiscordPending, toast]);


  if (authLoading || !user) {
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
      const result = await authService.updateUserProfile({
          uuid: user.uuid,
          name: data.name,
          email: data.email,
          avatar: data.avatar || undefined,
          bio: data.bio || null,
          websiteUrl: data.websiteUrl || null,
          showDiscordOnProfile: data.showDiscordOnProfile,
          showGithubOnProfile: data.showGithubOnProfile
      });

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

  const handleAvatarSourceChange = (source: AvatarSource) => {
    setAvatarSource(source);
    if (source === 'github' && githubUserDetails?.avatar_url) {
      form.setValue('avatar', githubUserDetails.avatar_url, { shouldDirty: true });
    } else if (source === 'discord' && discordUserDetails?.avatar) {
      form.setValue('avatar', `https://cdn.discordapp.com/avatars/${discordUserDetails.id}/${discordUserDetails.avatar}.png`, { shouldDirty: true });
    }
  };

  const handleConnectGitHub = () => {
    window.location.href = `/api/auth/github/oauth/login?redirectTo=/profile`;
  };

  const handleDisconnectGitHub = () => {
     const dummyFormData = new FormData();
     startTransition(() => {
        disconnectGithubFormAction(dummyFormData);
     });
  };

  const handleConnectDiscord = () => {
    window.location.href = `/api/auth/discord/oauth/login?redirectTo=/profile`;
  };

  const handleDisconnectDiscord = () => {
      const dummyFormData = new FormData();
      startTransition(() => {
          disconnectDiscordFormAction(dummyFormData);
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
                {user.bio && <p className="text-sm text-muted-foreground pt-2 italic">"{user.bio}"</p>}
                 {user.websiteUrl && <a href={user.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center justify-center gap-1 pt-1"><Globe className="h-4 w-4"/>{user.websiteUrl}</a>}
              </>
            ) : (
               <CardTitle className="text-2xl">Edit Profile</CardTitle>
            )}
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...form.register("name")} />
                  {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...form.register("email")} />
                   {form.formState.errors.email && <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" placeholder="Tell us a little about yourself..." {...form.register("bio")} />
                  {form.formState.errors.bio && <p className="text-sm text-destructive">{form.formState.errors.bio.message}</p>}
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input id="websiteUrl" placeholder="https://your-website.com" {...form.register("websiteUrl")} />
                  {form.formState.errors.websiteUrl && <p className="text-sm text-destructive">{form.formState.errors.websiteUrl.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="avatar" placeholder="https://example.com/avatar.png" {...form.register("avatar")} className="pl-10" onFocus={() => setAvatarSource('flowup')} />
                  </div>
                  {form.formState.errors.avatar && <p className="text-sm text-destructive">{form.formState.errors.avatar.message}</p>}
                </div>
                <Card className="p-4 bg-muted/30">
                  <h4 className="font-semibold mb-2">Avatar Source</h4>
                   <RadioGroup value={avatarSource} onValueChange={handleAvatarSourceChange}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="flowup" id="r-flowup" />
                        <Label htmlFor="r-flowup">Use Custom Avatar URL</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="github" id="r-github" disabled={!githubUserDetails}/>
                        <Label htmlFor="r-github" className={!githubUserDetails ? "text-muted-foreground" : ""}>Use GitHub Profile Picture</Label>
                         {githubUserDetails && <Avatar className="h-5 w-5 inline-block"><AvatarImage src={githubUserDetails.avatar_url} /></Avatar>}
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="discord" id="r-discord" disabled={!discordUserDetails} />
                        <Label htmlFor="r-discord" className={!discordUserDetails ? "text-muted-foreground" : ""}>Use Discord Profile Picture</Label>
                        {discordUserDetails?.avatar && <Avatar className="h-5 w-5 inline-block"><AvatarImage src={`https://cdn.discordapp.com/avatars/${discordUserDetails.id}/${discordUserDetails.avatar}.png`} /></Avatar>}
                      </div>
                   </RadioGroup>
                </Card>
                <Card className="p-4 bg-muted/30 space-y-3">
                     <h4 className="font-semibold">Public Profile Visibility</h4>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="showGithub" className="flex flex-col">
                            <span>Show GitHub Connection</span>
                            <span className="text-xs font-normal text-muted-foreground">Allow others to see your linked GitHub profile.</span>
                        </Label>
                        <Switch id="showGithub" checked={form.watch('showGithubOnProfile')} onCheckedChange={(c) => form.setValue('showGithubOnProfile', c)} disabled={!githubToken}/>
                    </div>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="showDiscord" className="flex flex-col">
                            <span>Show Discord Connection</span>
                            <span className="text-xs font-normal text-muted-foreground">Allow others to see your linked Discord username.</span>
                        </Label>
                        <Switch id="showDiscord" checked={form.watch('showDiscordOnProfile')} onCheckedChange={(c) => form.setValue('showDiscordOnProfile', c)} disabled={!discordUserDetails}/>
                    </div>
                </Card>
              </div>
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
              <Button variant="ghost" type="button" onClick={() => { setIsEditing(false); form.reset(user); }}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Saving...</> : "Save Changes"}
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
                <form action={disconnectGithubFormAction}>
                  <Button variant="outline" type="submit" disabled={isDisconnectGithubPending}>
                    {isDisconnectGithubPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <PowerOff className="mr-2 h-4 w-4" />}
                    Disconnect
                  </Button>
                </form>
              ) : (
                <Button onClick={handleConnectGitHub}>
                  <Github className="mr-2 h-4 w-4" /> Connect
                </Button>
              )}
            </div>
          </Card>

          {/* Discord Connection */}
           <Card className="p-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-[#5865F2]" />
                <div>
                  <h4 className="font-semibold">Discord</h4>
                  {isLoadingDiscord ? (
                      <Skeleton className="h-4 w-32 mt-1" />
                  ) : discordUserDetails ? (
                     <div className="text-sm text-muted-foreground">
                        Connected as: <span className="font-medium text-primary">{discordUserDetails.username}#{discordUserDetails.discriminator}</span>
                        {discordUserDetails.avatar && (
                            <Avatar className="h-5 w-5 inline-block ml-2 align-middle">
                                <AvatarImage src={`https://cdn.discordapp.com/avatars/${discordUserDetails.id}/${discordUserDetails.avatar}.png`} alt={discordUserDetails.username} data-ai-hint="discord avatar" />
                                <AvatarFallback>{getInitials(discordUserDetails.username)}</AvatarFallback>
                            </Avatar>
                        )}
                     </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not Connected. Connect to enable DM notifications.</p>
                  )}
                </div>
              </div>
               {isLoadingDiscord ? (
                 <Skeleton className="h-9 w-24" />
              ) : discordUserDetails ? (
                <form action={disconnectDiscordFormAction}>
                  <Button variant="outline" type="submit" disabled={isDisconnectDiscordPending}>
                    {isDisconnectDiscordPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <PowerOff className="mr-2 h-4 w-4" />}
                    Disconnect
                  </Button>
                </form>
              ) : (
                <Button onClick={handleConnectDiscord}>
                  <MessageSquare className="mr-2 h-4 w-4" /> Connect
                </Button>
              )}
            </div>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
