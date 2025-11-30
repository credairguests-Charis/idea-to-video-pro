import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const WaitlistHero = () => {
  const scrollToCTA = () => {
    document.getElementById("waitlist-cta")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/hero-video-1.mp4" type="video/mp4" />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center animate-fade-in">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Create high-converting UGC ads
          <br />
          <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
            without influencers, cameras, or editing
          </span>
        </h1>

        <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8 leading-relaxed">
          Charis helps eCommerce brands create human, emotionally authentic video ads in seconds — powered entirely by AI.
        </p>

        <Button
          size="lg"
          onClick={scrollToCTA}
          className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-2xl shadow-primary/50 transition-all duration-300 hover:scale-105 hover:shadow-primary/70"
        >
          Join Early Access
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>

        {/* Floating Text */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/80 text-sm animate-pulse">
          Your next ad… doesn't need a camera.
        </div>
      </div>
    </section>
  );
};
