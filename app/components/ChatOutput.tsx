"use client";

import { ChatMessage, getScoreRating } from "../types";
import ScoreTable from "./ScoreTable";

interface ChatOutputProps {
  chat: ChatMessage | null;
  isLoading?: boolean;
}

export default function ChatOutput({ chat, isLoading = false }: ChatOutputProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-bg-panel border border-border rounded-xl overflow-hidden h-[400px]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
            AI Analysis
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-yellow animate-pulse"></div>
            <span className="text-xs text-accent-yellow font-mono">Analyzing...</span>
          </div>
        </div>

        <div className="p-6 h-[calc(100%-48px)] flex flex-col items-center justify-center">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 bg-accent-orange rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-3 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <p className="text-text-secondary font-mono text-sm">Processing strategy parameters...</p>
          <p className="text-text-muted font-mono text-xs mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!chat) {
    return (
      <div className="bg-bg-panel border border-border rounded-xl overflow-hidden h-[400px]">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
            AI Analysis
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-text-muted"></div>
            <span className="text-xs text-text-muted font-mono">Waiting</span>
          </div>
        </div>

        <div className="p-6 h-[calc(100%-48px)] flex items-center justify-center">
          <div className="text-center">
            <p className="text-text-muted font-mono text-sm mb-2">
              <span className="text-accent-green">➜</span> Waiting for input...
            </p>
            <p className="text-text-secondary font-mono text-xs">
              Ask a strategy question to get AI analysis
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Parse the AI response (markdown-like format)
  const { question, answer, scores, timestamp } = chat;
  const rating = getScoreRating(scores.total);

  // Extract sections from answer
  const lines = answer.split('\n');
  const summaryStart = lines.findIndex(l => l.includes('### Summary'));
  const riskStart = lines.findIndex(l => l.includes('### Risk Assessment'));
  const recStart = lines.findIndex(l => l.includes('### Recommendation'));
  
  const summary = lines.slice(summaryStart + 1, riskStart).filter(l => l.trim()).join('\n');
  const riskSection = lines.slice(riskStart + 1, recStart).filter(l => l.trim()).join('\n');

  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
          AI Analysis
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-green"></div>
          <span className="text-xs text-text-muted font-mono">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 h-[calc(100%-48px)] overflow-auto">
        {/* Question */}
        <div className="mb-4 p-3 bg-bg-secondary/50 rounded-lg border border-border/50">
          <span className="text-xs text-text-muted font-mono uppercase">Question</span>
          <p className="text-text-primary font-mono text-sm mt-1">{question}</p>
        </div>

        {/* Overall Score */}
        <div className="mb-4 flex items-center gap-3">
          <div className="text-3xl font-bold font-mono">
            <span className={rating.color}>{scores.total}</span>
            <span className="text-text-muted text-lg">/100</span>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-mono font-semibold bg-bg-secondary ${rating.color}`}>
            {rating.icon} {rating.label}
          </div>
        </div>

        {/* Score Table */}
        <div className="mb-4">
          <ScoreTable scores={scores} />
        </div>

        {/* Summary */}
        <div className="mb-4">
          <h3 className="text-xs text-accent-orange font-mono uppercase tracking-wider mb-2">
            Summary
          </h3>
          <div className="text-sm text-text-secondary font-mono whitespace-pre-wrap">
            {summary}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mb-4">
          <h3 className="text-xs text-accent-orange font-mono uppercase tracking-wider mb-2">
            Risk Assessment
          </h3>
          <div className="text-sm text-text-secondary font-mono whitespace-pre-wrap">
            {riskSection}
          </div>
        </div>

        {/* Recommendation Badge */}
        <div className={`p-3 rounded-lg border ${scores.total >= 60 ? 'border-accent-green/30 bg-accent-green/5' : 'border-accent-yellow/30 bg-accent-yellow/5'}`}>
          <p className={`text-sm font-mono font-semibold ${scores.total >= 60 ? 'text-accent-green' : 'text-accent-yellow'}`}>
            {scores.total >= 60 ? '✓ APPROVED' : '⚠ CAUTION'} 
            <span className="text-text-secondary font-normal ml-2">
              {scores.total >= 60 
                ? 'Suitable for implementation with specified risk controls.'
                : 'Requires further optimization before live trading.'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
