import { ChatMessage, generateId } from '../types';
import { ScoreResult, MetricValues } from '../types/scoring';

// AI service that calls real PolyBackTest API
// NO MOCK FALLBACK - if API fails, user is informed
export async function enhancedAIResponse(question: string): Promise<ChatMessage> {
  try {
    // Call real API
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Backtest failed');
    }

    return createChatMessageFromAPI(question, data);
    
  } catch (error) {
    console.error('API call failed:', error);
    
    // Return error message instead of mock data
    return {
      id: generateId(),
      question: question.trim(),
      answer: formatErrorResponse(error instanceof Error ? error.message : 'Unknown error'),
      scores: {
        pt: 0,
        pro: 0,
        sr: 0,
        card: 0,
        ae: 0,
        total: 0,
      },
      timestamp: Date.now(),
      isExpanded: false,
    };
  }
}

// Format error response
function formatErrorResponse(errorMessage: string): string {
  return `## ⚠️ Backtest Failed

**Error:** ${errorMessage}

### Possible Causes:
- PolyBackTest API key not configured
- API rate limit exceeded
- Network connectivity issue
- Invalid strategy parameters

### How to Fix:
1. Check your ".env.local" file has POLYBACKTEST_API_KEY
2. Verify your API key is valid at https://polybacktest.com
3. Check your internet connection
4. Try a different strategy description

---
*Note: This system uses real historical data from PolyBackTest API. No mock data is used.*`;
}

// Create ChatMessage from API response
function createChatMessageFromAPI(question: string, data: any): ChatMessage {
  const { metrics, score, backtest, warnings, strategy } = data;
  
  const answer = formatAIResponse(score, metrics, backtest, warnings, strategy);
  
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
function formatAIResponse(score: ScoreResult, metrics: MetricValues, backtest: any, warnings?: string[], strategy?: any): string {
  const { breakdown, category, rating, recommendation, redFlags } = score;
  
  let response = `## Strategy Analysis\n\n`;
  
  // Overall Score
  response += `**Overall Score: ${breakdown.total}/100** ${rating.symbol}\n`;
  response += `**Category: ${rating.label}**\n\n`;
  
  // Warnings (if any)
  if (warnings && warnings.length > 0) {
    response += `### ⚠️ Parser Warnings\n\n`;
    warnings.forEach(warning => {
      response += `- ${warning}\n`;
    });
    response += `\n`;
  }
  
  // Recognized Patterns
  if (strategy?.recognizedPatterns && strategy.recognizedPatterns.length > 0) {
    response += `### ✅ Recognized Patterns\n\n`;
    strategy.recognizedPatterns.forEach((pattern: string) => {
      response += `- \`${pattern}\`\n`;
    });
    response += `\n`;
  }
  
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
    response += `### 🚩 Red Flags Detected\n\n`;
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
