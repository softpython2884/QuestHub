
'use client';

import { useState, useEffect, useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createFlowAppAction } from '../actions';
import { ArrowLeft, Bot, Loader2, KeyRound, Copy, Check } from 'lucide-react';
import type { FlowAppScope } from '@/types';
import { ALL_SCOPES } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const flowAppFormSchema = z.object({
  name: z.string().min(3, "App name must be at least 3 characters.").max(50),
  description: z.string().max(200, "Description cannot exceed 200 characters.").optional(),
  scopes: z.array(z.string()).refine(value => value.length > 0, {
    message: "You have to select at least one scope.",
  }),
});
type FlowAppFormValues = z.infer<typeof flowAppFormSchema>;

const groupedScopes = ALL_SCOPES.reduce((acc, scope) => {
    const category = scope.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(scope);
    return acc;
}, {} as Record<string, typeof ALL_SCOPES>);


export default function NewFlowAppPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [createdFlowApp, setCreatedFlowApp] = useState<{ name: string; token: string } | null>(null);

    const [createFlowAppState, createFlowAppFormAction, isCreatingFlowApp] = useActionState(createFlowAppAction, { message: "", error: ""});
    const flowAppForm = useForm<FlowAppFormValues>({ resolver: zodResolver(flowAppFormSchema), defaultValues: { name: '', description: '', scopes: [] } });

    useEffect(() => {
        if (createFlowAppState?.message && !createFlowAppState.error && createFlowAppState.createdApp) {
            toast({ title: "Success", description: createFlowAppState.message });
            setCreatedFlowApp(createFlowAppState.createdApp);
            flowAppForm.reset();
        }
        if (createFlowAppState?.error) {
            if (createFlowAppState.fieldErrors) {
                Object.entries(createFlowAppState.fieldErrors).forEach(([field, errors]) => {
                    if (errors) {
                    // @ts-ignore
                    flowAppForm.setError(field, { type: 'manual', message: errors.join(', ') });
                    }
                });
            } else {
                toast({ variant: "destructive", title: "Creation Error", description: createFlowAppState.error });
            }
        }
    }, [createFlowAppState, toast, flowAppForm]);


    if (createdFlowApp) {
        return <CreatedFlowAppDetails app={createdFlowApp} onDone={() => router.push('/settings/developer')} />
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
                    <CardTitle className="text-2xl font-headline flex items-center"><Bot className="mr-2 h-6 w-6 text-primary"/>Create New FlowApp</CardTitle>
                    <CardDescription>
                        This will generate a personal access token. Select the permissions this token will have.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...flowAppForm}>
                        <form action={createFlowAppFormAction} className="space-y-6">
                            <FormField control={flowAppForm.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>FlowApp Name</FormLabel>
                                    <FormControl><Input {...field} placeholder="e.g., My CI/CD Script"/></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={flowAppForm.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl><Textarea {...field} rows={2} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                             <FormField
                                control={flowAppForm.control}
                                name="scopes"
                                render={() => (
                                    <FormItem>
                                        <div className="mb-2">
                                            <FormLabel className="text-base">Permissions (Scopes)</FormLabel>
                                            <FormDescription>Select what this application will be allowed to do.</FormDescription>
                                        </div>
                                        <div className="space-y-4 rounded-md border p-4">
                                            {Object.entries(groupedScopes).map(([category, scopesInCategory]) => (
                                                <div key={category}>
                                                    <h4 className="font-medium mb-2 border-b pb-1">{category}</h4>
                                                    <div className="space-y-3 pl-2">
                                                        {scopesInCategory.map((item) => (
                                                            <FormField
                                                                key={item.id}
                                                                control={flowAppForm.control}
                                                                name="scopes"
                                                                render={({ field }) => {
                                                                    return (
                                                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(item.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                    ? field.onChange([...(field.value || []), item.id])
                                                                                    : field.onChange(
                                                                                        (field.value || []).filter(
                                                                                            (value) => value !== item.id
                                                                                        )
                                                                                    )
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <div className="space-y-1 leading-none">
                                                                            <FormLabel className="font-normal">{item.id}</FormLabel>
                                                                            <FormDescription>{item.description}</FormDescription>
                                                                        </div>
                                                                    </FormItem>
                                                                    )
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" disabled={isCreatingFlowApp} asChild>
                                    <Link href="/settings/developer">Cancel</Link>
                                </Button>
                                <Button type="submit" disabled={isCreatingFlowApp}>
                                    {isCreatingFlowApp && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create FlowApp
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

function CreatedFlowAppDetails({ app, onDone }: { app: { name: string; token: string }, onDone: () => void }) {
    const [copied, setCopied] = useState(false);
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="max-w-xl mx-auto">
            <CardHeader>
                <CardTitle>FlowApp Created: {app.name}</CardTitle>
                <CardDescription>
                    Your personal access token has been generated.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-2">
                <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-md text-destructive flex items-start gap-3">
                    <p className="text-sm">This is the **only** time your token will be displayed. Copy it now and store it in a secure place.</p>
                </div>
                <div>
                    <Label>Personal Access Token</Label>
                    <div className="flex items-center gap-2">
                    <Input readOnly value={app.token || ''} className="font-mono"/>
                    <Button variant="outline" size="icon" onClick={() => copyToClipboard(app.token || '')}>
                        {copied ? <Check className="h-4 w-4 text-green-500"/> : <Copy className="h-4 w-4"/>}
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
