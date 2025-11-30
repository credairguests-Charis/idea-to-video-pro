import { Quote } from "lucide-react";

export const WaitlistSocialProof = () => {
  const testimonials = [
    {
      text: "Already generating buzz among eCommerce creators.",
      author: "E. Tony",
      role: "Founder, Beauty Brand",
    },
    {
      text: "This sounds scary real.",
      author: "T. Alex",
      role: "Marketing Director",
    },
    {
      text: "If this works, it's over for influencer shoots.",
      author: "Laureen",
      role: "Content Creator",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-t from-muted/20 to-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Already generating buzz among eCommerce creators.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Quote className="w-10 h-10 text-primary/40 mb-4" />
              <p className="text-lg mb-6 leading-relaxed">"{testimonial.text}"</p>
              <div className="border-t border-border pt-4">
                <p className="font-semibold">{testimonial.author}</p>
                <p className="text-sm text-muted-foreground">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-muted-foreground animate-fade-in">
          <p className="text-sm">© 2025 Charis AI. All rights reserved.</p>
        </div>
      </div>
    </section>
  );
};
