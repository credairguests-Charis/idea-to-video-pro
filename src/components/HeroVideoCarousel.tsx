import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

const videos = [
  "/videos/hero-video-1.mp4",
  "/videos/hero-video-2.mp4",
  "/videos/hero-video-3.mp4",
];

export const HeroVideoCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mutedStates, setMutedStates] = useState([true, true, true]);
  const [playingStates, setPlayingStates] = useState([false, false, false]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    // Play the first video when component mounts
    if (videoRefs.current[0]) {
      videoRefs.current[0].play();
      setPlayingStates([true, false, false]);
    }
  }, []);

  const handleVideoEnd = (index: number) => {
    // Move to next video
    const nextIndex = (index + 1) % videos.length;
    setCurrentIndex(nextIndex);
    
    // Update playing states
    const newPlayingStates = [false, false, false];
    newPlayingStates[nextIndex] = true;
    setPlayingStates(newPlayingStates);
    
    // Pause current video and play next
    if (videoRefs.current[index]) {
      videoRefs.current[index]?.pause();
    }
    if (videoRefs.current[nextIndex]) {
      videoRefs.current[nextIndex].play();
    }
  };

  const handleVideoClick = (index: number) => {
    // Pause all videos
    videoRefs.current.forEach((video) => video?.pause());
    
    // Set clicked video as current and play it
    setCurrentIndex(index);
    const newPlayingStates = [false, false, false];
    newPlayingStates[index] = true;
    setPlayingStates(newPlayingStates);
    
    if (videoRefs.current[index]) {
      videoRefs.current[index]?.play();
    }
  };

  const toggleMute = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newMutedStates = [...mutedStates];
    newMutedStates[index] = !newMutedStates[index];
    setMutedStates(newMutedStates);
    
    if (videoRefs.current[index]) {
      videoRefs.current[index]!.muted = newMutedStates[index];
    }
  };

  const togglePlayPause = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRefs.current[index];
    if (!video) return;

    const newPlayingStates = [...playingStates];
    
    if (video.paused) {
      video.play();
      newPlayingStates[index] = true;
    } else {
      video.pause();
      newPlayingStates[index] = false;
    }
    
    setPlayingStates(newPlayingStates);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 max-w-6xl mx-auto">
      {videos.map((video, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2 }}
          onClick={() => handleVideoClick(index)}
          className={`relative rounded-2xl overflow-hidden border-4 transition-all duration-300 cursor-pointer ${
            currentIndex === index
              ? "border-primary shadow-2xl shadow-primary/20 scale-105"
              : "border-border/40 shadow-lg"
          }`}
          style={{
            width: "100%",
            maxWidth: "280px",
            aspectRatio: "9/16",
          }}
        >
          <video
            ref={(el) => (videoRefs.current[index] = el)}
            src={video}
            muted
            playsInline
            loop={false}
            onEnded={() => handleVideoEnd(index)}
            className="w-full h-full object-cover"
          />
          {currentIndex !== index && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
          )}
          
          {/* Video Controls */}
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/60 hover:bg-black/80 backdrop-blur-sm"
              onClick={(e) => toggleMute(index, e)}
            >
              {mutedStates[index] ? (
                <VolumeX className="h-4 w-4 text-white" />
              ) : (
                <Volume2 className="h-4 w-4 text-white" />
              )}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-black/60 hover:bg-black/80 backdrop-blur-sm"
              onClick={(e) => togglePlayPause(index, e)}
            >
              {playingStates[index] ? (
                <Pause className="h-4 w-4 text-white" />
              ) : (
                <Play className="h-4 w-4 text-white" />
              )}
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
