import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

const variantClasses = {
  default:
    "bg-[var(--color-ramadan-gold)] text-[var(--color-night-blue)] hover:opacity-90",
  secondary: "bg-white/10 text-white hover:bg-white/20",
  outline: "border border-white/20 bg-transparent hover:bg-white/10",
  ghost: "hover:bg-white/10",
};

const sizeClasses = {
  default: "h-10 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-sm",
  lg: "h-12 rounded-xl px-8 text-base",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "default",
      size = "default",
      type = "button",
      ...props
    },
    ref
  ) => (
    <button
      type={type}
      ref={ref}
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ramadan-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-night-blue)] disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };




