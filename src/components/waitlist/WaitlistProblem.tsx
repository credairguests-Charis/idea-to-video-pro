import { Clock, DollarSign, AlertCircle } from "lucide-react";

export const WaitlistProblem = () => {
  const problems = [
    {
      icon: Clock,
      text: "You've spent hours — even days — trying to get that perfect influencer video.",
    },
    {
      icon: DollarSign,
      text: "You've paid creators, waited weeks for edits, and prayed the content converts.",
    },
    {
      icon: AlertCircle,
      text: "What if you could create those same viral-style UGC ads… instantly?",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Every eCommerce brand knows the struggle.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => {
            const Icon = problem.icon;
            return (
              <div
                key={index}
                className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <Icon className="w-12 h-12 text-primary mb-4" />
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {problem.text}
                </p>
              </div>
            );
          })}
        </div>

        {/* Split Image Visualization */}
        <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 animate-fade-in">
            <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
              Old Way
            </div>
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Waiting on creators...</p>
              </div>
            </div>
          </div>

          <div className="relative p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
              New Way
            </div>
            <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <p className="text-sm text-muted-foreground">Instant generation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
