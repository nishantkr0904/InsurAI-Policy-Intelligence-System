"use client";

import React, { Component, ReactNode } from "react";
import ErrorFallback from "./ErrorFallback";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary – Catches React component errors and prevents app crashes
 * 
 * Usage:
 *   <ErrorBoundary>
 *     <YourComponent />
 *   </ErrorBoundary>
 * 
 * Features:
 * - Catches errors in child components
 * - Displays ErrorFallback UI
 * - Logs errors to console (can be extended to log to monitoring service)
 * - Provides resetError function to recover without full page reload
 * - Custom fallback UI via props (optional)
 * 
 * Architecture:
 * - High Priority task from docs/frontend-task.md
 * - Prevents runtime errors from killing the entire app
 * - Essential for production stability
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console (in production, send to monitoring service like Sentry)
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // TODO: Send to error monitoring service (e.g., Sentry, LogRocket)
    // Example:
    // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided, otherwise use default ErrorFallback
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
