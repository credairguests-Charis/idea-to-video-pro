import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Zap, TrendingUp } from "lucide-react";
import { HeroVideoCarousel } from "@/components/HeroVideoCarousel";
import charisLogo from "@/assets/charis-logo-new.png";

const Landing = () => {
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);

  const features = [
    {
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      title: "AI-Powered Generation",
      description:
        "Creates authentic UGC videos with natural movement and expressions.",
    },
    {
      icon: <Zap className="h-8 w-8 text-primary" />,
      title: "Lightning Fast",
      description:
        "Generate professional-quality UGC videos in minutes, not days.",
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-primary" />,
      title: "Higher Conversions",
      description:
        "Boost ROI with content that feels authentic and engaging.",
    },
  ];

  const faqs = [
    {
      question: "How does the AI generate UGC videos?",
      answer:
        "Our AI technology analyzes your product and creates realistic videos featuring diverse actors delivering authentic testimonials and demonstrations. The AI handles facial expressions, body language, and voice synchronization to create natural, engaging content.",
    },
    {
      question: "Can I use my own product images?",
      answer:
        "Yes! You can upload your own product images, and our AI will seamlessly integrate them into the UGC videos. The system adapts to showcase your products in the most natural and appealing way possible.",
    },
    {
      question: "Do I own full rights to the generated videos?",
      answer:
        "Absolutely. You have full commercial rights to all videos generated through our platform. Use them anywhere—social media, websites, ads, or any marketing channel you choose.",
    },
    {
      question: "How long does video generation take?",
      answer:
        "Most videos are generated in 2-5 minutes. The exact time depends on video length and complexity. You'll receive real-time updates during the generation process and can continue working on other projects while videos are being created.",
    },
    {
      question: "Does it support brand-specific avatars?",
      answer:
        "Yes! You can select from our diverse library of AI actors or work with our team to create custom brand ambassadors that perfectly represent your target audience and brand identity.",
    },
    {
      question: "What formats are supported for exports?",
      answer:
        "Videos are exported in MP4 format optimized for various platforms including Instagram, TikTok, Facebook, YouTube, and more. We provide multiple aspect ratios (9:16, 1:1, 16:9) to fit any platform requirements.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={charisLogo} alt="Charis Logo" className="h-10 w-10 rounded-lg" />
            <span className="text-xl font-bold">Charis</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </a>
            <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">
              FAQ
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Examples
            </a>
            <a href="#" className="text-sm font-medium hover:text-primary transition-colors">
              Resources
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>Start Free Trial</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 lg:py-20">
        <div className="max-w-6xl mx-auto text-center space-y-12 animate-fade-in">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight">
              Create winning ads with{" "}
              <span className="text-primary">AI Actors</span>
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate 100s of winning videos from text.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8" onClick={() => navigate("/auth")}>
                Get your first video ad generated
              </Button>
            </div>
          </div>
          
          {/* Hero Video Carousel */}
          <HeroVideoCarousel />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold">Why Choose Charis?</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to create professional UGC videos at scale
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-8 space-y-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur"
            >
              <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-4xl lg:text-5xl font-bold">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Charis
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card/50 backdrop-blur rounded-lg border px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 py-20">
        <div className="container mx-auto px-4 text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-bold">
            Ready to Transform Your Marketing?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join thousands of brands creating viral UGC videos with AI
          </p>
          <Button size="lg" className="text-base px-8" onClick={() => navigate("/auth")}>
            Start Your Free Trial Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary/30 border-t border-border/40">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img src={charisLogo} alt="Charis Logo" className="h-8 w-8 rounded-lg" />
                <span className="text-lg font-bold">Charis</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Create authentic UGC videos with the power of AI
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Examples
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-primary transition-colors">
                    Privacy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-border/40 text-center text-sm text-muted-foreground">
            © 2024 Charis. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Demo Video Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="max-w-4xl">
          <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Demo video player</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Landing;
