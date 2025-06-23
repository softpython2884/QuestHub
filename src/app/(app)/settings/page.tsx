
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Palette, Shield, Code2, MessageSquare } from "lucide-react";
import Link from 'next/link';

export default function SettingsPage() {
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
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                 <MessageSquare className="h-8 w-8 text-[#5865F2]" />
                  <div className="flex flex-col">
                    <Label htmlFor="discord-notifications" className="font-semibold">
                      Discord Notifications
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      Receive DMs for important events.
                    </span>
                  </div>
              </div>
              <Button size="sm" asChild>
                <Link href="/profile">Manage</Link>
              </Button>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications" className="flex flex-col space-y-1">
                <span>In-App Notifications</span>
                <span className="font-normal leading-snug text-muted-foreground">
                  Show alerts within FlowUp.
                </span>
              </Label>
              <Switch id="push-notifications" disabled />
            </div>
            <p className="text-sm text-muted-foreground text-center pt-2">More notification channels coming soon!</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary"/> Appearance</CardTitle>
            <CardDescription>Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
              <Label htmlFor="dark-mode" className="flex flex-col space-y-1">
                <span>Dark Mode</span>
                 <span className="font-normal leading-snug text-muted-foreground">
                  Toggle between light and dark themes.
                </span>
              </Label>
              <Switch id="dark-mode" disabled />
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
             <Button variant="outline" className="w-full" disabled>Enable Two-Factor Authentication (Coming Soon)</Button>
             <p className="text-xs text-muted-foreground text-center">2FA will require a connected Discord account for DMs.</p>
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
