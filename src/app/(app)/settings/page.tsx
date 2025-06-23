
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Palette, Shield, Code2, MessageSquare, Sun, Moon, Laptop, Info } from "lucide-react";
import Link from 'next/link';
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { fetchDiscordUserDetailsAction } from "../projects/[id]/actions";

export default function SettingsPage() {
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const [discordConnected, setDiscordConnected] = useState(false);
  const [isLoadingDiscord, setIsLoadingDiscord] = useState(true);

  useEffect(() => {
    if (user) {
        setIsLoadingDiscord(true);
        fetchDiscordUserDetailsAction().then(details => {
            setDiscordConnected(!!details);
            setIsLoadingDiscord(false);
        });
    }
  }, [user]);

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
    </div>
  );
}
