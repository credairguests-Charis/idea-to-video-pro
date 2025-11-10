import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const videos = [
  "/videos/hero-video-1.mp4",
  "/videos/hero-video-2.mp4",
  "/videos/hero-video-3.mp4",
];

export const HeroVideoCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    // Play the first video when component mounts
    if (videoRefs.current[0]) {
      videoRefs.current[0].play();
    }
  }, []);

  const handleVideoEnd = (index: number) => {
    // Move to next video
    const nextIndex = (index + 1) % videos.length;
    setCurrentIndex(nextIndex);
    
    // Play next video
    if (videoRefs.current[nextIndex]) {
      videoRefs.current[nextIndex].play();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 max-w-6xl mx-auto">
      {videos.map((video, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2 }}
          className={`relative rounded-2xl overflow-hidden border-4 transition-all duration-300 ${
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
        </motion.div>
      ))}
    </div>
  );
};
