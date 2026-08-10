"use client";
import React from "react";

export function useScreenshotRestriction() {
  return { enabled: false, loaded: true };
}

// Client-side component to apply restrictions
export function ScreenshotRestrictionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  return React.createElement(React.Fragment, null, children);
}
