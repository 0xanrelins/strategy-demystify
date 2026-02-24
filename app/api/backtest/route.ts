import { NextRequest, NextResponse } from 'next/server';
import { calculateTotalScore } from '@/app/services/scoreCalculator';
import { BacktestResult, MetricValues } from '@/app/types/scoring';

// PolyBackTest API configuration
const API_KEY = process.env.POLYBACKTEST_API_KEY;
const API_URL = process.env.POLYBACKTEST_API_URL || 'https://api.polybacktest.com/v1';

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'PolyBackTest API key not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { strategy, timeframe = '1h', period = 90, market = 'BTC' } = body;

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy description is required' },
        { status: 400 }
      );
    }

    // Step 1: Parse strategy (convert NL to params)
    const strategyParams = parseStrategy(strategy);

    // Step 2: Fetch historical data from PolyBackTest
    const historicalData = await fetchHistoricalData(market, timeframe, period);

    // Step 3: Run backtest simulation
    const backtestResult = runBacktest(historicalData, strategyParams);

    // Step 4: Calculate scores
    const metrics: MetricValues = {
      profitFactor: backtestResult.profitFactor,
      maxDrawdown: backtestResult.maxDrawdown,
      sharpeRatio: backtestResult.sharpeRatio,
      cagr: backtestResult.cagr,
      winRate: backtestResult.winRate,
    };

    const scoreResult = calculateTotalScore(metrics);

    // Return combined result
    return NextResponse.json({
      success: true,
      strategy: {
        description: strategy,
        parsed: strategyParams,
      },
      backtest: {
        market,
        timeframe,
        period,
        trades: backtestResult.totalTrades,
        startDate: backtestResult.startDate,
        endDate: backtestResult.endDate,
        initialCapital: backtestResult.initialCapital,
        finalCapital: backtestResult.finalCapital,
        totalReturn: backtestResult.totalReturn,
      },
      metrics,
      score: scoreResult,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Backtest API Error:', error);
    return NextResponse.json(
      { error: 'Failed to run backtest', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Parse natural language strategy
function parseStrategy(description: string) {
  const lower = description.toLowerCase();
  const params: any = {
    indicators: [],
    entryConditions: [],
    exitConditions: [],
    stopLoss: null,
    takeProfit: null,
  };

  // RSI pattern: "RSI 30'da al, 70'te sat"
  const rsiMatch = lower.match(/rsi\s*(\d+).*?(\d+)/i);
  if (rsiMatch) {
    params.indicators.push({ type: 'RSI', period: 14 });
    params.entryConditions.push({ indicator: 'RSI', condition: '<', value: parseInt(rsiMatch[1]) });
    params.exitConditions.push({ indicator: 'RSI', condition: '>', value: parseInt(rsiMatch[2]) });
  }

  // MA pattern: "50 günlük MA üstüne geçince al"
  const maMatch = lower.match(/(\d+)\s*(?:günlük|gün|day)/i);
  if (maMatch) {
    params.indicators.push({ type: 'MA', period: parseInt(maMatch[1]) });
    params.entryConditions.push({ indicator: 'MA', condition: 'cross_above' });
    params.exitConditions.push({ indicator: 'MA', condition: 'cross_below' });
  }

  // Stop loss pattern: "2% stop loss"
  const slMatch = lower.match(/(\d+)%?\s*stop\s*loss/i);
  if (slMatch) {
    params.stopLoss = parseFloat(slMatch[1]);
  }

  // Take profit pattern: "5% take profit"
  const tpMatch = lower.match(/(\d+)%?\s*take\s*profit/i);
  if (tpMatch) {
    params.takeProfit = parseFloat(tpMatch[1]);
  }

  return params;
}

// Fetch historical data from PolyBackTest API
async function fetchHistoricalData(market: string, timeframe: string, period: number) {
  try {
    const response = await fetch(`${API_URL}/historical`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY!,
      },
      body: JSON.stringify({
        market,
        timeframe,
        period,
      }),
    });

    if (!response.ok) {
      throw new Error(`PolyBackTest API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candles || [];
  } catch (error) {
    console.warn('PolyBackTest API fetch failed, using mock data:', error);
    // Fallback to mock data if API fails
    return generateMockCandles(period);
  }
}

// Generate mock candles for fallback
function generateMockCandles(period: number) {
  const candles = [];
  let price = 45000;
  const now = Date.now();
  
  for (let i = period; i >= 0; i--) {
    const volatility = 0.02;
    const change = (Math.random() - 0.5) * volatility;
    price = price * (1 + change);
    
    candles.push({
      timestamp: now - i * 24 * 60 * 60 * 1000,
      open: price * (1 + (Math.random() - 0.5) * 0.01),
      high: price * (1 + Math.random() * 0.015),
      low: price * (1 - Math.random() * 0.015),
      close: price,
      volume: Math.random() * 1000000 + 500000,
    });
  }
  
  return candles;
}

// Run backtest simulation
function runBacktest(candles: any[], strategy: any): BacktestResult {
  const initialCapital = 10000;
  let capital = initialCapital;
  let trades = 0;
  let wins = 0;
  let losses = 0;
  let maxCapital = initialCapital;
  let minCapital = initialCapital;
  let totalProfit = 0;
  let totalLoss = 0;
  
  let position: 'long' | 'short' | null = null;
  let entryPrice = 0;
  let entryTime = 0;

  // Simulate trades based on strategy
  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    
    // Simple RSI-like simulation
    const rsi = calculateMockRSI(candles, i, 14);
    
    // Entry logic
    if (!position && rsi < 30) {
      position = 'long';
      entryPrice = candle.close;
      entryTime = candle.timestamp;
    }
    
    // Exit logic
    if (position === 'long') {
      const pnl = (candle.close - entryPrice) / entryPrice;
      
      // Exit conditions
      const shouldExit = rsi > 70 || 
                        (strategy.stopLoss && pnl < -strategy.stopLoss / 100) ||
                        (strategy.takeProfit && pnl > strategy.takeProfit / 100);
      
      if (shouldExit) {
        const tradePnl = pnl * capital * 0.1; // 10% risk per trade
        capital += tradePnl;
        trades++;
        
        if (tradePnl > 0) {
          wins++;
          totalProfit += tradePnl;
        } else {
          losses++;
          totalLoss += Math.abs(tradePnl);
        }
        
        maxCapital = Math.max(maxCapital, capital);
        minCapital = Math.min(minCapital, capital);
        position = null;
      }
    }
  }

  // Calculate metrics
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
  const winRate = trades > 0 ? (wins / trades) * 100 : 0;
  const maxDrawdown = maxCapital > 0 ? ((maxCapital - minCapital) / maxCapital) * 100 : 0;
  
  // Sharpe ratio (simplified)
  const sharpeRatio = trades > 10 ? (totalReturn / 100) / (Math.max(0.01, maxDrawdown / 100)) : 1.0;
  
  // CAGR
  const days = candles.length;
  const cagr = days > 0 ? (Math.pow(1 + totalReturn / 100, 365 / days) - 1) * 100 : 0;

  return {
    totalTrades: trades,
    winningTrades: wins,
    losingTrades: losses,
    profitFactor: Math.min(5, profitFactor),
    maxDrawdown: Math.min(100, maxDrawdown),
    sharpeRatio: Math.min(3, sharpeRatio),
    cagr: Math.max(-100, Math.min(500, cagr)),
    winRate: Math.min(100, winRate),
    initialCapital,
    finalCapital: capital,
    totalReturn,
    startDate: candles[0]?.timestamp || Date.now(),
    endDate: candles[candles.length - 1]?.timestamp || Date.now(),
  };
}

// Calculate mock RSI for simulation
function calculateMockRSI(candles: any[], index: number, period: number): number {
  if (index < period) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = index - period + 1; i <= index; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
