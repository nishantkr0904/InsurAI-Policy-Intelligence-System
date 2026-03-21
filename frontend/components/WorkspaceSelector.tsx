'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

interface Workspace {
  id: string;
  slug: string;
  name: string;
  organization: string | null;
  role: string;
}

interface WorkspaceSelectorProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

/**
 * WorkspaceSelector component for multi-tenant workspace switching.
 *
 * Implements FR024 - Workspace Isolation on the frontend.
 * Displays user's available workspaces and allows switching between them.
 */
export function WorkspaceSelector({ onWorkspaceChange }: WorkspaceSelectorProps) {
  const { workspace, setWorkspace } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch user's workspaces
    const fetchWorkspaces = async () => {
      try {
        // For now, create a default workspace list
        // In production, this would fetch from /api/v1/workspaces
        const defaultWorkspaces: Workspace[] = [
          {
            id: 'default',
            slug: 'default',
            name: 'Default Workspace',
            organization: null,
            role: 'admin',
          },
        ];

        // Try to fetch from API
        try {
          const res = await fetch('/api/v1/workspaces?limit=10');
          if (res.ok) {
            const data = await res.json();
            if (data.workspaces && data.workspaces.length > 0) {
              setWorkspaces(data.workspaces.map((ws: any) => ({
                id: ws.id,
                slug: ws.slug,
                name: ws.name,
                organization: ws.organization,
                role: 'member', // Default role, would come from backend
              })));
              setIsLoading(false);
              return;
            }
          }
        } catch {
          // API not available, use defaults
        }

        setWorkspaces(defaultWorkspaces);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaces();
  }, []);

  const handleSelect = (ws: Workspace) => {
    setWorkspace(ws.id);
    setIsOpen(false);
    onWorkspaceChange?.(ws.id);
  };

  const currentWorkspace = workspaces.find((ws) => ws.id === workspace) || workspaces[0];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Select workspace"
      >
        <svg
          className="h-4 w-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <span className="max-w-32 truncate">
          {currentWorkspace?.name || 'Select Workspace'}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Workspaces
              </p>
              <div className="mt-1 space-y-1">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSelect(ws)}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-gray-100 ${
                      ws.id === workspace
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-900'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-white ${
                        ws.id === workspace ? 'bg-blue-600' : 'bg-gray-400'
                      }`}
                    >
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium">{ws.name}</p>
                      {ws.organization && (
                        <p className="truncate text-xs text-gray-500">
                          {ws.organization}
                        </p>
                      )}
                    </div>
                    {ws.id === workspace && (
                      <svg
                        className="h-4 w-4 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Could open a modal to create workspace
                  alert('Create workspace feature coming soon!');
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Workspace
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default WorkspaceSelector;
