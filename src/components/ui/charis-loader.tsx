import charisLogo from "@/assets/charis-logo-icon.png";
import { cn } from "@/lib/utils";

interface CharisLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function CharisLoader({ size = "lg", className }: CharisLoaderProps) {
  return (
    <img
      src={charisLogo}
      alt="Loading..."
      className={cn(
        sizeMap[size],
        "animate-charis-loader",
        className
      )}
    />
  );
}
