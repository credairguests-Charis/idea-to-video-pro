import { Helmet } from "react-helmet";
import { WaitlistHero } from "@/components/waitlist/WaitlistHero";
import { WaitlistProblem } from "@/components/waitlist/WaitlistProblem";
import { WaitlistSolution } from "@/components/waitlist/WaitlistSolution";
import { WaitlistCTA } from "@/components/waitlist/WaitlistCTA";
import { WaitlistSocialProof } from "@/components/waitlist/WaitlistSocialProof";

const Waitlist = () => {
  return (
    <>
      <Helmet>
        <title>Join the Charis AI Waitlist – Human-Realistic UGC Ads, Instantly</title>
        <meta
          name="description"
          content="Get early access to Charis - the world's first AI that creates high-converting UGC ads without influencers, cameras, or editing. Join 500 early users."
        />
        <meta property="og:title" content="Join the Charis AI Waitlist – Human-Realistic UGC Ads, Instantly" />
        <meta
          property="og:description"
          content="Create human, emotionally authentic video ads in seconds - powered entirely by AI."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/charis-logo-marketing.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Join the Charis AI Waitlist" />
        <meta
          name="twitter:description"
          content="Create high-converting UGC ads without influencers, cameras, or editing."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Charis AI",
            description: "AI-powered UGC video ad creation platform",
            offers: {
              "@type": "Offer",
              availability: "https://schema.org/ComingSoon",
            },
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <WaitlistHero />
        <WaitlistProblem />
        <WaitlistSolution />
        <WaitlistCTA />
        <WaitlistSocialProof />
      </div>
    </>
  );
};

export default Waitlist;
