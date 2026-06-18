import Image from "next/image";

type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

export function BrandLogo({ size = "md", className = "" }: BrandLogoProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white shadow-lg shadow-black/20 ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/logo.jpeg"
        alt="MetaPronostic logo"
        fill
        sizes={size === "lg" ? "80px" : size === "md" ? "56px" : "44px"}
        className="object-cover"
        priority={size === "lg"}
      />
    </span>
  );
}
