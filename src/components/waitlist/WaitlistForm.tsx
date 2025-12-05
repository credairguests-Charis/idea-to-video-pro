import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";
import { CharisLoader } from "@/components/ui/charis-loader";

const formSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  firstName: z.string().trim().max(100).optional(),
  brandName: z.string().trim().max(100).optional(),
});

type FormData = z.infer<typeof formSchema>;

export const WaitlistForm = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        email: data.email,
        first_name: data.firstName || null,
        brand_name: data.brandName || null,
        source: "waitlist_landing_page",
        user_agent: navigator.userAgent,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This email is already on the waitlist!");
        } else {
          throw error;
        }
        return;
      }

      setIsSubmitted(true);
      reset();
      toast.success("You're on the list! We'll notify you when we launch.");
    } catch (error) {
      console.error("Error submitting waitlist:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 text-center animate-scale-in">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold mb-2">You're on the list!</h3>
        <p className="text-muted-foreground">
          We'll notify you when we launch. Get ready to transform your video ad creation.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="p-8 rounded-2xl bg-card border border-border shadow-xl animate-fade-in"
    >
      <div className="space-y-6">
        <div>
          <Label htmlFor="email" className="text-base">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            {...register("email")}
            className="mt-2 h-12 text-base"
          />
          {errors.email && (
            <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-base">
              First Name <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              {...register("firstName")}
              className="mt-2 h-12 text-base"
            />
          </div>

          <div>
            <Label htmlFor="brandName" className="text-base">
              Brand Name <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="brandName"
              type="text"
              placeholder="Your Brand"
              {...register("brandName")}
              className="mt-2 h-12 text-base"
            />
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
        >
          {isSubmitting ? (
            <>
              <CharisLoader size="md" className="mr-2" />
              Joining Waitlist...
            </>
          ) : (
            "Join the Waitlist"
          )}
        </Button>
      </div>
    </form>
  );
};
