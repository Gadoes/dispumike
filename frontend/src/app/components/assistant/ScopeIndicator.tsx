"use client";

/**
 * ScopeIndicator — shows sticky scope status near the chat input.
 * Spec: Section 5, Chunk 8.
 *
 * Renders when the user has narrowed MCP scope to a subset of connected
 * sources. Shows "Scope: N sources for this thread" with a Clear button.
 */

interface ScopeIndicatorProps {
    sourceCount: number;
    onClear: () => void;
}

export function ScopeIndicator({ sourceCount, onClear }: ScopeIndicatorProps) {
    return (
        <div
            className="flex items-center gap-2 px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-lg"
            aria-label={`Scope: ${sourceCount} sources for this thread`}
        >
            <span>
                Scope: {sourceCount}{" "}
                {sourceCount === 1 ? "source" : "sources"} for this thread
            </span>
            <button
                type="button"
                onClick={onClear}
                className="text-gray-500 hover:text-gray-800 font-medium underline underline-offset-1"
                aria-label="Clear scope"
            >
                Clear
            </button>
        </div>
    );
}
