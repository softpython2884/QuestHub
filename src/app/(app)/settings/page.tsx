

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Palette, Shield, Code2, MessageSquare, Sun, Moon, Laptop, Info, GitBranch, KeyRound, Copy, Check, Send, Github, HardDrive, Database } from "lucide-react";
import Link from 'next/link';
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect, useTransition, useActionState } from "react";
import { fetchDiscordUserDetailsAction } from "../projects/[id]/actions";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { getRegistrationModeAction, updateRegistrationModeAction, generateInviteLinkAction, getStorageBackendSettingAction, updateStorageBackendSettingAction, runDatabaseMigrationsAction } from "./actions";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";


export default function SettingsPage() {
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [discordConnected, setDiscordConnected] = useState(false);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);
  
  const [registrationMode, setRegistrationMode] = useState<'public' | 'private'>('public');
  const [isLoadingRegMode, setIsLoadingRegMode] = useState(true);

  const [storageBackend, setStorageBackend] = useState<'github' | 'local'>('github');
  const [isLoadingStorageMode, setIsLoadingStorageMode] = useState(true);
  
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const [migrationState, runMigrationAction, isMigrating] = useActionState(runDatabaseMigrationsAction, { success: false, message: '', error: undefined });


  useEffect(() => {
    if (user) {
        setIsLoadingDiscord(true);
        fetchDiscordUserDetailsAction().then(details => {
            setDiscordConnected(!!details);
            setIsLoadingDiscord(false);
        });

        if (user.role === 'admin') {
            setIsLoadingRegMode(true);
            getRegistrationModeAction().then(mode => {
                setRegistrationMode(mode);
                setIsLoadingRegMode(false);
            });
            setIsLoadingStorageMode(true);
            getStorageBackendSettingAction().then(mode => {
                setStorageBackend(mode);
                setIsLoadingStorageMode(false);
            })
        } else {
            setIsLoadingRegMode(false);
            setIsLoadingStorageMode(false);
        }
    }
  }, [user]);
  
  useEffect(() => {
      if (migrationState.message && !isMigrating) {
          if (migrationState.success) {
              toast({ title: 'Database Migration', description: migrationState.message });
          } else if (migrationState.error) {
              toast({ variant: 'destructive', title: 'Migration Failed', description: migrationState.error });
          }
      }
  }, [migrationState, isMigrating, toast]);

  const handleRegModeChange = (newMode: 'public' | 'private') => {
      startTransition(async () => {
          const result = await updateRegistrationModeAction(newMode);
          if (result.success) {
              setRegistrationMode(newMode);
              toast({ title: 'Success', description: `Registration mode set to ${newMode}.` });
          } else {
              toast({ variant: 'destructive', title: 'Error', description: result.error });
          }
      });
  };

  const handleStorageModeChange = (newMode: 'github' | 'local') => {
      startTransition(async () => {
          const result = await updateStorageBackendSettingAction(newMode);
           if (result.success) {
              setStorageBackend(newMode);
              toast({ title: 'Success', description: `Default storage backend for new projects set to ${newMode}.` });
          } else {
              toast({ variant: 'destructive', title: 'Error', description: result.error });
          }
      });
  };
  
  const handleGenerateInvite = async () => {
      setIsGeneratingLink(true);
      const result = await generateInviteLinkAction(inviteEmail, inviteRole);
      if (result.link) {
          setGeneratedLink(result.link);
      } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
      setIsGeneratingLink(false);
  };
  
  const copyInviteLink = () => {
      if (!generatedLink) return;
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-headline font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary"/> Notification Preferences</CardTitle>
            <CardDescription>Control how you receive notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
              <label htmlFor="in-app-notifications" className="flex flex-col space-y-1">
                <span>In-App Notifications</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Show alerts inside FlowUp.
                </span>
              </label>
              <Switch id="in-app-notifications" checked disabled />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="discord-dm-notifications" className="flex flex-col space-y-1">
                <span>Discord Security Alerts</span>
                <span className="font-normal leading-snug text-muted-foreground text-xs">
                  Receive DMs for important account events.
                </span>
              </label>
              <Switch id="discord-dm-notifications" disabled={!discordConnected || isLoadingDiscord} />
            </div>
            <p className="text-xs text-muted-foreground pt-2">Project-specific notifications can be configured within each project's settings.</p>
            {!discordConnected && !isLoadingDiscord && 
              <div className="text-sm text-amber-600 flex items-center gap-2">
                <Info className="h-4 w-4" />
                <span>
                    <Link href="/profile" className="underline font-medium">Connect your Discord account</Link> to enable DM notifications.
                </span>
              </div>}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Appearance</CardTitle>
            <CardDescription>Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" onClick={() => setTheme('light')}><Sun className="mr-2"/>Light</Button>
                    <Button variant="outline" onClick={() => setTheme('dark')}><Moon className="mr-2"/>Dark</Button>
                    <Button variant="outline" onClick={() => setTheme('system')}><Laptop className="mr-2"/>System</Button>
                </div>
            </div>
             <p className="text-sm text-muted-foreground text-center pt-4">More themes coming soon!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-primary"/> Security</CardTitle>
            <CardDescription>Manage your account security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Button variant="outline" className="w-full" disabled>Change Password (Coming Soon)</Button>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                 <label htmlFor="2fa" className="flex flex-col space-y-1">
                    <span>Two-Factor Authentication</span>
                    <span className="font-normal leading-snug text-muted-foreground text-xs">
                        {discordConnected ? "Ready to enable. Requires Discord DMs." : "Connect Discord to enable 2FA."}
                    </span>
                </label>
                <Switch id="2fa" disabled={!discordConnected || isLoadingDiscord} />
             </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Code2 className="mr-2 h-5 w-5 text-primary"/> Developer Settings</CardTitle>
            <CardDescription>Manage your API keys and OAuth applications.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" asChild>
              <Link href="/settings/developer">Manage Applications</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       {user?.role === 'admin' && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center"><Shield className="mr-2 h-6 w-6 text-primary"/>Admin Panel</CardTitle>
            <CardDescription>Global settings for this FlowUp instance. Changes here affect all users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">Instance Configuration</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="server-name" className="flex flex-col">
                  <span>Server Name</span>
                  <span className="text-xs font-normal text-muted-foreground">Appears in titles and notifications.</span>
                </Label>
                <Input id="server-name" className="max-w-xs" placeholder="FlowUp" disabled />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="global-webhook" className="flex flex-col">
                  <span>Global Webhook URL</span>
                  <span className="text-xs font-normal text-muted-foreground">Send all platform events to this single webhook.</span>
                </Label>
                 <Input id="global-webhook" className="max-w-xs" placeholder="https://your-service.com/webhook" disabled />
              </div>
            </div>
            
            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">User & Project Policies</h4>
               <div className="flex items-start justify-between">
                <Label className="flex flex-col pr-4">
                  <span>Registration Mode</span>
                  <span className="text-xs font-normal text-muted-foreground">Control how new users can sign up.</span>
                </Label>
                 {isLoadingRegMode ? <Loader2 className="h-5 w-5 animate-spin" /> :
                    <RadioGroup value={registrationMode} onValueChange={(v) => handleRegModeChange(v as 'public' | 'private')} className="flex items-center gap-4" disabled={isPending}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="public" id="reg-public" />
                            <Label htmlFor="reg-public">Public</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="private" id="reg-invite" />
                            <Label htmlFor="reg-invite">Invite-Only</Label>
                        </div>
                    </RadioGroup>
                 }
              </div>
              {registrationMode === 'private' && (
                  <Card className="bg-muted/50 p-4">
                      <CardTitle className="text-base mb-2">Invite New User</CardTitle>
                      <CardDescription className="text-xs mb-3">Generate a single-use registration link for a new user. The link will expire in 7 days.</CardDescription>
                      <div className="flex flex-col sm:flex-row gap-2">
                          <Input placeholder="user@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} disabled={isGeneratingLink} />
                          <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)} disabled={isGeneratingLink}>
                              <SelectTrigger className="w-full sm:w-[180px]">
                                  <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="member">Member</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                          </Select>
                          <Button onClick={handleGenerateInvite} disabled={isGeneratingLink || !inviteEmail}>
                              {isGeneratingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                              Generate Link
                          </Button>
                      </div>
                  </Card>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="allow-public-github" className="flex flex-col">
                  <span>Allow Public GitHub Repos</span>
                  <span className="text-xs font-normal text-muted-foreground">Allow users to set project repositories to public.</span>
                </Label>
                <Switch id="allow-public-github" disabled />
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h4 className="font-medium">Storage & Maintenance</h4>
              <div className="flex items-start justify-between">
                <Label className="flex flex-col pr-4">
                  <span>Default Storage Backend</span>
                  <span className="text-xs font-normal text-muted-foreground">Choose where new project files are stored.</span>
                </Label>
                 {isLoadingStorageMode ? <Loader2 className="h-5 w-5 animate-spin" /> :
                    <RadioGroup value={storageBackend} onValueChange={(v) => handleStorageModeChange(v as 'github' | 'local')} className="flex items-center gap-4" disabled={isPending}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="github" id="store-github" />
                            <Label htmlFor="store-github" className="flex items-center gap-2"><Github className="h-4 w-4" />GitHub</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="local" id="store-local" />
                            <Label htmlFor="store-local" className="flex items-center gap-2"><HardDrive className="h-4 w-4" />Local</Label>
                        </div>
                    </RadioGroup>
                 }
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex flex-col">
                  <span>Database Schema</span>
                  <span className="text-xs font-normal text-muted-foreground">Apply new schema updates after a code update.</span>
                </Label>
                 <Button variant="outline" onClick={() => runMigrationAction()} disabled={isMigrating}>
                    {isMigrating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                     Update Database Schema
                 </Button>
              </div>
               <div className="flex items-center justify-between">
                <Label className="flex flex-col">
                  <span>Plugin System</span>
                  <span className="text-xs font-normal text-muted-foreground">Enable or disable third-party plugins.</span>
                </Label>
                <Button variant="outline" disabled>Manage Plugins (Soon)</Button>
              </div>
            </div>

          </CardContent>
          <CardFooter>
            <Button disabled>Save Admin Settings (Coming Soon)</Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={!!generatedLink} onOpenChange={() => setGeneratedLink(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Invite Link Generated</DialogTitle>
                <DialogDescription>
                    Share this link with {inviteEmail}. It can only be used once and will expire in 7 days.
                </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
                <Input value={generatedLink || ''} readOnly />
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
            <DialogFooter>
                <Button onClick={() => setGeneratedLink(null)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
