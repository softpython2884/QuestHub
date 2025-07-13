
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as UIDialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { generateDocumentContent } from '@/ai/flows/generate-document-content';
import { Loader2, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Link as LinkIcon, ImageIcon, Code2, Quote, Minus, Strikethrough, SquareCode, Sparkles, Tag, Link as ProjectLinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Project, GlobalDocument } from '@/types';


const documentEditorFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  content: z.string().optional(),
  tagsString: z.string().optional(),
  linkedProjectUuid: z.string().optional(),
});

type DocumentEditorFormValues = z.infer<typeof documentEditorFormSchema>;

interface DocumentEditorProps {
  initialData?: GlobalDocument | null;
  onSave: (data: { uuid?: string; title: string; content: string; tagsString?: string; linkedProjectUuid?: string | null }) => Promise<{ error?: string; savedEntity?: { uuid: string; title: string } }>;
  onSaveSuccess: (documentUuid: string) => void;
  onCancel: () => void;
  entityName: string;
  saveButtonText: string;
  createButtonText: string;
  showMetadataControls?: boolean;
  linkableProjects?: Pick<Project, 'uuid' | 'name'>[];
}

interface MarkdownTool {
  label: string;
  icon: React.ElementType;
  action: () => void;
}

export function DocumentEditor({
  initialData,
  onSave,
  onSaveSuccess,
  onCancel,
  entityName,
  saveButtonText,
  createButtonText,
  showMetadataControls = false,
  linkableProjects = [],
}: DocumentEditorProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // WYSIWYG-like state
  const [isEditingContent, setIsEditingContent] = useState(false);

  const form = useForm<DocumentEditorFormValues>({
    resolver: zodResolver(documentEditorFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      tagsString: initialData?.tags?.map(t => t.name).join(', ') || '',
      linkedProjectUuid: initialData?.linkedProject?.uuid || 'none',
    },
  });

  const contentValue = form.watch('content');
  const contentField = form.register('content');

  useEffect(() => {
    form.reset({
      title: initialData?.title || '',
      content: initialData?.content || '',
      tagsString: initialData?.tags?.map(t => t.name).join(', ') || '',
      linkedProjectUuid: initialData?.linkedProject?.uuid || 'none',
    });
  }, [initialData, form]);

  const applyMarkdownSyntax = (
    syntaxStart: string,
    syntaxEnd: string = '',
    _isBlock: boolean = false,
    prefixEachLine: boolean = false
  ) => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const selectedText = value.substring(selectionStart, selectionEnd);
    let newText = '';

    if (prefixEachLine && selectedText) {
      const lines = selectedText.split('\n');
      newText = lines.map(line => `${syntaxStart}${line}`).join('\n');
    } else if (selectedText) {
      newText = `${syntaxStart}${selectedText}${syntaxEnd}`;
    } else {
      newText = `${syntaxStart}${syntaxEnd}`;
    }

    const newValue = value.substring(0, selectionStart) + newText + value.substring(selectionEnd);
    form.setValue('content', newValue, { shouldValidate: true, shouldDirty: true });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        if (selectedText) {
          if (prefixEachLine) {
             textareaRef.current.selectionStart = selectionStart;
             textareaRef.current.selectionEnd = selectionEnd + (syntaxStart.length * selectedText.split('\n').length) ;
          } else {
            textareaRef.current.selectionStart = selectionStart + syntaxStart.length;
            textareaRef.current.selectionEnd = selectionEnd + syntaxStart.length;
          }
        } else {
          textareaRef.current.selectionStart = selectionStart + syntaxStart.length;
          textareaRef.current.selectionEnd = selectionStart + syntaxStart.length;
        }
      }
    }, 0);
  };

  const markdownTools: MarkdownTool[] = [
    { label: 'H1', icon: Heading1, action: () => applyMarkdownSyntax('# ', '', false, true) },
    { label: 'H2', icon: Heading2, action: () => applyMarkdownSyntax('## ', '', false, true) },
    { label: 'H3', icon: Heading3, action: () => applyMarkdownSyntax('### ', '', false, true) },
    { label: 'Bold', icon: Bold, action: () => applyMarkdownSyntax('**', '**') },
    { label: 'Italic', icon: Italic, action: () => applyMarkdownSyntax('*', '*') },
    { label: 'Strikethrough', icon: Strikethrough, action: () => applyMarkdownSyntax('~~', '~~') },
    { label: 'Unordered List', icon: List, action: () => applyMarkdownSyntax('- ', '', false, true) },
    { label: 'Ordered List', icon: ListOrdered, action: () => applyMarkdownSyntax('1. ', '', false, true) },
    { label: 'Link', icon: LinkIcon, action: () => applyMarkdownSyntax('[', '](url)') },
    { label: 'Image', icon: ImageIcon, action: () => applyMarkdownSyntax('![alt text](', 'image_url)') },
    { label: 'Code Block', icon: SquareCode, action: () => applyMarkdownSyntax('\n```\n', '\n```\n', true) },
    { label: 'Inline Code', icon: Code2, action: () => applyMarkdownSyntax('`', '`') },
    { label: 'Quote', icon: Quote, action: () => applyMarkdownSyntax('> ', '', false, true) },
    { label: 'Horizontal Line', icon: Minus, action: () => applyMarkdownSyntax('\n---\n', '', true) },
  ];

  const onSubmit = async (data: DocumentEditorFormValues) => {
    setIsSubmitting(true);
    
    const result = await onSave({ 
      uuid: initialData?.uuid,
      title: data.title,
      content: data.content || '',
      tagsString: data.tagsString,
      linkedProjectUuid: data.linkedProjectUuid === 'none' ? null : data.linkedProjectUuid,
    });

    setIsSubmitting(false);

    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else if (result.savedEntity) {
      toast({ title: 'Success', description: `${entityName} "${result.savedEntity.title}" saved.` });
      onSaveSuccess(result.savedEntity.uuid);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'An unknown error occurred.' });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
        toast({ variant: 'destructive', title: 'Error', description: 'AI prompt cannot be empty.' });
        return;
    }
    setIsAiGenerating(true);
    try {
        const result = await generateDocumentContent({ prompt: aiPrompt });
        if (result.data?.markdownContent) {
            form.setValue('content', result.data.markdownContent, { shouldValidate: true, shouldDirty: true });
            toast({ title: 'Success', description: 'AI generated content populated.' });
            setIsAiDialogOpen(false);
            setAiPrompt('');
        } else {
            toast({ variant: 'destructive', title: 'AI Error', description: result.error || 'AI failed to generate content.' });
        }
    } catch (error: any) {
        console.error("Error generating document with AI:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: error.message || 'Failed to generate content with AI.' });
    } finally {
        setIsAiGenerating(false);
    }
  };


  return (
    <>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                  <CardTitle className="text-2xl font-headline">
                  {initialData ? `Edit ${entityName}` : `Create New ${entityName}`}
                  </CardTitle>
                  <CardDescription>A Notion-style editor for a seamless writing experience.</CardDescription>
              </div>
              <Dialog open={isAiDialogOpen} onOpenChange={setIsAiDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" type="button">
                        <Sparkles className="mr-2 h-4 w-4 text-primary" /> Generate with AI
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" />Generate Document Content with AI</DialogTitle>
                        <UIDialogDescription>
                            Enter a prompt for the AI to generate the Markdown content for your document.
                        </UIDialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Label htmlFor="ai-prompt">Your Prompt</Label>
                        <Textarea
                            id="ai-prompt"
                            placeholder="e.g., 'Create a getting started guide for a new SaaS product focusing on user onboarding and key features like X, Y, and Z.'"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" disabled={isAiGenerating}>Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleAiGenerate} disabled={isAiGenerating || !aiPrompt.trim()}>
                            {isAiGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Content
                        </Button>
                    </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title" className="text-lg">Title</Label>
            <Input
              id="title"
              {...form.register('title')}
              className="mt-1 text-base"
              placeholder="Enter document title"
            />
            {form.formState.errors.title && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          {showMetadataControls && (
             <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="tagsString" className="text-base flex items-center mb-1"><Tag className="mr-2 h-4 w-4 text-muted-foreground"/>Tags</Label>
                    <Input
                        id="tagsString"
                        {...form.register('tagsString')}
                        placeholder="e.g., react, tutorial, api"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated list of tags.</p>
                </div>
                 <div>
                    <Label htmlFor="linkedProjectUuid" className="text-base flex items-center mb-1"><ProjectLinkIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Link Project (Optional)</Label>
                     <Controller
                        name="linkedProjectUuid"
                        control={form.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a project to link..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No linked project</SelectItem>
                                    {linkableProjects.map(p => (
                                        <SelectItem key={p.uuid} value={p.uuid}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                     <p className="text-xs text-muted-foreground mt-1">Associate this document with a public project.</p>
                </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label className="text-lg">Content</Label>
             <div className="flex flex-wrap gap-1 border p-2 rounded-t-md bg-muted/50 sticky top-[6.5rem] z-10">
                {markdownTools.map((tool) => (
                <Button
                    key={tool.label}
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={tool.action}
                    title={tool.label}
                    className="h-8 w-8"
                >
                    <tool.icon className="h-4 w-4" />
                </Button>
                ))}
            </div>
            <div 
              className={cn("border rounded-b-md p-4 min-h-[450px] bg-background focus-within:ring-2 focus-within:ring-ring")}
              onClick={() => {
                  setIsEditingContent(true);
                  setTimeout(() => textareaRef.current?.focus(), 0);
              }}
            >
              {isEditingContent ? (
                <Textarea
                    id="content"
                    {...contentField}
                    ref={(e) => {
                        contentField.ref(e);
                        textareaRef.current = e;
                    }}
                    className="w-full h-full min-h-[450px] p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none font-mono text-sm"
                    placeholder="Write your content here..."
                    onBlur={() => setIsEditingContent(false)}
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {contentValue || '*Click to start writing*'}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? saveButtonText : createButtonText}
            </Button>
          </div>
        </CardContent>
      </Card>
      </form>
    </>
  );
}
