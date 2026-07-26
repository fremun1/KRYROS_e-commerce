"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--text-main)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--card)",
          "--success-text": "var(--success)",
          "--error-bg": "var(--card)",
          "--error-text": "var(--danger)",
          "--warning-bg": "var(--card)",
          "--warning-text": "var(--warning)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
