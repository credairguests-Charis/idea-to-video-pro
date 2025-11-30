import { FileText, Mic, Sparkles, Send } from "lucide-react";

export const WaitlistSolution = () => {
  const steps = [
    { icon: FileText, text: "Script it", color: "text-blue-500" },
    { icon: Mic, text: "Pick a voice", color: "text-purple-500" },
    { icon: Sparkles, text: "Generate", color: "text-pink-500" },
    { icon: Send, text: "Post", color: "text-green-500" },
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Meet Charis — the world's first AI that{" "}
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              truly sounds human
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Charis lets you instantly generate relatable, human-like video ads that look and sound like real UGC creators.
            <br />
            Whether you're selling skincare, gadgets, or fashion, Charis gives your brand a human voice at scale.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-wrap justify-center gap-6 mb-16 max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Icon className={`w-6 h-6 ${step.color}`} />
                <span className="font-semibold">{step.text}</span>
                {index < steps.length - 1 && (
                  <span className="text-muted-foreground ml-2">→</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Demo Video/GIF Area */}
        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 rounded-3xl bg-gradient-to-br from-primary/10 via-purple-500/10 to-pink-500/10 border border-primary/20 animate-fade-in">
            <div className="aspect-video bg-muted/50 rounded-2xl overflow-hidden shadow-2xl">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src="/videos/hero-video-2.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Demo Caption */}
            <div className="mt-8 p-6 rounded-xl bg-card/80 backdrop-blur-sm border border-border">
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-2 animate-pulse" />
                <div>
                  <p className="text-lg font-medium mb-2">AI-Generated UGC Example:</p>
                  <p className="text-muted-foreground italic">
                    "Hey guys, I just tried this new wireless blender — and it's crazy good!"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
