import { WaitlistForm } from "./WaitlistForm";
import { Badge, Users, Trophy, Star } from "lucide-react";

export const WaitlistCTA = () => {
  const benefits = [
    { icon: Star, text: "Early access before public launch" },
    { icon: Trophy, text: "Creator badge" },
    { icon: Users, text: "Access to the Charis Founders Circle private community" },
    { icon: Badge, text: "A chance to be featured as a success story" },
  ];

  return (
    <section id="waitlist-cta" className="py-24 bg-gradient-to-b from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Get Early Access Before the World Hears Charis.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join the waitlist and get:
            </p>

            <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm text-left">{benefit.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <WaitlistForm />

          <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold">
              <Users className="w-4 h-4" />
              We're opening to only 500 early users
            </span>
          </p>
        </div>
      </div>
    </section>
  );
};
