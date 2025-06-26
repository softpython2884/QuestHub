
'use client';

import { useState, useEffect, useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createOAuthAppAction } from '../actions';
import { ArrowLeft, KeyRound, Loader2, Copy, Check, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';

const oAuthAppFormSchema = z.object({
  name: z.string().min(3, "App name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description cannot exceed 200 characters.").optional(),
  redirectUris: z.string().min(1, "At least one Redirect URI is required.").refine(
    (value) => {
      const uris = value.split('\n').map(uri => uri.trim()).filter(Boolean);
      try {
        uris.forEach(uri => new URL(uri));
        return true;
      } catch {
        return false;
      }
    },
    "Please enter valid URLs, one per line."
  ),
  website: z.string().url("Please enter a valid website URL.").optional().or(z.literal('')),
});
type OAuthAppFormValues = z.infer<typeof oAuthAppFormSchema>;


export default function NewOAuthAppPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [createdOauthAppDetails, setCreatedOauthAppDetails] = useState<{ name: string; clientId: string; clientSecret: string } | null>(null);

    const [createOauthState, createOauthFormAction, isCreatingOauth] = useActionState(createOAuthAppAction, { message: "", error: ""});
    const oauthForm = useForm<OAuthAppFormValues>({ resolver: zodResolver(oAuthAppFormSchema), defaultValues: { name: '', description: '', redirectUris: '', website: '' } });

    useEffect(() => {
        if (createOauthState?.message && !createOauthState.error && createOauthState.createdApp) {
            toast({ title: "Success", description: createOauthState.message });
            setCreatedOauthAppDetails(createOauthState.createdApp);
            oauthForm.reset();
        }
        if (createOauthState?.error) {
            if (createOauthState.fieldErrors) {
                Object.entries(createOauthState.fieldErrors).forEach(([field, errors]) => {
                    if (errors) {
                    // @ts-ignore
                    oauthForm.setError(field, { type: 'manual', message: errors.join(', ') });
                    }
                });
            } else {
            toast({ variant: "destructive", title: "Creation Error", description: createOauthState.error });
            }
        }
    }, [createOauthState, toast, oauthForm]);

    if (createdOauthAppDetails) {
        return <CreatedAppDetails app={createdOauthAppDetails} onDone={() => router.push('/settings/developer')} />
    }

    return (
        <div className="space-y-6">
            <Button variant="outline" asChild>
                <Link href="/settings/developer">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Developer Settings
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-headline flex items-center"><KeyRound className="mr-2 h-6 w-6 text-primary"/>Register a New OAuth Application</CardTitle>
                    <CardDescription>
                        Provide details for your new application. Redirect URIs are required for the OAuth flow.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...oauthForm}>
                        <form action={createOauthFormAction} className="space-y-6">
                            <FormField control={oauthForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Application Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., My Cool Integration"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={oauthForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={oauthForm.control} name="website" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Homepage URL (Optional)</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://myapp.com"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={oauthForm.control} name="redirectUris" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Authorization callback URLs</FormLabel>
                                <FormControl><Textarea {...field} rows={3} placeholder="https://myapp.com/callback&#x0a;http://localhost:3000/callback"/></FormControl>
                                <FormDescription>Enter one URL per line. These are the URLs FlowUp will redirect to after a user authorizes your app.</FormDescription>
                                <FormMessage />
                            </FormItem>
                            )}/>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" disabled={isCreatingOauth} asChild>
                                    <Link href="/settings/developer">Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={isCreatingOauth}>
                                    {isCreatingOauth && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Register Application
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

function CreatedAppDetails({ app, onDone }: { app: { name: string; clientId: string, clientSecret: string }, onDone: () => void }) {
    const [copied, setCopied] = useState<'clientId' | 'clientSecret' | null>(null);
    
    const copyToClipboard = (text: string, type: 'clientId' | 'clientSecret') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>Application Created: {app.name}</CardTitle>
                <CardDescription>
                    Your application has been registered. Here are your client credentials.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
                <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-md text-destructive flex items-start gap-3">
                    <Info className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                    <p className="text-sm">This is the only time your Client Secret will be displayed. Store it securely.</p>
                </div>
                <div>
                    <Label>Client ID</Label>
                    <div className="flex items-center gap-2">
                    <Input readOnly value={app.clientId || ''} className="font-mono"/>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(app.clientId || '', 'clientId')}>
                        {copied === 'clientId' ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                    </Button>
                    </div>
                </div>
                <div>
                    <Label>Client Secret</Label>
                    <div className="flex items-center gap-2">
                    <Input readOnly value={app.clientSecret || ''} className="font-mono"/>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(app.clientSecret || '', 'clientSecret')}>
                        {copied === 'clientSecret' ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
                    </Button>
                    </div>
                </div>
            </CardContent>
            <CardContent>
                 <Button onClick={onDone} className="w-full">Done</Button>
            </CardContent>
        </Card>
    );
}
