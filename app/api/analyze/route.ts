import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// PolyBackTest API configuration
const POLYBACKTEST_API_KEY = process.env.POLYBACKTEST_API_KEY;
const POLYBACKTEST_API_URL = process.env.POLYBACKTEST_API_URL || 'https://api.polybacktest.com/v1';

// Load LLM-optimized skill file
function loadSkillFile(): string {
  try {
    const skillsDir = join(process.cwd(), 'app', 'lib', 'skills');
    const filePath = join(skillsDir, 'STRATEGY_ANALYZER_LLM.md');
    const content = readFileSync(filePath, 'utf-8');
    return content;
  } catch (e) {
    console.error('Failed to load skill file:', e);
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

    // Load LLM-optimized skill file
    const skillContext = loadSkillFile();

    // Fetch PolyBackTest data
    let polyData;
    try {
      polyData = await fetchPolyBackTestData(timeframe);
    } catch (e) {
      console.warn('PolyBackTest data fetch failed:', e);
      polyData = { markets: [], snapshots: [], error: e instanceof Error ? e.message : 'Unknown error' };
    }

    // Build system prompt
    const systemPrompt = `${skillContext}

CONTEXT:
You are analyzing a trading strategy for Polymarket prediction markets.

PolyBackTest Data Available: ${polyData.market ? 'YES' : 'NO'}
${polyData.market ? `Market: ${polyData.market.slug} | Snapshots: ${polyData.snapshots.length} | Total Markets: ${polyData.totalMarkets}` : 'No market data available - evaluate based on strategy description only'}

TASK:
Analyze the user's strategy and return ONLY valid JSON matching the format specified in the skill documentation above.`;

    // Call OpenRouter API with Kimi model
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    const openrouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://strategy-demystify.vercel.app',
        'X-Title': 'Strategy Demystify',
      },
      body: JSON.stringify({
        model: 'moonshotai/kimi-k2.5',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `STRATEGY TO ANALYZE: "${strategy}"

Apply the scoring algorithm from your instructions. Return valid JSON only.`,
          },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!openrouterResponse.ok) {
      const errorText = await openrouterResponse.text().catch(() => 'No error details');
      console.error('OpenRouter API Error Response:', {
        status: openrouterResponse.status,
        statusText: openrouterResponse.statusText,
        body: errorText,
      });
      throw new Error(`OpenRouter API error: ${openrouterResponse.status} - ${openrouterResponse.statusText}. Details: ${errorText.substring(0, 200)}`);
    }

    const openrouterData = await openrouterResponse.json();
    const aiResponse = openrouterData.choices?.[0]?.message?.content;

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
