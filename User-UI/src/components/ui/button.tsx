import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * KRYROS Primary Button
 * Height: 48px | Padding: 16px 24px | Radius: 8px | Font: Roboto 500 16px
 * Colors: bg #0A5858 → hover #2E656A → active #084C4C | Disabled #9DB5B5
 * Shadow + translateY(-2px) on hover | 4px ring on focus
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-medium transition-all duration-250 focus-visible:outline-none disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-white border border-white/15 " +
          "shadow-[0_2px_8px_rgba(0,0,0,0.10),0_8px_20px_rgba(10,88,88,0.25)] " +
          "hover:bg-[#2E656A] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(10,88,88,0.30)] " +
          "active:bg-[#084C4C] active:translate-y-0 active:shadow-[0_3px_10px_rgba(10,88,88,0.18)] " +
          "focus-visible:shadow-[0_0_0_4px_rgba(10,88,88,0.18),0_8px_20px_rgba(10,88,88,0.25)] " +
          "disabled:bg-[#9DB5B5] disabled:text-white disabled:shadow-none disabled:cursor-not-allowed disabled:opacity-100",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border hover:bg-destructive/90",
        outline:
          "border [border-color:var(--button-outline)] shadow-xs hover:bg-muted active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary-border hover:bg-secondary/80",
        ghost: "border border-transparent hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-[48px] px-6 py-3",
        sm: "min-h-[36px] rounded-md px-4 text-sm",
        lg: "min-h-[56px] rounded-lg px-8 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
