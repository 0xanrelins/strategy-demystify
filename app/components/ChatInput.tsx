"use client";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isLoading: boolean;
}

export default function ChatInput({ value, onChange, onSubmit, isLoading }: ChatInputProps) {
  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-accent-orange font-mono uppercase tracking-wider">
          Ask AI
        </span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-accent-yellow animate-pulse' : 'bg-accent-green'}`}></div>
          <span className="text-[10px] text-text-muted font-mono">
            {isLoading ? 'Analyzing...' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4">
        <div className="relative">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-full bg-bg-secondary border border-border rounded-lg p-4 pr-20 text-text-primary font-mono text-sm resize-none outline-none focus:border-accent-orange transition-colors min-h-[100px] disabled:opacity-50"
            placeholder="Ask about any trading strategy... (e.g., 'Is buy the dip a good strategy?')"
            rows={4}
          />
          
          {/* Submit Button - positioned inside textarea area */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !value.trim()}
            className="absolute top-3 right-3 px-4 py-1.5 bg-accent-orange/10 border border-accent-orange text-accent-orange text-xs font-mono uppercase tracking-wider rounded hover:bg-accent-orange hover:text-bg-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-accent-orange/10 disabled:hover:text-accent-orange"
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </span>
            ) : (
              'RUN'
            )}
          </button>
        </div>

        {/* Helper text + Keyboard hint */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-text-muted text-xs font-mono">
            Get AI-powered strategy analysis with scoring framework
          </p>
          <p className="text-[10px] text-text-muted/50 font-mono">
            Press Enter ↵ to submit
          </p>
        </div>
      </div>
    </div>
  );
}
