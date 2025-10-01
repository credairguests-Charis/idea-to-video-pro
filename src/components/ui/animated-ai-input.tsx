"use client";

import { ArrowRight, Bot, Check, ChevronDown, Users, Upload, Mic, Volume2, Play, Pause, X } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";

interface UseAutoResizeTextareaProps {
    minHeight: number;
    maxHeight?: number;
}

function useAutoResizeTextarea({
    minHeight,
    maxHeight,
}: UseAutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = useCallback(
        (reset?: boolean) => {
            const textarea = textareaRef.current;
            if (!textarea) return;

            if (reset) {
                textarea.style.height = `${minHeight}px`;
                return;
            }

            textarea.style.height = `${minHeight}px`;

            const newHeight = Math.max(
                minHeight,
                Math.min(
                    textarea.scrollHeight,
                    maxHeight ?? Number.POSITIVE_INFINITY
                )
            );

            textarea.style.height = `${newHeight}px`;
        },
        [minHeight, maxHeight]
    );

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
        }
    }, [minHeight]);

    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [adjustHeight]);

    return { textareaRef, adjustHeight };
}

const OPENAI_ICON = (
    <>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 256 260"
            aria-label="OpenAI Icon"
            className="w-4 h-4 dark:hidden block"
        >
            <title>OpenAI Icon Light</title>
            <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
        </svg>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 256 260"
            aria-label="OpenAI Icon"
            className="w-4 h-4 hidden dark:block"
        >
            <title>OpenAI Icon Dark</title>
            <path
                fill="#fff"
                d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
            />
        </svg>
    </>
);

interface SelectedActor {
    id: string;
    name: string;
    thumbnail_url: string;
}

interface AnimatedAIInputProps {
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    disabled?: boolean;
    selectedActors?: SelectedActor[];
    onActorsSelected?: (actors: SelectedActor[]) => void;
    onOpenActorSelector?: () => void;
    audioSource?: "tts" | "upload";
    onAudioSourceChange?: (source: "tts" | "upload") => void;
    audioFile?: File | null;
    onAudioSelected?: (file: File) => void;
    onAudioRemoved?: () => void;
}

export function AnimatedAIInput({ 
    value: controlledValue = "", 
    onChange, 
    onSubmit,
    placeholder = "Write script...",
    disabled = false,
    selectedActors = [],
    onActorsSelected,
    onOpenActorSelector,
    audioSource = "tts",
    onAudioSourceChange,
    audioFile,
    onAudioSelected,
    onAudioRemoved
}: AnimatedAIInputProps) {
    const [value, setValue] = useState(controlledValue);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    
    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight: 72,
        maxHeight: 300,
    });


    useEffect(() => {
        setValue(controlledValue);
    }, [controlledValue]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey && value.trim()) {
            e.preventDefault();
            onSubmit?.();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange?.(newValue);
        adjustHeight();
    };

    const handleSubmit = () => {
        onSubmit?.();
    };

    const handleFileUpload = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            toast({
                title: "Invalid File Type",
                description: "Please upload an audio file",
                variant: "destructive",
            });
            return;
        }

        const audio = new Audio(URL.createObjectURL(file));
        audio.addEventListener('loadedmetadata', () => {
            if (audio.duration <= 90) { // Max 1:30
                onAudioSelected?.(file);
            } else {
                toast({
                    title: "File Too Long",
                    description: "Audio file must be 1 minute 30 seconds or less",
                    variant: "destructive",
                });
            }
        });
    };

    const togglePlayback = () => {
        if (!audioRef.current || !audioFile) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


    const renderMainContent = () => {
        if (audioSource === "upload") {
            if (!audioFile) {
                return (
                    <div className="px-4 py-8">
                        <Input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                            className="hidden"
                            disabled={disabled}
                        />
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                             onClick={() => fileInputRef.current?.click()}>
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Supports MP3, WAV, M4A (Max 1:30)
                            </p>
                        </div>
                    </div>
                );
            } else {
                return (
                    <div className="px-4 py-4">
                        <div className="border border-border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={togglePlayback}
                                        disabled={disabled}
                                    >
                                        {isPlaying ? (
                                            <Pause className="h-4 w-4" />
                                        ) : (
                                            <Play className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <div>
                                        <p className="text-sm font-medium">{audioFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Audio file uploaded
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={onAudioRemoved}
                                    disabled={disabled}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <audio
                                ref={audioRef}
                                src={audioFile ? URL.createObjectURL(audioFile) : undefined}
                                onEnded={() => setIsPlaying(false)}
                                onPause={() => setIsPlaying(false)}
                                onPlay={() => setIsPlaying(true)}
                            />
                        </div>
                    </div>
                );
            }
        }

        return (
            <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
                <Textarea
                    value={value}
                    placeholder={placeholder}
                    className={cn(
                        "w-full rounded-xl rounded-b-none px-4 py-3 bg-transparent border-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0",
                        "min-h-[72px]"
                    )}
                    ref={textareaRef}
                    onKeyDown={handleKeyDown}
                    onChange={handleChange}
                    disabled={disabled}
                />
            </div>
        );
    };


    return (
        <div className="w-full py-4">
            <div className="bg-background/50 dark:bg-background/50 rounded-2xl p-1.5 border border-border/50">
                <div className="relative">
                <div className="relative flex flex-col">
                        {renderMainContent()}

                        <div className="h-14 bg-transparent rounded-b-xl flex items-center">
                            <div className="absolute left-3 right-3 bottom-3 flex items-center justify-between w-[calc(100%-24px)]">
                                <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring"
                                            >
                                                <AnimatePresence mode="wait">
                                                    <motion.div
                                                        key={audioSource}
                                                        initial={{ opacity: 0, y: -5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 5 }}
                                                        transition={{ duration: 0.15 }}
                                                        className="flex items-center gap-1"
                                                    >
                                                        {audioSource === "tts" ? (
                                                            <>
                                                                <Mic className="w-4 h-4" />
                                                                Text to Speech
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Upload className="w-4 h-4" />
                                                                Audio Upload
                                                            </>
                                                        )}
                                                        <ChevronDown className="w-3 h-3 opacity-50" />
                                                    </motion.div>
                                                </AnimatePresence>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-48">
                                            <DropdownMenuItem onClick={() => onAudioSourceChange?.("tts")}>
                                                <Mic className="w-4 h-4 mr-2" />
                                                Text to Speech
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onAudioSourceChange?.("upload")}>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Audio Upload
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <div className="h-4 w-px bg-border mx-0.5" />
                                    <Button
                                        onClick={onOpenActorSelector}
                                        variant="ghost"
                                        className={cn(
                                            "rounded-lg p-2 bg-accent/20 cursor-pointer",
                                            "hover:bg-accent/30 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring",
                                            "text-muted-foreground hover:text-foreground h-8"
                                        )}
                                        aria-label="Add actors"
                                        disabled={disabled}
                                    >
                                        <Users className="w-4 h-4" />
                                        {selectedActors.length > 0 && (
                                            <span className="ml-1 text-xs">{selectedActors.length}</span>
                                        )}
                                    </Button>
                                </div>
                                <button
                                    type="button"
                                    className={cn(
                                        "rounded-lg p-2 bg-accent/20",
                                        "hover:bg-accent/30 focus-visible:ring-1 focus-visible:ring-offset-0 focus-visible:ring-ring"
                                    )}
                                    aria-label="Create project"
                                    disabled={disabled}
                                    onClick={handleSubmit}
                                >
                                    <ArrowRight
                                        className={cn(
                                            "w-4 h-4 transition-opacity duration-200",
                                            !disabled ? "opacity-100" : "opacity-30"
                                        )}
                                    />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Character count */}
            {audioSource === "tts" && (
                <div className="flex justify-end mt-2">
                    <span className="text-xs text-muted-foreground">
                        {value.length} / 1349
                    </span>
                </div>
            )}
        </div>
    );
}