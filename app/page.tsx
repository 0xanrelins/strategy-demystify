"use client";

import { useState, useCallback } from "react";
import { ChatMessage, generateId } from "./types";
import { enhancedAIResponse } from "./services/enhancedMockAI";
import ChatInput from "./components/ChatInput";
import ChatOutput from "./components/ChatOutput";
import ChatList from "./components/ChatList";

export default function StrategyDashboard() {
  // Chat history state (sorted by total score, desc)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  
  // Currently selected/viewing chat
  const [currentChat, setCurrentChat] = useState<ChatMessage | null>(null);
  
  // Loading state for AI analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Input text state
  const [inputText, setInputText] = useState("Is this strategy my good?");

  // Handle new chat submission
  const handleSubmit = useCallback(async (question: string) => {
    if (!question.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    
    try {
      // Call enhanced AI service (tries real API first, falls back to mock)
      const newChat = await enhancedAIResponse(question);
      
      // Add to history with auto-sort (by total score, desc)
      setChatHistory(prev => {
        const updated = [...prev, newChat];
        return updated.sort((a, b) => b.scores.total - a.scores.total);
      });
      
      // Show in output panel
      setCurrentChat(newChat);
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  // Handle list item expand/collapse
  const handleToggleExpand = useCallback((chatId: string) => {
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === chatId 
          ? { ...chat, isExpanded: !chat.isExpanded }
          : { ...chat, isExpanded: false } // Close others
      )
    );
  }, []);

  // Handle selecting a chat from list
  const handleSelectChat = useCallback((chat: ChatMessage) => {
    setCurrentChat(chat);
  }, []);

  return (
    <main className="h-screen bg-bg-primary flex flex-col overflow-hidden">
      {/* Header - Fixed Height */}
      <header className="flex-none px-6 py-4 border-b border-border bg-bg-primary">
        <h1 className="text-xl font-bold text-text-primary font-mono">
          Strategy Demystify
        </h1>
        <p className="text-text-secondary text-xs mt-0.5 font-mono">
          AI-powered trading strategy backtesting & scoring
        </p>
      </header>

      {/* Main Grid Layout - Fills Remaining Height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 min-h-0">
        {/* Left Column - Input & Output */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Chat Input - Compact */}
          <div className="flex-none">
            <ChatInput
              value={inputText}
              onChange={setInputText}
              onSubmit={handleSubmit}
              isLoading={isAnalyzing}
            />
          </div>
          
          {/* Chat Output - Takes remaining space */}
          <div className="flex-1 min-h-0">
            <ChatOutput chat={currentChat} isLoading={isAnalyzing} />
          </div>
        </div>

        {/* Right Column - Chat History List - Full Height */}
        <div className="min-h-0 h-full">
          <ChatList
            chats={chatHistory}
            onToggleExpand={handleToggleExpand}
            onSelectChat={handleSelectChat}
            currentChatId={currentChat?.id || null}
          />
        </div>
      </div>

      {/* Footer - Fixed Height */}
      <footer className="flex-none px-6 py-2 border-t border-border text-center text-[10px] text-text-muted bg-bg-primary">
        <p className="font-mono">Strategy Demystify | PolyBackTest API | 0-100 Scoring Framework</p>
      </footer>
    </main>
  );
}
