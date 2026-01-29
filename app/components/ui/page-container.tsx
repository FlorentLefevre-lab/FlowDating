import * as React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use gradient background (default: true) */
  gradient?: boolean
  /** Max width constraint */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  /** Vertical padding */
  padding?: "none" | "sm" | "md" | "lg"
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  full: "max-w-full",
}

const paddingClasses = {
  none: "py-0",
  sm: "py-4",
  md: "py-6",
  lg: "py-8",
}

const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  (
    {
      className,
      gradient = true,
      maxWidth = "xl",
      padding = "md",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen",
          gradient && "bg-gradient-to-br from-primary-50 to-secondary-50",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "container mx-auto px-4",
            maxWidthClasses[maxWidth],
            paddingClasses[padding]
          )}
        >
          {children}
        </div>
      </div>
    )
  }
)

PageContainer.displayName = "PageContainer"

export { PageContainer }
