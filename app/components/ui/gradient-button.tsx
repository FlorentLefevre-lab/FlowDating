import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  size?: "sm" | "default" | "lg" | "xl"
  isLoading?: boolean
}

const sizeClasses = {
  sm: "h-9 px-4 text-sm",
  default: "h-10 px-6",
  lg: "h-11 px-8",
  xl: "h-12 px-10 text-base",
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    { className, size = "default", asChild = false, isLoading, disabled, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium",
          "bg-gradient-to-r from-primary-500 to-secondary-600 text-white",
          "hover:from-primary-600 hover:to-secondary-700",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "shadow-button hover:shadow-md",
          "transition-all duration-200",
          "disabled:pointer-events-none disabled:opacity-50",
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Chargement...</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)

GradientButton.displayName = "GradientButton"

export { GradientButton }
