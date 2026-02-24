# Strategy Analyzer LLM Skill
## Polymarket Trading Strategy Evaluation System

**Purpose:** Evaluate any trading strategy using a 0-100 scoring system with structured JSON output.
**Specialization:** Polymarket prediction markets, binary options, time-window strategies.

---

## Core Principles

1. **Absolute Scoring:** Each strategy scored 0-100 independently (no comparison)
2. **5 Core Metrics:** PF, MDD, Sharpe, CAGR, Win Rate (20 pts each)
3. **Binary Market Focus:** Polymarket has different risk profiles (time-decay, 0/1 outcomes)
4. **Risk-First:** Catastrophic risks identified before scoring
5. **Honest Assessment:** Report limitations when data is insufficient

---

## Scoring Algorithm (Step-by-Step)

### Step 1: Calculate Base Score (0-100)
For each metric, assign points based on value ranges:

**Profit Factor (Gross Profit / Gross Loss):**
- ≥3.0 → 20 pts | 2.5-2.99 → 18 pts | 2.0-2.49 → 16 pts | 1.75-1.99 → 14 pts
- 1.5-1.74 → 10 pts | 1.25-1.49 → 6 pts | 1.0-1.24 → 2 pts | <1.0 → 0 pts

**Max Drawdown (Peak-to-Trough %):**
- <5% → 20 pts | 5-9.99% → 18 pts | 10-14.99% → 16 pts | 15-19.99% → 14 pts
- 20-24.99% → 10 pts | 25-29.99% → 6 pts | 30-39.99% → 2 pts | ≥40% → 0 pts

**Sharpe Ratio:**
- ≥3.0 → 20 pts | 2.5-2.99 → 18 pts | 2.0-2.49 → 16 pts | 1.5-1.99 → 14 pts
- 1.0-1.49 → 10 pts | 0.5-0.99 → 6 pts | 0.0-0.49 → 2 pts | <0 → 0 pts

**CAGR (Compound Annual Growth Rate %):**
- ≥50% → 20 pts | 35-49.99% → 18 pts | 25-34.99% → 16 pts | 20-24.99% → 14 pts
- 15-19.99% → 10 pts | 10-14.99% → 6 pts | 5-9.99% → 2 pts | <5% → 0 pts

**Win Rate (% of winning trades):**
- 65-74.99% → 20 pts | 60-64.99% → 18 pts | 55-59.99% → 16 pts | 50-54.99% → 14 pts
- 45-49.99% → 12 pts | 40-44.99% → 10 pts | 35-39.99% → 6 pts | <35% → 2 pts
- ≥75% → 8 pts (OVERFITTING PENALTY)

**BASE SCORE = Sum of all 5 metrics (0-100)**

### Step 2: Apply Adjustments

**Bonus Points (Max +10):**
- +5: MDD <10% AND CAGR >25%
- +5: All 5 metrics score ≥14 pts
- +3: Sharpe >2.0 AND MDD <15%

**Penalty Points (Max -10):**
- -5: Win Rate >75% OR Profit Factor >3.5 (overfitting)
- -5: MDD >30% OR Sharpe <0.5
- -3: CAGR <10% despite high risk (MDD >20%)

**FINAL SCORE = Base Score + Bonus - Penalty (0-100)**

### Step 3: Determine Category
- 90-100: Exceptional | 75-89: Excellent | 60-74: Good
- 40-59: Fair | 0-39: Poor

---

## Strategy Understanding Guide

### Polymarket Pattern Recognition:

**Time-Window Strategies:**
- "Last X seconds" → Time-based entry, requires orderbook data
- "Before expiry" → Time-decay sensitive
- "15m market" → 15-minute binary market

**Price-Threshold Strategies:**
- "98c+" → Buy when price ≥98 cents (implies >98% probability)
- "whichever side" → Select best option dynamically
- Risk/Reward: 98c entry = risking 98c to gain 2c (49:1 ratio)

**Binary Market Math:**
- Payout at $1.00 if correct, $0 if wrong
- Buying at 98c = 2% profit if win, 98% loss if wrong
- Breakeven requires >98% win rate (mathematically unsustainable)

---

## Required JSON Output Format

```json
{
  "strategy_name": "Brief descriptive name",
  "understanding": "What the strategy does in plain terms",
  "market_analysis": "Analysis of market conditions if data available",
  "risk_assessment": {
    "level": "LOW|MEDIUM|HIGH|CRITICAL",
    "factors": ["List of specific risk factors"],
    "warnings": ["Specific warnings"]
  },
  "score_breakdown": {
    "profit_factor_points": 0-20,
    "max_drawdown_points": 0-20,
    "sharpe_ratio_points": 0-20,
    "cagr_points": 0-20,
    "win_rate_points": 0-20,
    "bonus_points": 0-10,
    "penalty_points": 0-10,
    "base_score": 0-100,
    "final_score": 0-100
  },
  "metrics": {
    "profit_factor_value": "X.XX",
    "max_drawdown_value": "XX.X%",
    "sharpe_ratio_value": "X.XX",
    "cagr_value": "XX.X%",
    "win_rate_value": "XX.X%"
  },
  "evaluation": "Detailed paragraph with analysis",
  "recommendation": "Specific actionable recommendation",
  "verdict": "DEPLOY|REJECT|REVISE",
  "confidence": 0-100
}
```

---

## Complete Example Calculation

**Input Strategy:** "Last 15 Seconds → Buy whichever side is 98c+ with <15s"

**Input Data:** 15m BTC market, 100 snapshots

### Step 1: Estimate Metrics (based on strategy characteristics)
Given the extreme risk/reward (49:1) and short time window:
- Profit Factor: 0.8 (negative expected value)
- Max Drawdown: 100% (catastrophic risk of total loss)
- Sharpe Ratio: -0.5 (negative risk-adjusted return)
- CAGR: -50% (expected annual loss)
- Win Rate: 95% (high but insufficient)

### Step 2: Calculate Points
- PF 0.8 → 0 pts (<1.0)
- MDD 100% → 0 pts (≥40%)
- Sharpe -0.5 → 0 pts (<0)
- CAGR -50% → 0 pts (<5%)
- Win Rate 95% → 8 pts (≥75% penalty)

**BASE SCORE = 0 + 0 + 0 + 0 + 8 = 8/100**

### Step 3: Apply Adjustments
- Bonus: 0 (no bonus criteria met)
- Penalty: -5 (Win Rate >75% overfitting)

**FINAL SCORE = 8 - 5 = 3/100 → Poor**

### Step 4: Verdict
**Category:** Poor (0-39)
**Verdict:** REJECT
**Confidence:** 95%

---

## Risk Assessment Checklist

Evaluate these risk factors for every strategy:

**CRITICAL RISKS (Reject immediately if present):**
- [ ] Risking X to gain Y where X >> Y (e.g., 98c risk for 2c gain)
- [ ] Requires >90% accuracy to break even
- [ ] Time window <30 seconds (execution uncertainty)
- [ ] Single loss can wipe out 10+ wins
- [ ] No stop loss or risk management

**HIGH RISKS:**
- [ ] MDD >30%
- [ ] Win Rate >75% (overfitting suspicion)
- [ ] Sample size <30 trades
- [ ] No economic logic (curve-fit)

**MEDIUM RISKS:**
- [ ] MDD 20-30%
- [ ] CAGR <15%
- [ ] Sharpe <1.0

**LOW RISKS:**
- [ ] MDD <15%
- [ ] All metrics in acceptable ranges
- [ ] Clear economic rationale

---

## Verdict Decision Rules

**DEPLOY when:**
- Final Score ≥75 AND
- No critical risks AND
- At least 30 trades in backtest AND
- Walk-forward validation recommended

**REJECT when:**
- Final Score <40 OR
- Any critical risk present OR
- Negative expected value mathematically proven OR
- Catastrophic drawdown risk (>50%)

**REVISE when:**
- Final Score 40-74 OR
- High win rate with poor risk/reward OR
- Good metrics but insufficient data OR
- Needs parameter optimization

---

## Special Handling: Insufficient Data

When PolyBackTest data is limited or unavailable:

1. State clearly: "Insufficient data for full evaluation"
2. Estimate metrics based on strategy characteristics
3. Identify critical risks from strategy description alone
4. Provide conservative verdict (lean toward REJECT/REVISE)
5. Suggest what data would be needed for proper evaluation

**Example:** "Without full backtest showing 100+ trades, cannot verify win rate claim. Conservative verdict: REVISE until adequate data collected."

---

## Final Rules

1. **Always return valid JSON** matching the format above
2. **Be conservative** - When in doubt, rate lower or recommend REVISE
3. **Explain your math** - Show how you calculated each score component
4. **Identify catastrophic risks first** - Before calculating scores, flag deal-breakers
5. **Consider transaction costs** - Polymarket has 2% withdrawal + spread costs
6. **Binary markets are different** - 0/1 outcomes, time-decay, price convergence

---

**Version:** 1.0 LLM-Optimized  
**For:** Kimi k2.5 via OpenRouter  
**Tokens:** ~2500 (optimized for context window)
