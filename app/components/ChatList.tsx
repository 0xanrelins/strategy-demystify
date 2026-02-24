"use client";

import { ChatMessage, formatTimeAgo, getScoreRating } from "../types";
import ScoreTable from "./ScoreTable";

interface ChatListProps {
  chats: ChatMessage[];
  onToggleExpand: (chatId: string) => void;
  onSelectChat: (chat: ChatMessage) => void;
  currentChatId: string | null;
}

interface ChatListItemProps {
  chat: ChatMessage;
  onToggleExpand: (chatId: string) => void;
  onSelectChat: (chat: ChatMessage) => void;
  isSelected: boolean;
  rank: number;
}

function ChatListItem({ chat, onToggleExpand, onSelectChat, isSelected, rank }: ChatListItemProps) {
  const rating = getScoreRating(chat.scores.total);
  const timeAgo = formatTimeAgo(chat.timestamp);
  
  // Truncate question for preview
  const preview = chat.question.length > 35 
    ? chat.question.substring(0, 35) + "..." 
    : chat.question;

  const handleClick = () => {
    onSelectChat(chat);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(chat.id);
  };

  return (
    <div 
      className={`border-b border-border/50 transition-all duration-200 ${
        isSelected ? 'bg-accent-orange/5' : 'hover:bg-bg-secondary/30'
      }`}
    >
      {/* Main Row - Always Visible */}
      <div 
        onClick={handleClick}
        className="px-4 py-3 cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          {/* Rank + Question */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xs text-text-muted font-mono w-5 shrink-0">
              #{rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-text-primary truncate">
                {preview}
              </p>
              <p className="text-[10px] text-text-muted font-mono mt-0.5">
                {timeAgo}
              </p>
            </div>
          </div>

          {/* Total Score + Expand Button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`text-lg font-mono font-bold ${rating.color}`}>
              {chat.scores.total}
            </div>
            <button
              onClick={handleExpandClick}
              className="p-1 hover:bg-border/50 rounded transition-colors"
            >
              <svg 
                className={`w-4 h-4 text-text-muted transition-transform duration-200 ${chat.isExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-out ${
          chat.isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-3 pt-1 border-t border-border/30">
          {/* Full Question */}
          <div className="mb-3">
            <span className="text-[10px] text-accent-orange font-mono uppercase">Question</span>
            <p className="text-xs font-mono text-text-secondary mt-1">{chat.question}</p>
          </div>

          {/* Compact Score Table */}
          <div className="mb-3">
            <ScoreTable scores={chat.scores} compact />
          </div>

          {/* Quick Answer Preview */}
          <div className="text-xs font-mono text-text-secondary line-clamp-3">
            {chat.answer.split('\n').slice(0, 3).join('\n')}
          </div>

          {/* View Full Button */}
          <button 
            onClick={handleClick}
            className="mt-2 text-[10px] text-accent-orange font-mono hover:text-accent-orange-hover transition-colors"
          >
            Click to view full analysis →
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatList({ 
  chats, 
  onToggleExpand, 
  onSelectChat,
  currentChatId 
}: ChatListProps) {
  const hasChats = chats.length > 0;

  return (
    <div className="bg-bg-panel border border-border rounded-xl overflow-hidden h-full min-h-[400px] max-h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-xs text-accent-orange font-mono uppercase tracking-wider">
            Strategy Rankings
          </span>
          <span className="text-[10px] text-text-muted font-mono">
            (by Total Score)
          </span>
        </div>
        <span className="text-xs text-text-muted font-mono">
          {chats.length} {chats.length === 1 ? 'analysis' : 'analyses'}
        </span>
      </div>

      {/* List Content */}
      <div className="overflow-y-auto h-[calc(100%-48px)]">
        {hasChats ? (
          <div>
            {chats.map((chat, index) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onToggleExpand={onToggleExpand}
                onSelectChat={onSelectChat}
                isSelected={chat.id === currentChatId}
                rank={index + 1}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 border-2 border-border rounded-full flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary font-mono mb-1">
              No analyzed strategies yet
            </p>
            <p className="text-xs text-text-muted font-mono">
              Ask your first question to get AI analysis
            </p>
          </div>
        )}
      </div>

      {/* Footer with Legend */}
      {hasChats && (
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-3">
            <span className="text-accent-green">● Good (70+)</span>
            <span className="text-accent-yellow">● Mod (50-69)</span>
            <span className="text-accent-red">● Weak (&lt;50)</span>
          </div>
          <span className="text-text-muted">Sorted: High → Low</span>
        </div>
      )}
    </div>
  );
}
