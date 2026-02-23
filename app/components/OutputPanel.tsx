"use client";

interface OutputPanelProps {
  output: string;
}

export default function OutputPanel({ output }: OutputPanelProps) {
  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden h-[400px]">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
          Output
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-accent-green"></div>
          <span className="text-xs text-text-muted font-mono">Ready</span>
        </div>
      </div>

      {/* Output Content */}
      <div className="p-4 h-[calc(100%-48px)] overflow-auto">
        <pre className="font-mono text-sm text-text-secondary whitespace-pre-wrap">
          {output || "output will appear here..."}
        </pre>
      </div>
    </div>
  );
}
