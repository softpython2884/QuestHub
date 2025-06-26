
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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createFlowAppAction } from '../actions';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import type { FlowAppScope } from '@/types';
import { ALL_SCOPES } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

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

const ScopeSelector = ({ form, isSubmitting }: { form: ReturnType<typeof useForm<FlowAppFormValues>>, isSubmitting: boolean }) => {
    return (
        <FormField
          control={form.control}
          name="scopes"
          render={({ field }) => (
            <FormItem>
              <div className="mb-2">
                <FormLabel className="text-base">Permissions (Scopes)</FormLabel>
                <FormDescription>Select what this application will be allowed to do.</FormDescription>
              </div>
              <Accordion type="multiple" className="w-full max-h-64 overflow-y-auto pr-3 rounded-md border p-2">
                {Object.entries(groupedScopes).map(([category, scopesInCategory]) => {
                  const categoryScopeIds = scopesInCategory.map(s => s.id);
                  const selectedScopes = field.value || [];
                  const allInCategorySelected = categoryScopeIds.every(id => selectedScopes.includes(id));
                  
                  const handleCategoryChange = (checked: boolean) => {
                    let currentScopes = form.getValues('scopes') || [];
                    let newScopes;
                    if (checked) {
                      newScopes = [...new Set([...currentScopes, ...categoryScopeIds])];
                    } else {
                      newScopes = currentScopes.filter((s: string) => !categoryScopeIds.includes(s));
                    }
                    form.setValue('scopes', newScopes, { shouldDirty: true, shouldValidate: true });
                  };

                  return (
                    <AccordionItem value={category} key={category} className="border-b-0">
                       <div className="flex items-center hover:bg-accent/50 rounded-md transition-colors pr-4">
                          <div className="p-2 flex-shrink-0">
                              <Checkbox
                                  checked={allInCategorySelected}
                                  onCheckedChange={handleCategoryChange}
                                  aria-label={`Select all ${category} scopes`}
                              />
                          </div>
                          <AccordionTrigger className="py-2 px-0 flex-1 text-left no-underline hover:no-underline">
                               <span className="font-medium text-sm">{category}</span>
                          </AccordionTrigger>
                       </div>
                      <AccordionContent className="pt-2 pl-8 space-y-4">
                        {scopesInCategory.map((item) => (
                           <Controller
                              key={item.id}
                              name="scopes"
                              control={form.control}
                              render={({ field: controllerField }) => {
                                const isChecked = (controllerField.value || []).includes(item.id);
                                return (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                      <FormControl>
                                      <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                              const currentVal = controllerField.value || [];
                                              const newVal = checked
                                              ? [...currentVal, item.id]
                                              : currentVal.filter((value: string) => value !== item.id);
                                              controllerField.onChange(newVal);
                                          }}
                                          disabled={isSubmitting}
                                      />
                                      </FormControl>
                                      <div className="flex flex-col">
                                          <FormLabel className="font-normal text-sm">{item.id}</FormLabel>
                                          <FormDescription className="!mt-0.5 text-xs">{item.description}</FormDescription>
                                      </div>
                                  </FormItem>
                                );
                              }}
                            />
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
              <FormMessage />
            </FormItem>
          )}
        />
    );
};


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
                            <ScopeSelector form={flowAppForm} isSubmitting={isCreatingFlowApp} />
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
