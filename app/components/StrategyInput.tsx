"use client";

interface StrategyInputProps {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  isRunning: boolean;
}

export default function StrategyInput({ value, onChange, onRun, isRunning }: StrategyInputProps) {
  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
          Strategy Query
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-text-muted"></div>
          <div className="w-2 h-2 rounded-full bg-text-muted"></div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-bg-secondary border border-border rounded-lg p-4 text-text-primary font-mono text-sm resize-none outline-none focus:border-accent-orange transition-colors min-h-[80px]"
            placeholder="Enter your strategy query..."
            rows={3}
          />
          
          {/* RUN Button - positioned inside textarea area */}
          <button
            onClick={onRun}
            disabled={isRunning}
            className="absolute top-3 right-3 px-4 py-1.5 bg-transparent border border-accent-orange text-accent-orange text-xs font-mono uppercase tracking-wider rounded hover:bg-accent-orange hover:text-bg-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? "RUNNING..." : "RUN"}
          </button>
        </div>

        {/* Helper text */}
        <p className="text-text-muted text-xs mt-2 font-mono">
          Query the performance metrics and risk analysis for any trading strategy
        </p>
      </div>
    </div>
  );
}
