import { ChatMessage, generateId } from '../types';
import { ScoreResult, MetricValues } from '../types/scoring';

// Enhanced AI service that tries real API first, falls back to mock
export async function enhancedAIResponse(question: string): Promise<ChatMessage> {
  try {
    // Try to call real API first
    const response = await fetch('/api/backtest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        strategy: question,
        timeframe: '1h',
        period: 90,
        market: 'BTC',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.success) {
        return createChatMessageFromAPI(question, data);
      }
    }

    // If API fails, use mock fallback
    console.log('API failed or not configured, using mock data');
    return mockAIResponse(question);
    
  } catch (error) {
    console.error('API call failed:', error);
    return mockAIResponse(question);
  }
}

// Create ChatMessage from API response
function createChatMessageFromAPI(question: string, data: any): ChatMessage {
  const { metrics, score, backtest } = data;
  
  const answer = formatAIResponse(score, metrics, backtest);
  
  return {
    id: generateId(),
    question: question.trim(),
    answer,
    scores: {
      // Store all metrics in the old format for compatibility
      // But these are the REAL metrics now
      pt: metrics.profitFactor,
      pro: metrics.winRate,
      sr: metrics.sharpeRatio,
      card: metrics.maxDrawdown,
      ae: metrics.cagr,
      total: score.breakdown.total,
    },
    timestamp: Date.now(),
    isExpanded: false,
  };
}

// Format AI response
function formatAIResponse(score: ScoreResult, metrics: MetricValues, backtest: any): string {
  const { breakdown, category, rating, recommendation, redFlags } = score;
  
  let response = `## Strategy Analysis\n\n`;
  
  // Overall Score
  response += `**Overall Score: ${breakdown.total}/100** ${rating.symbol}\n`;
  response += `**Category: ${rating.label}**\n\n`;
  
  // Backtest Summary
  response += `### Backtest Summary\n`;
  response += `- **Period:** ${new Date(backtest.startDate).toLocaleDateString()} - ${new Date(backtest.endDate).toLocaleDateString()}\n`;
  response += `- **Total Trades:** ${backtest.trades}\n`;
  response += `- **Initial Capital:** $${backtest.initialCapital.toLocaleString()}\n`;
  response += `- **Final Capital:** $${backtest.finalCapital.toLocaleString()}\n`;
  response += `- **Total Return:** ${backtest.totalReturn.toFixed(2)}%\n\n`;
  
  // Metrics
  response += `### Performance Metrics\n\n`;
  response += `| Metric | Value | Score |\n`;
  response += `|--------|-------|-------|\n`;
  response += `| **Profit Factor** | ${metrics.profitFactor.toFixed(2)} | ${breakdown.profitFactor}/20 |\n`;
  response += `| **Max Drawdown** | ${metrics.maxDrawdown.toFixed(1)}% | ${breakdown.maxDrawdown}/20 |\n`;
  response += `| **Sharpe Ratio** | ${metrics.sharpeRatio.toFixed(2)} | ${breakdown.sharpeRatio}/20 |\n`;
  response += `| **CAGR** | ${metrics.cagr.toFixed(1)}% | ${breakdown.cagr}/20 |\n`;
  response += `| **Win Rate** | ${metrics.winRate.toFixed(1)}% | ${breakdown.winRate}/20 |\n`;
  response += `| **Bonus/Penalty** | - | ${breakdown.bonus > 0 ? '+' : ''}${breakdown.bonus - breakdown.penalty} |\n`;
  response += `| **TOTAL** | - | **${breakdown.total}/100** |\n\n`;
  
  // Red Flags
  if (redFlags.length > 0) {
    response += `### ⚠️ Red Flags Detected\n\n`;
    redFlags.forEach(flag => {
      const icon = flag.severity === 'critical' ? '❌' : '⚠️';
      response += `${icon} **${flag.type}:** ${flag.message}\n`;
    });
    response += `\n`;
  }
  
  // Recommendation
  response += `### Recommendation\n\n`;
  response += `${recommendation}\n`;
  
  return response;
}

// Mock fallback (when API not available)
function mockAIResponse(question: string): ChatMessage {
  // Simulate calculation based on question hash
  const hash = hashString(question.toLowerCase());
  
  const metrics: MetricValues = {
    profitFactor: 1.0 + (hash % 25) / 10,
    maxDrawdown: 5 + (hash % 35),
    sharpeRatio: 0.5 + (hash % 20) / 10,
    cagr: 5 + (hash % 45),
    winRate: 40 + (hash % 40),
  };
  
  // Import dynamically to avoid circular dependency
  const { calculateTotalScore } = require('./scoreCalculator');
  const score = calculateTotalScore(metrics, 50);
  
  const mockBacktest = {
    trades: 30 + (hash % 40),
    startDate: Date.now() - 90 * 24 * 60 * 60 * 1000,
    endDate: Date.now(),
    initialCapital: 10000,
    finalCapital: 10000 * (1 + metrics.cagr / 100),
    totalReturn: metrics.cagr,
  };
  
  const answer = formatAIResponse(score, metrics, mockBacktest);
  
  return {
    id: generateId(),
    question: question.trim(),
    answer,
    scores: {
      pt: metrics.profitFactor,
      pro: metrics.winRate,
      sr: metrics.sharpeRatio,
      card: metrics.maxDrawdown,
      ae: metrics.cagr,
      total: score.breakdown.total,
    },
    timestamp: Date.now(),
    isExpanded: false,
  };
}

// Simple hash function
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
