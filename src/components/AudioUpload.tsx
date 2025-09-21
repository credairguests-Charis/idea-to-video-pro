import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Play, Pause, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioUploadProps {
  onAudioSelected: (audioFile: File, duration: number) => void;
  onAudioRemoved: () => void;
  disabled?: boolean;
}

export function AudioUpload({ onAudioSelected, onAudioRemoved, disabled }: AudioUploadProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
        setAudioFile(file);
        setDuration(audio.duration);
        onAudioSelected(file, audio.duration);
      } else {
        toast({
          title: "File Too Long",
          description: "Audio file must be 1 minute 30 seconds or less",
          variant: "destructive",
        });
      }
    });
  };

  const handleRemoveAudio = () => {
    setAudioFile(null);
    setDuration(0);
    setIsPlaying(false);
    onAudioRemoved();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

  return (
    <div className="space-y-4">
      <Label htmlFor="audio-upload" className="text-sm font-medium">
        Upload Audio (Max 1:30)
      </Label>
      
      {!audioFile ? (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Input
            ref={fileInputRef}
            type="file"
            id="audio-upload"
            accept="audio/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
            disabled={disabled}
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">
            Supports MP3, WAV, M4A and other audio formats
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="mt-3"
          >
            Choose File
          </Button>
        </div>
      ) : (
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
                  Duration: {formatDuration(duration)}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveAudio}
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
      )}
    </div>
  );
}