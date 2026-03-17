"use client";

import React from "react";
import ErrorBoundary from "./ErrorBoundary";

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

/**
 * ClientLayoutWrapper – Wraps children with ErrorBoundary in a client component
 * 
 * This allows the root layout.tsx to remain a server component while still
 * providing error boundary protection for the entire application.
 */
export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
