"use client";

import { useState, useCallback } from "react";
import { ChatMessage, generateId } from "./types";
import { mockAIResponse } from "./services/mockAI";
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
      // Call mock AI service
      const newChat = await mockAIResponse(question);
      
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
    <main className="min-h-screen bg-bg-primary p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary font-mono">
          Strategy Demystify
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          AI-powered trading strategy analysis
        </p>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Input & Output */}
        <div className="space-y-4">
          {/* Chat Input */}
          <ChatInput
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSubmit}
            isLoading={isAnalyzing}
          />
          
          {/* Chat Output */}
          <ChatOutput chat={currentChat} isLoading={isAnalyzing} />
        </div>

        {/* Right Column - Chat History List */}
        <ChatList
          chats={chatHistory}
          onToggleExpand={handleToggleExpand}
          onSelectChat={handleSelectChat}
          currentChatId={currentChat?.id || null}
        />
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-border text-center text-xs text-text-muted">
        <p>Strategy Demystify Dashboard | AI Strategy Analysis | Built with Next.js + React + Tailwind CSS v4</p>
      </footer>
    </main>
  );
}
