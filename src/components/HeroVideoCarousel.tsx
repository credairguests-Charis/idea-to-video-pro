import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

const videos = [
  { src: "/videos/hero-video-1.mp4", label: "CROCS" },
  { src: "/videos/hero-video-2.mp4", label: "HUGO BOSS" },
  { src: "/videos/hero-video-3.mp4", label: "HONEY GIRL" },
];

export const HeroVideoCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mutedStates, setMutedStates] = useState([true, true, true]);
  const [playingStates, setPlayingStates] = useState([true, true, true]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    // Play all videos with staggered delays (0s, 0.5s, 1s)
    videos.forEach((_, index) => {
      setTimeout(() => {
        if (videoRefs.current[index]) {
          videoRefs.current[index]?.play();
        }
      }, index * 500); // 0.5 second delays
    });
  }, []);

  const handleVideoClick = (index: number) => {
    setCurrentIndex(index);
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
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-10 max-w-6xl mx-auto">
      {videos.map((video, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2 }}
          onClick={() => handleVideoClick(index)}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{
              scale: hoveredIndex === index ? 0.95 : 1,
            }}
            transition={{ duration: 0.2 }}
            className={`relative rounded-2xl overflow-hidden border-4 transition-all duration-300 cursor-pointer ${
              currentIndex === index
                ? "border-primary shadow-2xl shadow-primary/20"
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
              src={video.src}
              muted
              playsInline
              loop
              className="w-full h-full object-cover"
            />
            
            {/* Video Controls */}
            <div className={`absolute top-3 right-3 flex gap-2 z-10 transition-opacity duration-300 ${
              hoveredIndex === index ? "opacity-100" : "opacity-0"
            }`}>
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
          
          {/* Video Label */}
          <motion.div
            animate={{
              scale: hoveredIndex === index ? 1.1 : 1,
            }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <p className="text-lg font-semibold text-foreground tracking-wide">
              {video.label}
            </p>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
};
