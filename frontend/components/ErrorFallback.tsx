"use client";

import React from "react";

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * ErrorFallback – User-friendly error UI displayed when a component crashes
 * 
 * Features:
 * - Friendly error message for users
 * - Technical details in development mode
 * - "Try Again" button to reset error state
 * - Responsive design with Tailwind
 */
export default function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--bg-page)" }}>
      <div className="max-w-2xl w-full">
        <div
          className="rounded-lg p-8 shadow-xl"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}
            >
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="#ef4444"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Error Heading */}
          <h1
            className="text-2xl font-bold text-center mb-4"
            style={{ color: "var(--text-primary)" }}
          >
            Oops! Something went wrong
          </h1>

          {/* User-friendly message */}
          <p
            className="text-center mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            We encountered an unexpected error. Don't worry — your data is safe. 
            Try refreshing the page or contact support if the problem persists.
          </p>

          {/* Technical details (development only) */}
          {isDevelopment && (
            <div
              className="mb-6 p-4 rounded font-mono text-sm overflow-auto"
              style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#ef4444",
                maxHeight: "200px",
              }}
            >
              <div className="font-semibold mb-2">Error Details (Development Only):</div>
              <div className="whitespace-pre-wrap break-words">
                {error.message}
              </div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer hover:underline">Stack Trace</summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={resetError}
              className="px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{
                background: "linear-gradient(135deg, var(--primary-blue), var(--primary-purple))",
                color: "#ffffff",
              }}
              aria-label="Try again"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="px-6 py-3 rounded-lg font-semibold transition-all"
              style={{
                background: "var(--bg-input)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
              }}
              aria-label="Go to homepage"
            >
              Go to Homepage
            </button>
          </div>
        </div>

        {/* Help Text */}
        <p
          className="text-center mt-6 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          Need help? Contact support at{" "}
          <a
            href="mailto:support@insurai.com"
            className="underline hover:no-underline"
            style={{ color: "var(--primary-blue)" }}
          >
            support@insurai.com
          </a>
        </p>
      </div>
    </div>
  );
}
