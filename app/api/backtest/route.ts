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
        recognizedPatterns: strategyParams.recognizedPatterns,
        unrecognizedPatterns: strategyParams.unrecognized,
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
      warnings: backtestResult.warnings || [],
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
    recognizedPatterns: [],
    unrecognized: [],
  };

  // RSI pattern: "RSI 30'da al, 70'te sat"
  const rsiMatch = lower.match(/rsi\s*(\d+).*?(\d+)/i);
  if (rsiMatch) {
    params.indicators.push({ type: 'RSI', period: 14 });
    params.entryConditions.push({ indicator: 'RSI', condition: '<', value: parseInt(rsiMatch[1]) });
    params.exitConditions.push({ indicator: 'RSI', condition: '>', value: parseInt(rsiMatch[2]) });
    params.recognizedPatterns.push('RSI_Mean_Reversion');
  }

  // MA pattern: "50 günlük MA üstüne geçince al" or "50 day MA"
  const maMatch = lower.match(/(\d+)\s*(?:günlük|gün|day|period)/i);
  if (maMatch) {
    params.indicators.push({ type: 'MA', period: parseInt(maMatch[1]) });
    params.entryConditions.push({ indicator: 'MA', condition: 'cross_above' });
    params.exitConditions.push({ indicator: 'MA', condition: 'cross_below' });
    params.recognizedPatterns.push('MA_Crossover');
  }

  // MACD pattern
  const macdMatch = lower.match(/macd/i);
  if (macdMatch) {
    params.indicators.push({ type: 'MACD' });
    params.entryConditions.push({ indicator: 'MACD', condition: 'bullish_cross' });
    params.exitConditions.push({ indicator: 'MACD', condition: 'bearish_cross' });
    params.recognizedPatterns.push('MACD');
  }

  // Bollinger Bands pattern
  const bbMatch = lower.match(/bollinger|bb|bands/i);
  if (bbMatch) {
    params.indicators.push({ type: 'BollingerBands' });
    params.entryConditions.push({ indicator: 'BB', condition: 'touch_lower' });
    params.exitConditions.push({ indicator: 'BB', condition: 'touch_upper' });
    params.recognizedPatterns.push('Bollinger_Bands');
  }

  // Order Flow / Scalping patterns (basic detection)
  const orderFlowMatch = lower.match(/order\s*flow|orderflow|scapling|98c|last\s*\d+\s*(?:sec|second)/i);
  if (orderFlowMatch) {
    params.unrecognized.push({
      pattern: 'Order_Flow_Scalping',
      detected: true,
      reason: 'Advanced order flow strategies require CVD/Order Book data not available in standard OHLCV',
      note: 'This strategy type requires real-time order book data',
    });
  }

  // Time-based patterns
  const timeMatch = lower.match(/(\d+)([smh])\s*(?:market|timeframe|tf)/i);
  if (timeMatch) {
    const value = parseInt(timeMatch[1]);
    const unit = timeMatch[2];
    params.timeframe = { value, unit, description: `${value}${unit} timeframe detected` };
    params.recognizedPatterns.push('Timeframe_Specification');
  }

  // Stop loss pattern: "2% stop loss"
  const slMatch = lower.match(/(\d+)%?\s*stop\s*loss/i);
  if (slMatch) {
    params.stopLoss = parseFloat(slMatch[1]);
    params.recognizedPatterns.push('Stop_Loss');
  }

  // Take profit pattern: "5% take profit"
  const tpMatch = lower.match(/(\d+)%?\s*take\s*profit/i);
  if (tpMatch) {
    params.takeProfit = parseFloat(tpMatch[1]);
    params.recognizedPatterns.push('Take_Profit');
  }

  // Breakout pattern
  const breakoutMatch = lower.match(/breakout|break\s*out/i);
  if (breakoutMatch) {
    params.entryConditions.push({ indicator: 'PRICE', condition: 'breakout_above' });
    params.recognizedPatterns.push('Breakout');
  }

  // Support/Resistance pattern
  const srMatch = lower.match(/support|resistance|sr/i);
  if (srMatch) {
    params.recognizedPatterns.push('Support_Resistance');
  }

  return params;
}

// Fetch historical data from PolyBackTest API
async function fetchHistoricalData(market: string, timeframe: string, period: number) {
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
    throw new Error(`PolyBackTest API error: ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.candles || data.candles.length === 0) {
    throw new Error('PolyBackTest API returned empty data');
  }
  
  return data.candles;
}

// Run backtest simulation
function runBacktest(candles: any[], strategy: any): BacktestResult & { warnings?: string[] } {
  const warnings: string[] = [];
  
  // Check if strategy has unrecognized patterns
  if (strategy.unrecognized && strategy.unrecognized.length > 0) {
    strategy.unrecognized.forEach((u: any) => {
      warnings.push(`${u.pattern}: ${u.reason}`);
    });
  }
  
  // Check if no patterns recognized at all
  if (strategy.recognizedPatterns.length === 0 && strategy.indicators.length === 0) {
    warnings.push('No recognizable strategy patterns found. Using generic mean-reversion simulation.');
    warnings.push('Supported patterns: RSI, MA, MACD, Bollinger Bands, Breakout, Stop Loss, Take Profit');
  }
  
  // Check for order flow / scalping strategies that can't be properly backtested
  const isOrderFlow = strategy.unrecognized.some((u: any) => u.pattern === 'Order_Flow_Scalping');
  if (isOrderFlow) {
    warnings.push('Order Flow/Scalping strategies require real-time order book data not available in historical OHLCV');
    warnings.push('This backtest uses OHLCV approximation and may not reflect real strategy performance');
  }
  
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

  // Determine which strategy to simulate based on detected patterns
  const hasRSI = strategy.indicators.some((ind: any) => ind.type === 'RSI');
  const hasMA = strategy.indicators.some((ind: any) => ind.type === 'MA');
  const hasBreakout = strategy.recognizedPatterns.includes('Breakout');
  
  // Simulate trades based on strategy type
  for (let i = 20; i < candles.length - 1; i++) { // Start after enough data for indicators
    const candle = candles[i];
    const prevCandle = candles[i - 1];
    
    let shouldEnter = false;
    let shouldExit = false;
    let entrySignal = '';
    
    if (hasRSI) {
      // RSI Mean Reversion Strategy
      const rsi = calculateRSI(candles, i, 14);
      if (!position && rsi < 30) {
        shouldEnter = true;
        entrySignal = 'RSI_Oversold';
      }
      if (position === 'long' && rsi > 70) {
        shouldExit = true;
      }
    } else if (hasMA) {
      // MA Crossover Strategy
      const ma20 = calculateMA(candles, i, 20);
      const ma50 = calculateMA(candles, i, 50);
      const prevMA20 = calculateMA(candles, i - 1, 20);
      const prevMA50 = calculateMA(candles, i - 1, 50);
      
      if (!position && prevMA20 <= prevMA50 && ma20 > ma50) {
        shouldEnter = true;
        entrySignal = 'MA_Golden_Cross';
      }
      if (position === 'long' && prevMA20 >= prevMA50 && ma20 < ma50) {
        shouldExit = true;
      }
    } else if (hasBreakout) {
      // Breakout Strategy - 20-period high breakout
      const highest20 = Math.max(...candles.slice(i - 20, i).map((c: any) => c.high));
      if (!position && candle.close > highest20) {
        shouldEnter = true;
        entrySignal = 'Breakout_20';
      }
      // Exit on 10-period low break or trailing stop
      const lowest10 = Math.min(...candles.slice(i - 10, i).map((c: any) => c.low));
      if (position === 'long' && candle.close < lowest10) {
        shouldExit = true;
      }
    } else {
      // Default: Random walk with mean reversion (generic)
      const rsi = calculateRSI(candles, i, 14);
      if (!position && rsi < 35) {
        shouldEnter = true;
        entrySignal = 'Generic_Mean_Reversion';
      }
      if (position === 'long' && rsi > 65) {
        shouldExit = true;
      }
    }
    
    // Entry logic
    if (!position && shouldEnter) {
      position = 'long';
      entryPrice = candle.close;
      entryTime = candle.timestamp;
    }
    
    // Exit logic (indicator-based + stop loss/take profit)
    if (position === 'long') {
      const pnl = (candle.close - entryPrice) / entryPrice;
      
      // Stop Loss / Take Profit checks
      const stopLossHit = strategy.stopLoss && pnl < -strategy.stopLoss / 100;
      const takeProfitHit = strategy.takeProfit && pnl > strategy.takeProfit / 100;
      
      if (shouldExit || stopLossHit || takeProfitHit) {
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

  // Close any open position at end
  if (position === 'long') {
    const lastCandle = candles[candles.length - 1];
    const pnl = (lastCandle.close - entryPrice) / entryPrice;
    const tradePnl = pnl * capital * 0.1;
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
    warnings.push('Open position closed at end of backtest period');
  }

  // Calculate metrics
  const totalReturn = ((capital - initialCapital) / initialCapital) * 100;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
  const winRate = trades > 0 ? (wins / trades) * 100 : 0;
  const maxDrawdown = maxCapital > 0 ? ((maxCapital - minCapital) / maxCapital) * 100 : 0;
  
  // Sharpe ratio (simplified)
  const volatility = trades > 0 ? Math.abs(totalReturn) / Math.sqrt(trades) : 1;
  const sharpeRatio = volatility > 0 ? (totalReturn / 100) / (volatility / 100) : 0;
  
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
    warnings,
  };
}

// Calculate RSI (Real calculation, not mock)
function calculateRSI(candles: any[], index: number, period: number): number {
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

// Calculate Moving Average
function calculateMA(candles: any[], index: number, period: number): number {
  if (index < period - 1) return candles[index].close;
  
  let sum = 0;
  for (let i = index - period + 1; i <= index; i++) {
    sum += candles[i].close;
  }
  return sum / period;
}
