import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card } from "@/components/ui/card";
import Autoplay from "embla-carousel-autoplay";

const ugcVideos = [
  { id: 1, url: "/actors/actor-female-1.jpg", alt: "UGC creator showcasing product" },
  { id: 2, url: "/actors/actor-male-1.jpg", alt: "Fitness UGC content creator" },
  { id: 3, url: "/actors/actor-female-2.jpg", alt: "Cooking UGC video testimonial" },
  { id: 4, url: "/actors/actor-male-2.jpg", alt: "Tech product UGC review" },
  { id: 5, url: "/actors/actor-female-3.jpg", alt: "Lifestyle UGC content" },
  { id: 6, url: "/actors/actor-male-3.jpg", alt: "Product demonstration UGC" },
];

export const UGCCarousel = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 3000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {ugcVideos.map((video) => (
            <CarouselItem key={video.id} className="pl-4 md:basis-1/2 lg:basis-1/4">
              <Card className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-[3/4] relative bg-secondary">
                  <img
                    src={video.url}
                    alt={video.alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-12" />
        <CarouselNext className="hidden md:flex -right-12" />
      </Carousel>
    </div>
  );
};
