"use client";

import { useState } from "react";
import StrategyInput from "./components/StrategyInput";
import OutputPanel from "./components/OutputPanel";
import StrategyTable from "./components/StrategyTable";

interface Strategy {
  name: string;
  pt: number;
  pro: number;
  sr: number;
  card: number;
  ae: number;
  total: number;
}

const initialStrategies: Strategy[] = [
  { name: "Buy the Dip...", pt: 3.5, pro: 35, sr: 1, card: 22, ae: 35, total: 59 },
  { name: "Low Ris...", pt: 2.2, pro: 24, sr: 0.7, card: 31, ae: 7, total: 87 },
  { name: "Value low and VWAP Touch...", pt: 1.4, pro: 15, sr: 0.3, card: 9, ae: 21, total: 44 },
  { name: "Strategy 5", pt: 1.4, pro: 15, sr: 0.3, card: 9, ae: 27, total: 44 },
  { name: "Strategy 6", pt: 3.5, pro: 15, sr: 1, card: 23, ae: 5, total: 59 },
  { name: "Strategy 7", pt: 2.5, pro: 15, sr: 1, card: 23, ae: 5, total: 59 },
  { name: "order flow", pt: 2.5, pro: 15, sr: 1, card: 23, ae: 5, total: 59 },
  { name: "Low Volume", pt: 2.5, pro: 15, sr: 1, card: 23, ae: 5, total: 59 },
];

export default function StrategyDashboard() {
  const [inputText, setInputText] = useState("Is this strategy my good?");
  const [output, setOutput] = useState("output will appear here...");
  const [strategies] = useState<Strategy[]>(initialStrategies);
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setOutput("Analyzing strategy...\nProcessing parameters...\nCalculating risk/reward ratios...\n");
    
    setTimeout(() => {
      setOutput((prev) => prev + "\n✓ Analysis complete\n\nStrategy Score: 87/100\nRisk Level: LOW\nProfit Target: 3.5%\nRecommended: YES");
      setIsRunning(false);
    }, 1500);
  };

  return (
    <main className="min-h-screen bg-bg-primary p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary font-mono">
          Strategy Demystify
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Trading strategy analysis & backtesting dashboard
        </p>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Strategy Input Panel */}
          <StrategyInput 
            value={inputText} 
            onChange={setInputText} 
            onRun={handleRun}
            isRunning={isRunning}
          />
          
          {/* Output Panel */}
          <OutputPanel output={output} />
        </div>

        {/* Right Column - Strategy Table */}
        <StrategyTable strategies={strategies} />
      </div>

      {/* Footer */}
      <footer className="mt-8 pt-4 border-t border-border text-center text-xs text-text-muted">
        <p>Strategy Demystify Dashboard | Built with Next.js + React + Tailwind CSS v4</p>
      </footer>
    </main>
  );
}
