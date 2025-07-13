
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
import type { Project, GlobalDocument, DocAlbum } from '@/types';

const documentEditorFormSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(255),
  content: z.string().optional(),
  tagsString: z.string().optional(),
  linkedProjectUuid: z.string().optional(),
  albumUuid: z.string().optional(),
});

type DocumentEditorFormValues = z.infer<typeof documentEditorFormSchema>;

interface DocumentEditorProps {
  initialData?: GlobalDocument | null;
  onSave: (data: { uuid?: string; title: string; content: string; tagsString?: string; linkedProjectUuid?: string | null; albumUuid?: string | null }) => Promise<{ error?: string; savedEntity?: { uuid: string; title: string } }>;
  onSaveSuccess: (documentUuid: string) => void;
  onCancel: () => void;
  entityName: string;
  saveButtonText: string;
  createButtonText: string;
  showMetadataControls?: boolean;
  linkableProjects?: Pick<Project, 'uuid' | 'name'>[];
  albums?: DocAlbum[];
}

interface MarkdownTool {
  label: string;
  icon: React.ElementType;
  action: (textarea: HTMLTextAreaElement) => void;
}

// Notion-like Block component
const ContentBlock = ({
  blockContent,
  onUpdate,
  onFocus,
}: {
  blockContent: string;
  onUpdate: (newContent: string) => void;
  onFocus: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localContent, setLocalContent] = useState(blockContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalContent(blockContent);
  }, [blockContent]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, localContent]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localContent !== blockContent) {
      onUpdate(localContent);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
    }
  }

  if (isEditing) {
    return (
      <Textarea
        ref={textareaRef}
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        className="w-full p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-none font-mono text-sm"
        placeholder="Type '/' for commands..."
      />
    );
  }

  return (
    <div
      className="prose dark:prose-invert max-w-none min-h-[24px] cursor-text"
      onClick={() => setIsEditing(true)}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {localContent || '​'}
      </ReactMarkdown>
    </div>
  );
};

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
  albums = [],
}: DocumentEditorProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mainEditorRef = useRef<HTMLDivElement>(null);
  const [activeTextarea, setActiveTextarea] = useState<HTMLTextAreaElement | null>(null);

  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const form = useForm<DocumentEditorFormValues>({
    resolver: zodResolver(documentEditorFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      content: initialData?.content || '',
      tagsString: initialData?.tags?.map(t => t.name).join(', ') || '',
      linkedProjectUuid: initialData?.linkedProject?.uuid || 'none',
      albumUuid: initialData?.albums?.[0]?.uuid || 'no-album',
    },
  });

  const contentValue = form.watch('content');
  const contentBlocks = (contentValue || '').split('\n\n');

  useEffect(() => {
    form.reset({
      title: initialData?.title || '',
      content: initialData?.content || '',
      tagsString: initialData?.tags?.map(t => t.name).join(', ') || '',
      linkedProjectUuid: initialData?.linkedProject?.uuid || 'none',
      albumUuid: initialData?.albums?.[0]?.uuid || 'no-album',
    });
  }, [initialData, form]);

  const updateContentBlock = (index: number, newContent: string) => {
    const newBlocks = [...contentBlocks];
    newBlocks[index] = newContent;
    form.setValue('content', newBlocks.join('\n\n'), { shouldDirty: true });
  };


  const applyMarkdownSyntax = (
    syntaxStart: string,
    syntaxEnd: string = '',
    prefixEachLine: boolean = false
  ) => {
    if (!activeTextarea) return;
    const { selectionStart, selectionEnd, value } = activeTextarea;
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
    
    // This is tricky. We need to find which block this textarea belongs to.
    // For now, let's assume one active textarea. The parent component will handle state update.
    const event = new Event('input', { bubbles: true });
    activeTextarea.value = newValue;
    activeTextarea.dispatchEvent(event);


    setTimeout(() => {
      if (activeTextarea) {
        activeTextarea.focus();
        if (selectedText) {
           activeTextarea.selectionStart = selectionStart + syntaxStart.length;
           activeTextarea.selectionEnd = selectionEnd + syntaxStart.length;
        } else {
           activeTextarea.selectionStart = selectionStart + syntaxStart.length;
           activeTextarea.selectionEnd = selectionStart + syntaxStart.length;
        }
      }
    }, 0);
  };
  
  const markdownTools: MarkdownTool[] = [
    { label: 'H1', icon: Heading1, action: (ta) => applyMarkdownSyntax('# ', '', true) },
    { label: 'H2', icon: Heading2, action: (ta) => applyMarkdownSyntax('## ', '', true) },
    { label: 'H3', icon: Heading3, action: (ta) => applyMarkdownSyntax('### ', '', true) },
    { label: 'Bold', icon: Bold, action: (ta) => applyMarkdownSyntax('**', '**') },
    { label: 'Italic', icon: Italic, action: (ta) => applyMarkdownSyntax('*', '*') },
    { label: 'Strikethrough', icon: Strikethrough, action: (ta) => applyMarkdownSyntax('~~', '~~') },
    { label: 'Unordered List', icon: List, action: (ta) => applyMarkdownSyntax('- ', '', true) },
    { label: 'Ordered List', icon: ListOrdered, action: (ta) => applyMarkdownSyntax('1. ', '', true) },
    { label: 'Link', icon: LinkIcon, action: (ta) => applyMarkdownSyntax('[', '](url)') },
    { label: 'Image', icon: ImageIcon, action: (ta) => applyMarkdownSyntax('![alt text](', 'image_url)') },
    { label: 'Code Block', icon: SquareCode, action: (ta) => applyMarkdownSyntax('\n```\n', '\n```\n') },
    { label: 'Inline Code', icon: Code2, action: (ta) => applyMarkdownSyntax('`', '`') },
    { label: 'Quote', icon: Quote, action: (ta) => applyMarkdownSyntax('> ', '', true) },
    { label: 'Horizontal Line', icon: Minus, action: (ta) => applyMarkdownSyntax('\n---\n', '') },
  ];

  const onSubmit = async (data: DocumentEditorFormValues) => {
    setIsSubmitting(true);
    
    const result = await onSave({ 
      uuid: initialData?.uuid,
      title: data.title,
      content: data.content || '',
      tagsString: data.tagsString,
      linkedProjectUuid: data.linkedProjectUuid === 'none' ? null : data.linkedProjectUuid,
      albumUuid: data.albumUuid === 'no-album' ? null : data.albumUuid,
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
                            placeholder="e.g., 'Create a getting started guide for a new SaaS product...'"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            rows={5}
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="ghost" disabled={isAiGenerating}>Cancel</Button></DialogClose>
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
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <Label htmlFor="albumUuid" className="text-base flex items-center mb-1"><BookCopy className="mr-2 h-4 w-4 text-muted-foreground"/>Album</Label>
                     <Controller
                        name="albumUuid"
                        control={form.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'no-album'}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an album..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="no-album">No Album (Unassigned)</SelectItem>
                                    {albums && albums.map(a => (
                                        <SelectItem key={a.uuid} value={a.uuid}>{a.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                     <p className="text-xs text-muted-foreground mt-1">Organize this document into an album.</p>
                  </div>
                 <div>
                    <Label htmlFor="linkedProjectUuid" className="text-base flex items-center mb-1"><ProjectLinkIcon className="mr-2 h-4 w-4 text-muted-foreground"/>Link Project (Optional)</Label>
                     <Controller
                        name="linkedProjectUuid"
                        control={form.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value || 'none'}>
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
                    onClick={() => activeTextarea && tool.action(activeTextarea)}
                    title={tool.label}
                    className="h-8 w-8"
                    disabled={!activeTextarea}
                >
                    <tool.icon className="h-4 w-4" />
                </Button>
                ))}
            </div>
            <div 
              ref={mainEditorRef}
              className="border rounded-b-md p-4 min-h-[450px] bg-background focus-within:ring-2 focus-within:ring-ring space-y-2"
              onFocus={(e) => {
                  if (e.target.tagName === 'TEXTAREA') {
                      setActiveTextarea(e.target as HTMLTextAreaElement);
                  }
              }}
            >
              {contentBlocks.map((block, index) => (
                  <ContentBlock
                      key={index}
                      blockContent={block}
                      onUpdate={(newBlockContent) => updateContentBlock(index, newBlockContent)}
                      onFocus={() => {
                          const textarea = mainEditorRef.current?.querySelectorAll('textarea')[index];
                          if(textarea) setActiveTextarea(textarea);
                      }}
                  />
              ))}
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
