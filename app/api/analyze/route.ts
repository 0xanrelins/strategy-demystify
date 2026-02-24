import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// Kimi API configuration
const KIMI_API_KEY = process.env.KIMI_API_KEY || 'sk-kimi-fdB4OfFqHH3I6DdNrertB8YCT1yWm2Fzv5mFWkdL7kR4CxaLdXJA0Z9heGEGB2id';
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// Debug: Log key presence (not the actual key)
console.log('Kimi API Key present:', !!KIMI_API_KEY);
console.log('Kimi API Key format:', KIMI_API_KEY?.substring(0, 20) + '...');

// PolyBackTest API configuration
const POLYBACKTEST_API_KEY = process.env.POLYBACKTEST_API_KEY;
const POLYBACKTEST_API_URL = process.env.POLYBACKTEST_API_URL || 'https://api.polybacktest.com/v1';

// Load skill files
function loadSkillFiles(): string {
  try {
    const skillsDir = join(process.cwd(), 'app', 'lib', 'skills');
    const files = [
      'SKILL.md',
      'backtest_evaluation_metrics.md',
      'how_to_evaluate_backtest_results.md',
      'strategy_scoring_framework.md'
    ];
    
    let content = '';
    for (const file of files) {
      try {
        const fileContent = readFileSync(join(skillsDir, file), 'utf-8');
        content += `\n\n=== ${file} ===\n\n${fileContent}`;
      } catch (e) {
        console.warn(`Could not load ${file}:`, e);
      }
    }
    return content;
  } catch (e) {
    console.error('Failed to load skill files:', e);
    return '';
  }
}

// Fetch market data from PolyBackTest
async function fetchPolyBackTestData(timeframe: string = '15m') {
  if (!POLYBACKTEST_API_KEY) {
    throw new Error('PolyBackTest API key not configured');
  }

  const marketType = timeframe === '15m' ? '15m' : 
                     timeframe === '1h' ? '1hr' : 
                     timeframe === '4h' ? '4hr' : '15m';

  // List markets
  const marketsResponse = await fetch(
    `${POLYBACKTEST_API_URL}/markets?market_type=${marketType}&limit=10`,
    {
      headers: { 'X-API-Key': POLYBACKTEST_API_KEY },
    }
  );

  if (!marketsResponse.ok) {
    throw new Error(`PolyBackTest API error: ${marketsResponse.status}`);
  }

  const marketsData = await marketsResponse.json();
  
  if (!marketsData.markets?.length) {
    return { markets: [], snapshots: [] };
  }

  // Get first market's snapshots
  const market = marketsData.markets[0];
  const snapshotsResponse = await fetch(
    `${POLYBACKTEST_API_URL}/markets/${market.market_id}/snapshots?limit=100`,
    {
      headers: { 'X-API-Key': POLYBACKTEST_API_KEY },
    }
  );

  if (!snapshotsResponse.ok) {
    throw new Error(`PolyBackTest snapshots error: ${snapshotsResponse.status}`);
  }

  const snapshotsData = await snapshotsResponse.json();
  
  return {
    market: market,
    snapshots: snapshotsData.snapshots || [],
    totalMarkets: marketsData.total || marketsData.markets.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { strategy, timeframe = '15m' } = body;

    if (!strategy) {
      return NextResponse.json(
        { error: 'Strategy description is required' },
        { status: 400 }
      );
    }

    // Load skill files for system prompt
    const skillContext = loadSkillFiles();

    // Fetch PolyBackTest data
    let polyData;
    try {
      polyData = await fetchPolyBackTestData(timeframe);
    } catch (e) {
      console.warn('PolyBackTest data fetch failed:', e);
      polyData = { markets: [], snapshots: [], error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Build system prompt
    const systemPrompt = `You are an expert trading strategy analyst and risk assessor specializing in Polymarket prediction markets and crypto trading strategies.

${skillContext}

Your task is to:
1. Analyze the user's strategy description
2. If PolyBackTest data is available, reference real market conditions
3. Apply the 0-100 scoring framework from the skill documentation
4. Provide detailed analysis with risk assessment
5. Give a clear verdict: DEPLOY, REJECT, or REVISE

CRITICAL: Always respond with valid JSON in this exact format:
{
  "strategy_name": "Brief name of the strategy",
  "understanding": "Your interpretation of what the strategy does",
  "market_analysis": "Analysis of market conditions if data available",
  "risk_assessment": {
    "level": "LOW|MEDIUM|HIGH|CRITICAL",
    "factors": ["List of risk factors"],
    "warnings": ["Specific warnings about this strategy"]
  },
  "score_breakdown": {
    "profit_factor": "0-20",
    "max_drawdown": "0-20",
    "sharpe_ratio": "0-20",
    "cagr": "0-20",
    "win_rate": "0-20",
    "bonus": "0-5",
    "penalty": "0-10",
    "total": "0-100"
  },
  "evaluation": "Detailed paragraph evaluating the strategy",
  "recommendation": "Specific actionable recommendation",
  "verdict": "DEPLOY|REJECT|REVISE",
  "confidence": "0-100"
}

Rules:
- Be honest about limitations (e.g., "Insufficient data to properly evaluate" if PolyBackTest data is missing)
- Apply the scoring framework strictly
- Consider time-window and price-threshold strategies carefully
- Binary market strategies (Polymarket) have different risk profiles than spot trading`;

    // Call Kimi API
    const kimiResponse = await fetch(KIMI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2-5',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Analyze this trading strategy and provide a complete evaluation:

STRATEGY: "${strategy}"

${polyData.market ? `MARKET DATA AVAILABLE:
- Market: ${polyData.market.slug || polyData.market.market_id}
- Type: ${polyData.market.market_type || timeframe}
- Snapshots: ${polyData.snapshots.length} data points
- Total Markets Available: ${polyData.totalMarkets}` : 'MARKET DATA: Not available - evaluation based on strategy description only'}

Provide your analysis in the required JSON format.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!kimiResponse.ok) {
      const errorText = await kimiResponse.text().catch(() => 'No error details');
      console.error('Kimi API Error Response:', {
        status: kimiResponse.status,
        statusText: kimiResponse.statusText,
        body: errorText,
        headers: Object.fromEntries(kimiResponse.headers.entries()),
      });
      throw new Error(`Kimi API error: ${kimiResponse.status} - ${kimiResponse.statusText}. Details: ${errorText.substring(0, 200)}`);
    }

    const kimiData = await kimiResponse.json();
    const aiResponse = kimiData.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('Empty response from Kimi API');
    }

    // Parse AI response
    let analysis;
    try {
      analysis = JSON.parse(aiResponse);
    } catch (e) {
      // If JSON parsing fails, wrap the text response
      analysis = {
        strategy_name: 'Unknown Strategy',
        understanding: strategy,
        evaluation: aiResponse,
        verdict: 'REVISE',
        confidence: 50,
        error: 'Failed to parse structured output',
      };
    }

    return NextResponse.json({
      success: true,
      strategy,
      analysis,
      data_source: polyData.market ? 'PolyBackTest' : 'None (analysis based on description only)',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Analyze API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze strategy',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
