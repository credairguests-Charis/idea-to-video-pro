import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Check, Plus, Link2, ArrowUp, Image, FileText, X, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import charisLogo from "@/assets/charis-logo-icon.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentLog {
  id: string;
  step_name: string;
  status: string;
  tool_name?: string;
  input_data?: any;
  output_data?: any;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  isUploading?: boolean;
}

interface AgentChatPanelProps {
  logs: AgentLog[];
  isRunning: boolean;
  userPrompt?: string;
  onSubmit: (brandData: any) => void;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export function AgentChatPanel({ logs, isRunning, userPrompt, onSubmit }: AgentChatPanelProps) {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll task list
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && uploadedFiles.length === 0) || isRunning) return;

    onSubmit({
      prompt: inputValue.trim(),
      brandName: "Agent Query",
      competitorQuery: inputValue.trim(),
      attachedFiles: uploadedFiles.map(f => ({ name: f.name, url: f.url, type: f.type })),
    });
    setInputValue("");
    setUploadedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!user) {
      toast.error("Please sign in to upload files");
      return null;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File ${file.name} exceeds 20MB limit`);
      return null;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`File type ${file.type} is not supported`);
      return null;
    }

    const tempId = crypto.randomUUID();
    const tempFile: UploadedFile = {
      id: tempId,
      name: file.name,
      type: file.type,
      size: file.size,
      url: '',
      isUploading: true
    };

    setUploadedFiles(prev => [...prev, tempFile]);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('agent-uploads')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('agent-uploads')
        .getPublicUrl(filePath);

      // Update the file with the actual URL
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === tempId 
            ? { ...f, url: urlData.publicUrl, isUploading: false }
            : f
        )
      );

      return { ...tempFile, url: urlData.publicUrl, isUploading: false };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${file.name}`);
      setUploadedFiles(prev => prev.filter(f => f.id !== tempId));
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const files = e.target.files;
    if (!files) return;

    if (uploadedFiles.length + files.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    for (const file of Array.from(files)) {
      await uploadFile(file);
    }

    // Reset input
    e.target.value = '';
    setIsUploadMenuOpen(false);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Convert logs to task items
  const taskItems = logs.map((log) => ({
    id: log.id,
    icon: log.status === "success" || log.status === "completed" ? "check" : 
          log.status === "running" || log.status === "in_progress" ? "loading" : "search",
    text: log.step_name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    status: log.status,
  }));

  const getTaskIcon = (icon: string, status: string) => {
    if (status === "running" || status === "in_progress") {
      return <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />;
    }
    if (status === "success" || status === "completed") {
      return <Check className="h-3.5 w-3.5 text-green-600" />;
    }
    return <Search className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-3.5 w-3.5" />;
    }
    return <FileText className="h-3.5 w-3.5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-border/40">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.txt,.csv,.json,.doc,.docx"
        multiple
        onChange={(e) => handleFileSelect(e, false)}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={(e) => handleFileSelect(e, true)}
      />

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User Message Bubble */}
        {userPrompt && (
          <div className="bg-[#F3F4F6] rounded-lg p-3.5 text-sm text-foreground leading-relaxed">
            {userPrompt}
          </div>
        )}

        {/* Agent Response */}
        {userPrompt && (
          <div className="space-y-3">
            {/* Agent Header */}
            <div className="flex items-center gap-2">
              <img src={charisLogo} alt="Charis" className="w-5 h-5 rounded" />
              <span className="text-sm font-medium text-foreground">Charis</span>
            </div>
            
            {/* Agent Message */}
            <div className="text-sm text-foreground leading-relaxed">
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing your request...
                </span>
              ) : logs.length > 0 ? (
                "I've completed the analysis. Check the results on the right panel."
              ) : (
                "I'll build a targeted list based on your criteria."
              )}
            </div>
          </div>
        )}

        {/* Task List Container */}
        {(taskItems.length > 0 || isRunning) && (
          <div className="bg-[#F9FAFB] rounded-lg p-3 border border-border/30">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-medium text-foreground">
                Build<span className="text-primary">ing</span> <span className="text-primary">Agent</span> task list
              </span>
            </div>
            
            <ScrollArea ref={scrollRef} className="max-h-[240px]">
              <div className="space-y-0.5">
                {taskItems.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 py-1.5 px-1.5 rounded text-muted-foreground"
                  >
                    {getTaskIcon(task.icon, task.status)}
                    <span className="text-sm truncate">
                      {task.text}
                    </span>
                  </div>
                ))}
                
                {isRunning && (
                  <div className="flex items-center gap-2 py-1.5 px-1.5">
                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Processing...</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {!userPrompt && taskItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Search className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-1.5">Start a conversation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ask Charis to analyze competitors, research trends, or generate insights.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Input - Sticky */}
      <div className="p-3 bg-[#F9FAFB] border-t border-border/30">
        {/* Uploaded Files Preview */}
        {uploadedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 bg-white border border-border/50 rounded-md px-2 py-1.5 text-xs"
              >
                {file.isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  getFileIcon(file.type)
                )}
                <span className="max-w-[100px] truncate text-foreground">{file.name}</span>
                <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                {!file.isUploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="relative bg-white rounded-lg border border-border/50 shadow-sm">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Plan, search, or enrich your data..."
              disabled={isRunning}
              rows={1}
              className="w-full px-3.5 py-3 pr-28 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/60 disabled:opacity-50 min-h-[44px]"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {/* File Upload Dropdown */}
              <DropdownMenu open={isUploadMenuOpen} onOpenChange={setIsUploadMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isRunning || uploadedFiles.length >= MAX_FILES}
                    className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                    title="Upload files"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => imageInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <Image className="h-4 w-4 mr-2" />
                    Upload Image
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Document
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                title="Add link"
              >
                <Link2 className="h-4 w-4" />
              </button>
              <button
                type="submit"
                disabled={(!inputValue.trim() && uploadedFiles.length === 0) || isRunning || uploadedFiles.some(f => f.isUploading)}
                className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send"
              >
                <ArrowUp className="h-4 w-4 text-background" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
