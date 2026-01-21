import { useState, useRef, useEffect, useMemo } from 'react'
import { Send, Newspaper, TrendingUp, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getNewsForStock, type NewsItem } from '@/data/news'
import { useAppStore } from '@/store/useAppStore'
import { DemoModeToggle, SpotlightTour } from '@/components/demo'
import { getSpotlightsForLocation } from '@/data/featureSpotlights'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  newsItems?: NewsItem[]
  linkedSegments?: { stock: string; segmentId: string; name: string }[]
}

const suggestedQuestions = [
  "Why is Zomato's profitability score low?",
  "Explain ROE in simple terms",
  "Compare Axis Bank vs HDFC Bank",
  "What are the red flags for TCS?",
]

const personalizationQuestions = [
  "Why different verdicts for different profiles?",
  "How does risk tolerance affect my score?",
  "How does personalization work?",
]

const actionQuestions = [
  "Should I buy Zomato now?",
  "When should I sell?",
  "What's the biggest risk for Axis Bank?",
]

const newsQuestions = [
  "What's the latest news on Zomato?",
  "Any news affecting Axis Bank's score?",
  "Show me TCS news and impacts",
]

// Pre-scripted responses for chat queries - profile-aware
const getNewsResponse = (query: string, profileName?: string): { content: string; newsItems?: NewsItem[]; linkedSegments?: { stock: string; segmentId: string; name: string }[] } => {
  const lowerQuery = query.toLowerCase()

  // ============ NEWS QUERIES (Original 3) ============

  if (lowerQuery.includes('zomato') && (lowerQuery.includes('news') || lowerQuery.includes('latest'))) {
    const news = getNewsForStock('zomato')
    return {
      content: `Here's the latest news for **Zomato (Eternal)**:\n\n${news.slice(0, 3).map((n, i) =>
        `${i + 1}. **${n.headline}** (${n.source})\n   ${n.summary}\n   Impact: ${n.impactSegments.join(', ')} segments`
      ).join('\n\n')}\n\nThese news items affect the segments listed above. Click to see how they impact the analysis.`,
      newsItems: news.slice(0, 3),
      linkedSegments: [
        { stock: 'zomato', segmentId: 'profitability', name: 'Profitability' },
        { stock: 'zomato', segmentId: 'growth', name: 'Growth' },
      ],
    }
  }

  if (lowerQuery.includes('axis') && (lowerQuery.includes('news') || lowerQuery.includes('affecting'))) {
    const news = getNewsForStock('axisbank')
    return {
      content: `Here's how recent news is affecting **Axis Bank's** score:\n\n${news.slice(0, 3).map((n, i) =>
        `${i + 1}. **${n.headline}** (${n.sentiment === 'positive' ? 'Positive' : n.sentiment === 'negative' ? 'Negative' : 'Neutral'})\n   ${n.summary}\n   Affects: ${n.impactSegments.join(', ')}`
      ).join('\n\n')}\n\n**Score Impact:** The positive earnings news has contributed +0.3 to the overall score this week.`,
      newsItems: news.slice(0, 3),
      linkedSegments: [
        { stock: 'axisbank', segmentId: 'profitability', name: 'Profitability' },
        { stock: 'axisbank', segmentId: 'financials', name: 'Financial Health' },
      ],
    }
  }

  if (lowerQuery.includes('tcs') && (lowerQuery.includes('news') || lowerQuery.includes('impact'))) {
    const news = getNewsForStock('tcs')
    return {
      content: `Latest **TCS** news and their impact on analysis:\n\n${news.slice(0, 3).map((n, i) =>
        `${i + 1}. **${n.headline}**\n   Sentiment: ${n.sentiment === 'positive' ? 'Positive' : n.sentiment === 'negative' ? 'Negative' : 'Neutral'}\n   ${n.summary}`
      ).join('\n\n')}\n\n**Analysis Impact:**\n- IT spending news affects **Growth** segment\n- Dividend announcement impacts **Valuation** for dividend investors\n\n*Source: Company filings, Financial news aggregators*`,
      newsItems: news.slice(0, 3),
      linkedSegments: [
        { stock: 'tcs', segmentId: 'growth', name: 'Growth' },
        { stock: 'tcs', segmentId: 'valuation', name: 'Valuation' },
      ],
    }
  }

  // ============ ANALYSIS QUERIES (Original 4) ============

  if (lowerQuery.includes('zomato') && lowerQuery.includes('profitability')) {
    return {
      content: `**Zomato's Profitability Score Analysis**\n\nZomato scores **4.2/10** on profitability, which is below sector average (5.8). Here's why:\n\n**Key Issues:**\n1. **Operating Margin: -2.3%** - Still burning cash on customer acquisition\n2. **ROCE: 1.8%** - Low return on invested capital\n3. **Net Profit Margin: -1.5%** - Just turned profitable in Q4\n\n**Context:** This is typical for growth-stage tech companies prioritizing market share over profits. For growth investors, this may be acceptable if revenue growth (45% YoY) continues.\n\n**What to watch:** Operating leverage improving as Blinkit scales.\n\n*Source: Q3 FY24 Investor Presentation, Page 12*`,
      linkedSegments: [
        { stock: 'zomato', segmentId: 'profitability', name: 'Profitability Deep Dive' },
      ],
    }
  }

  if (lowerQuery.includes('roe') && lowerQuery.includes('simple')) {
    return {
      content: `**ROE Explained Simply**\n\nROE (Return on Equity) tells you how efficiently a company uses shareholder money to generate profits.\n\n**Think of it like this:**\nIf you invested Rs.100 in a company and they made Rs.20 profit using that money, the ROE is 20%.\n\n**Formula:** Net Profit / Shareholder Equity × 100\n\n**What's good?**\n- Above 15%: Excellent\n- 10-15%: Good\n- Below 10%: May need investigation\n\n**Example from your watchlist:**\n- TCS: 47% ROE (excellent)\n- HDFC Bank: 16% ROE (good)\n- Zomato: 2% ROE (low, but improving)\n\n**Why it matters for YOU:** As a growth investor, look for improving ROE trend, not just current value.`,
    }
  }

  if (lowerQuery.includes('compare') && lowerQuery.includes('axis') && lowerQuery.includes('hdfc')) {
    return {
      content: `**Axis Bank vs HDFC Bank Comparison**\n\n| Metric | Axis Bank | HDFC Bank |\n|--------|-----------|------------|\n| Overall Score | 7.2 | 8.1 |\n| P/E Ratio | 12.5x | 18.2x |\n| ROE | 16.2% | 17.8% |\n| NPA Ratio | 1.8% | 1.2% |\n| Growth (YoY) | 22% | 18% |\n\n**Verdict by Profile:**\n- **Growth Investor:** Axis Bank edges out (faster growth, cheaper valuation)\n- **Value Investor:** Axis Bank (lower P/E, acceptable quality)\n- **Safety-First:** HDFC Bank (better asset quality, track record)\n\n**Key Insight:** Axis Bank offers better value but slightly higher risk. HDFC Bank is premium-priced for premium quality.\n\n*Source: Q3 FY24 Results, Bloomberg*`,
      linkedSegments: [
        { stock: 'axisbank', segmentId: 'valuation', name: 'Axis Valuation' },
        { stock: 'hdfcbank', segmentId: 'valuation', name: 'HDFC Valuation' },
      ],
    }
  }

  if (lowerQuery.includes('red flag') && lowerQuery.includes('tcs')) {
    return {
      content: `**TCS Red Flag Analysis**\n\nGood news! TCS has **0 critical red flags** out of 16 parameters scanned.\n\n**All Clear:**\n- Debt/Equity: 0.02 (Excellent)\n- Promoter Pledge: 0% (Safe)\n- Auditor Opinion: Clean\n- Related Party Transactions: Normal\n- Cash Flow Quality: Strong\n\n**Minor Watch Items (not red flags):**\n1. **Attrition Rate: 13.2%** - Industry average, but worth monitoring\n2. **Revenue Concentration:** Top 10 clients = 35% revenue\n\n**Verdict:** TCS is one of the cleanest large-caps on governance and financial health metrics.\n\n*Source: Annual Report FY24, Corporate Governance Section*`,
      linkedSegments: [
        { stock: 'tcs', segmentId: 'governance', name: 'Governance' },
        { stock: 'tcs', segmentId: 'balancesheet', name: 'Balance Sheet' },
      ],
    }
  }

  // ============ NEW: PERSONALIZATION QUERIES (3) ============

  if ((lowerQuery.includes('why') || lowerQuery.includes('how')) &&
      (lowerQuery.includes('different') || lowerQuery.includes('sneha') || lowerQuery.includes('ankit')) &&
      (lowerQuery.includes('verdict') || lowerQuery.includes('rating') || lowerQuery.includes('score'))) {
    return {
      content: `**Why Different Verdicts for Different Profiles?**\n\nGreat question! StockFox uses a **6-Dimension Personalization Engine** that weighs the 11 analysis segments differently based on YOUR investing style.\n\n**Example: Zomato Analysis**\n\n| Profile | Verdict | Key Reason |\n|---------|---------|------------|\n| **Ankit** (Growth) | 7.2/10 BUY | Weights Growth (45% YoY revenue) heavily |\n| **Sneha** (Value) | 4.1/10 AVOID | Weights Profitability & Valuation - both weak |\n| **Kavya** (Beginner) | 5.5/10 HOLD | Balanced view, flags complexity |\n\n**How it works:**\n1. **Same data** - All 200+ metrics are identical\n2. **Different weights** - Growth investors care less about current P/E\n3. **Context-aware** - Your risk tolerance adjusts position sizing suggestions\n\n**The insight:** There's no "objectively best" stock. What's best *for you* depends on your goals, timeline, and risk capacity.\n\n*This is why StockFox shows YOU the verdict, not THE verdict.*`,
      linkedSegments: [
        { stock: 'zomato', segmentId: 'growth', name: 'Zomato Growth' },
        { stock: 'zomato', segmentId: 'valuation', name: 'Zomato Valuation' },
      ],
    }
  }

  if (lowerQuery.includes('risk tolerance') && (lowerQuery.includes('affect') || lowerQuery.includes('impact') || lowerQuery.includes('change'))) {
    return {
      content: `**How Risk Tolerance Affects Your Analysis**\n\nYour risk tolerance (${profileName ? `currently set to match your profile` : 'Conservative/Moderate/Aggressive'}) changes three things:\n\n**1. Segment Weights**\n| Risk Level | Values More | Values Less |\n|------------|-------------|-------------|\n| Conservative | Balance Sheet, Governance | Growth, Technical |\n| Moderate | Balanced across all | - |\n| Aggressive | Growth, Momentum | Valuation |\n\n**2. Position Sizing**\n- Conservative: "Start with 2-3% of portfolio"\n- Aggressive: "Can allocate up to 8-10%"\n\n**3. Red Flag Sensitivity**\n- Conservative: Yellow flags shown as warnings\n- Aggressive: Only critical red flags highlighted\n\n**Example:** A stock with high growth but weak balance sheet:\n- Conservative investor: 5.2/10 (HOLD)\n- Aggressive investor: 7.8/10 (BUY)\n\n*Your settings can be adjusted in Profile Settings.*`,
    }
  }

  if (lowerQuery.includes('personali') && (lowerQuery.includes('how') || lowerQuery.includes('what') || lowerQuery.includes('work'))) {
    return {
      content: `**StockFox 6D Personalization Engine**\n\nEvery verdict is customized across 6 dimensions:\n\n**1. Investment Thesis** 📊\nGrowth vs Value vs Income vs Momentum\n→ Changes which metrics matter most\n\n**2. Risk Tolerance** 🛡️\nConservative to Aggressive\n→ Adjusts position sizing & red flag sensitivity\n\n**3. Time Horizon** ⏱️\nShort (1yr) to Very Long (10yr+)\n→ Weights technical vs fundamental differently\n\n**4. Experience Level** 🎓\nBeginner to Advanced\n→ Adjusts explanation complexity & jargon\n\n**5. Sector Preferences** 🏢\nBanking, IT, Consumer, etc.\n→ Applies sector-specific frameworks\n\n**6. Portfolio Context** 💼\nYour existing holdings\n→ Flags concentration risks\n\n**Result:** The same Zomato gets a different score for a growth-seeking techie vs a dividend-seeking retiree. Both are valid - they're just different interpretations of the same data.\n\n*This is what makes StockFox your "personal analyst."*`,
    }
  }

  // ============ NEW: RISK QUERIES (2) ============

  if ((lowerQuery.includes('biggest risk') || lowerQuery.includes('main risk') || lowerQuery.includes('top risk')) &&
      (lowerQuery.includes('axis') || lowerQuery.includes('bank'))) {
    return {
      content: `**Axis Bank: Top Risks to Monitor**\n\n**🔴 Primary Risk: Asset Quality Pressure**\nNPA ratio at 1.8% is manageable but higher than HDFC (1.2%). Watch for:\n- Retail loan slippages in unsecured segment\n- Corporate stress in SME portfolio\n\n**🟡 Secondary Risks:**\n\n1. **Competition Intensity**\n   - HDFC Bank merger creates a giant competitor\n   - Fintech eating into payments/cards revenue\n\n2. **Interest Rate Sensitivity**\n   - Net Interest Margin may compress if RBI cuts rates\n   - Currently benefits from high rate environment\n\n3. **Management Transition**\n   - New CEO appointed mid-2023\n   - Strategy continuity needs monitoring\n\n**Mitigating Factors:**\n- Strong capital adequacy (16.5%)\n- Improving RoA trajectory\n- Reasonable valuation vs peers\n\n**Verdict:** Risks are manageable for the reward. Suitable for moderate risk tolerance.\n\n*Source: Q3 FY24 Investor Presentation, RBI Data*`,
      linkedSegments: [
        { stock: 'axisbank', segmentId: 'balancesheet', name: 'Balance Sheet Health' },
        { stock: 'axisbank', segmentId: 'governance', name: 'Management & Governance' },
      ],
    }
  }

  if ((lowerQuery.includes('safe') || lowerQuery.includes('risky')) && lowerQuery.includes('zomato')) {
    return {
      content: `**Is Zomato Safe to Invest?**\n\nIt depends on your definition of "safe" and your profile:\n\n**For ${profileName || 'a typical investor'}:**\n\n**✅ What's Safe:**\n- Zero debt (cash-rich balance sheet)\n- Market leadership (55% food delivery share)\n- Profitable as of Q4 FY24\n- Strong promoter backing (Deepinder Goyal)\n\n**⚠️ What's Risky:**\n- Valuation still expensive (P/E 150x+)\n- Blinkit burning cash for growth\n- Regulatory risks in quick commerce\n- Competition from Swiggy IPO\n\n**Profile-Based View:**\n| Profile | Is it Safe? |\n|---------|-------------|\n| Growth Investor | ✅ Yes - growth justifies risk |\n| Value Investor | ❌ No - too expensive |\n| Beginner | ⚠️ Maybe - high volatility |\n| Income Seeker | ❌ No - no dividends |\n\n**My Suggestion:** If you can handle 30-40% drawdowns and have 5+ year horizon, Zomato can be a 5-8% portfolio allocation.\n\n*Source: Company filings, market data*`,
      linkedSegments: [
        { stock: 'zomato', segmentId: 'valuation', name: 'Valuation Analysis' },
        { stock: 'zomato', segmentId: 'balancesheet', name: 'Balance Sheet' },
      ],
    }
  }

  // ============ NEW: SCORING QUERIES (2) ============

  if ((lowerQuery.includes('how') || lowerQuery.includes('what')) &&
      (lowerQuery.includes('profitability') || lowerQuery.includes('score')) &&
      lowerQuery.includes('calculated')) {
    return {
      content: `**How Profitability Score is Calculated**\n\nProfitability is one of 11 segments, scored 0-10. Here's the methodology:\n\n**Metrics Included (18 total):**\n| Metric | Weight | What it Measures |\n|--------|--------|------------------|\n| ROE | 15% | Return on shareholder equity |\n| ROCE | 15% | Return on total capital employed |\n| Operating Margin | 12% | Core business profitability |\n| Net Profit Margin | 12% | Bottom-line efficiency |\n| ROA | 10% | Asset utilization |\n| Gross Margin | 8% | Pricing power |\n| 5-Year Trend | 10% | Consistency over time |\n| Sector Comparison | 18% | vs industry peers |\n\n**Scoring Logic:**\n1. Each metric normalized to 0-10 scale\n2. Compared against sector benchmarks\n3. Weighted average = Segment Score\n4. Trend adjustment (+/- 0.5 for improving/declining)\n\n**Example: Zomato = 4.2/10**\n- ROE: 2% → 2.0/10\n- Operating Margin: -2.3% → 3.0/10\n- vs Sector Average: Below → -0.5 penalty\n\n*Source: StockFox Methodology Document*`,
      linkedSegments: [
        { stock: 'zomato', segmentId: 'profitability', name: 'See Profitability Details' },
      ],
    }
  }

  if ((lowerQuery.includes('what') || lowerQuery.includes('mean')) &&
      (lowerQuery.includes('7.2') || lowerQuery.includes('score') || lowerQuery.includes('/10') || lowerQuery.includes('out of 10'))) {
    return {
      content: `**Understanding StockFox Scores**\n\nScores range from **0-10** and translate to clear verdicts:\n\n**Score Tiers:**\n| Score | Tier | Verdict | Meaning |\n|-------|------|---------|----------|\n| 8.0-10 | 🟢 Strong | STRONG BUY | Exceptional opportunity |\n| 6.5-7.9 | 🟢 Good | BUY | Favorable risk-reward |\n| 5.0-6.4 | 🟡 Moderate | HOLD | Wait for better entry |\n| 3.5-4.9 | 🟠 Weak | AVOID | Concerns outweigh potential |\n| 0-3.4 | 🔴 Poor | SELL | Significant red flags |\n\n**What 7.2/10 Means (Zomato for Ankit):**\n- Falls in "Good" tier → BUY verdict\n- Above average but not exceptional\n- Suitable for 5-8% portfolio allocation\n- Key segments pulling it up: Growth (8.5), Technical (7.8)\n- Key segments pulling it down: Profitability (4.2), Valuation (5.1)\n\n**Important:** The score is personalized. Sneha (value investor) sees 4.1/10 for the same Zomato because her weights prioritize profitability over growth.\n\n*Scores update daily based on market data and quarterly earnings.*`,
    }
  }

  // ============ NEW: ACTION QUERIES (2) ============

  if ((lowerQuery.includes('should') && lowerQuery.includes('buy')) ||
      (lowerQuery.includes('good time') && lowerQuery.includes('buy'))) {
    const stockMentioned = lowerQuery.includes('tcs') ? 'TCS' :
                          lowerQuery.includes('zomato') ? 'Zomato' :
                          lowerQuery.includes('axis') ? 'Axis Bank' : 'this stock'
    return {
      content: `**Should You Buy ${stockMentioned} Now?**\n\nLet me break this down for ${profileName || 'your profile'}:\n\n**Entry Assessment:**\n${stockMentioned === 'TCS' ? `
| Factor | Status | Signal |
|--------|--------|--------|
| Valuation vs History | P/E 28x vs 5Y avg 26x | 🟡 Slightly expensive |
| Technical Setup | Above 200 DMA, consolidating | 🟢 Favorable |
| Earnings Momentum | Steady, no surprises | 🟢 Stable |
| Sector Outlook | IT spending recovering | 🟢 Positive |

**Verdict:** Decent entry point. Consider SIP approach rather than lump sum.

**Position Sizing:** Start with 3-5% of portfolio. Add on 5-7% dips.` : stockMentioned === 'Zomato' ? `
| Factor | Status | Signal |
|--------|--------|--------|
| Valuation | P/E 150x+ (expensive) | 🔴 Stretched |
| Technical Setup | Near all-time highs | 🟡 Extended |
| Growth Trajectory | 45% YoY revenue growth | 🟢 Strong |
| Profitability | Just turned profitable | 🟢 Improving |

**Verdict:** Wait for 10-15% correction for better entry. Currently priced for perfection.

**If you must buy now:** Start with 2-3% only, keep cash ready to average down.` : `
Consider checking the specific stock analysis page for detailed entry guidance.`}

**Remember:** No one can perfectly time the market. Focus on whether the business quality matches your investment thesis.\n\n*This is analysis, not advice. Always do your own research.*`,
      linkedSegments: [
        { stock: stockMentioned.toLowerCase().replace(' ', ''), segmentId: 'valuation', name: 'Valuation Check' },
        { stock: stockMentioned.toLowerCase().replace(' ', ''), segmentId: 'technical', name: 'Technical Setup' },
      ],
    }
  }

  if ((lowerQuery.includes('when') || lowerQuery.includes('should')) && lowerQuery.includes('sell')) {
    return {
      content: `**When to Sell: Exit Framework**\n\nStockFox tracks these exit triggers for your holdings:\n\n**🔴 Sell Signals (Strong):**\n1. **Thesis Break** - Core investment reason no longer valid\n   - Example: Bought for growth, but growth slowing to <10%\n2. **Red Flag Alert** - New critical governance/financial issue\n3. **Score Drop >2 points** - Significant deterioration\n4. **Valuation Extreme** - P/E 2x+ historical average\n\n**🟡 Review Signals (Consider):**\n1. **Position too large** - >15% of portfolio\n2. **Better opportunity** - Found higher conviction idea\n3. **Life event** - Need funds for other goals\n\n**🟢 Hold Signals (Don't panic sell):**\n1. **Temporary dip** - No fundamental change\n2. **Sector rotation** - Cyclical underperformance\n3. **Market correction** - Rising tide lifts all boats (and falling)\n\n**For Zomato specifically:**\nWatch for: Growth deceleration, Blinkit losses widening, competitive intensity\nDon't panic on: Short-term price swings, quarterly misses by small %\n\n*Set price alerts in the Alerts page to stay informed.*`,
      linkedSegments: [
        { stock: 'zomato', segmentId: 'growth', name: 'Track Growth' },
      ],
    }
  }

  // ============ NEW: EDUCATION QUERIES (2) ============

  if (lowerQuery.includes('portfolio concentration') ||
      (lowerQuery.includes('concentration') && lowerQuery.includes('mean'))) {
    return {
      content: `**Portfolio Concentration Explained**\n\nConcentration means how much of your portfolio is in one stock or sector.\n\n**Why it matters:**\nIf 50% of your portfolio is in banking stocks and banks crash, you lose big. Diversification protects you.\n\n**StockFox Thresholds:**\n| Concentration | Level | Action |\n|---------------|-------|--------|\n| <5% per stock | 🟢 Safe | No concerns |\n| 5-10% per stock | 🟡 Moderate | Monitor closely |\n| >10% per stock | 🟠 High | Consider trimming |\n| >25% in one sector | 🔴 Risky | Diversify! |\n\n**Your Portfolio Check:**\n${profileName === 'ankit' || profileName === 'Ankit' ?
      '- Zomato: 35% allocation ⚠️ HIGH\n- Consider trimming to 15-20%' :
      '- Check your Portfolio page for current allocations'}\n\n**Rule of Thumb:**\n- No single stock >10% (unless very high conviction)\n- No single sector >30%\n- Aim for 15-25 quality stocks across 6-8 sectors\n\n*Go to Portfolio → See your concentration chart*`,
      linkedSegments: [
        { stock: 'portfolio', segmentId: 'overview', name: 'View Portfolio' },
      ],
    }
  }

  if ((lowerQuery.includes('debt') && lowerQuery.includes('equity')) ||
      (lowerQuery.includes('d/e') || lowerQuery.includes('de ratio'))) {
    return {
      content: `**Debt-to-Equity Ratio Explained**\n\n**Simple Definition:**\nHow much the company owes (debt) compared to what shareholders own (equity).\n\n**Formula:** Total Debt / Shareholder Equity\n\n**Example:**\nIf a company has Rs.100 crore debt and Rs.200 crore equity:\nD/E = 100/200 = **0.5**\n\n**What's Good?**\n| D/E Ratio | Interpretation |\n|-----------|----------------|\n| < 0.3 | 🟢 Very conservative (maybe too safe) |\n| 0.3 - 0.7 | 🟢 Healthy balance |\n| 0.7 - 1.5 | 🟡 Moderate - depends on industry |\n| > 1.5 | 🟠 High leverage - risky |\n| > 2.0 | 🔴 Very high - investigate |\n\n**Sector Matters:**\n- IT/Tech: Expect < 0.3 (asset-light)\n- Banking: 8-12x is normal (different metric used)\n- Real Estate: 1-2x is common (capital intensive)\n\n**From Your Watchlist:**\n- TCS: 0.02 (minimal debt - typical for IT)\n- Zomato: 0.01 (cash-rich, no debt)\n- Axis Bank: Uses Capital Adequacy instead\n\n*Low D/E = less risk, but also potentially lower returns.*`,
    }
  }

  // ============ NEW: COMPARISON QUERIES (1) ============

  if (lowerQuery.includes('compare') && lowerQuery.includes('all') &&
      (lowerQuery.includes('stock') || lowerQuery.includes('3'))) {
    return {
      content: `**Comparing Your Watchlist: Zomato vs Axis Bank vs TCS**\n\n| Metric | Zomato | Axis Bank | TCS |\n|--------|--------|-----------|-----|\n| **Overall Score** | 7.2 | 6.8 | 7.5 |\n| **Verdict** | BUY | BUY | BUY |\n| **P/E Ratio** | 150x | 12.5x | 28x |\n| **ROE** | 2% | 16% | 47% |\n| **Revenue Growth** | 45% | 22% | 8% |\n| **Dividend Yield** | 0% | 0.8% | 1.2% |\n| **Red Flags** | 0 | 1 (NPA) | 0 |\n\n**Best For:**\n- 📈 **Growth Investors:** Zomato (highest growth)\n- 💰 **Value Investors:** Axis Bank (cheapest P/E)\n- 🛡️ **Safety Seekers:** TCS (strongest balance sheet)\n- 💵 **Income Seekers:** TCS (best dividends)\n\n**Portfolio Suggestion:**\nA balanced approach could be: 40% TCS (stability), 35% Axis Bank (value), 25% Zomato (growth kicker)\n\n*Go to Compare page for detailed side-by-side analysis →*`,
      linkedSegments: [
        { stock: 'compare', segmentId: 'all', name: 'Full Comparison' },
      ],
    }
  }

  // ============ NEW: META QUERIES (2) ============

  if (lowerQuery.includes('accurate') || lowerQuery.includes('reliable') || lowerQuery.includes('trust')) {
    return {
      content: `**How Accurate is StockFox?**\n\nTransparency is our core value. Here's what you should know:\n\n**What We're Good At:**\n✅ **Data Accuracy:** 94% of our analysis is backed by cited sources (annual reports, exchange filings, earnings calls)\n✅ **Methodology Transparency:** Every score shows the calculation - you can verify it\n✅ **Personalization:** The 6D engine is mathematically sound\n\n**What We're Honest About:**\n⚠️ **Not Predictions:** We analyze current state, we don't predict future prices\n⚠️ **No Guarantees:** Even great analysis can't predict black swan events\n⚠️ **Backward-Looking:** Financial data is historical; future may differ\n\n**Our Philosophy:**\n*"We'd rather show you transparent analysis you can verify than give you confident predictions we can't back up."*\n\n**Verification:**\n- Click any metric → See the source citation\n- Every segment → View methodology\n- Every verdict → Understand the weights\n\n**Trust but Verify:** Use StockFox as research tool, not investment oracle.\n\n*We're building the most transparent stock analysis platform in India.*`,
    }
  }

  if (lowerQuery.includes('where') && (lowerQuery.includes('data') || lowerQuery.includes('source') || lowerQuery.includes('get'))) {
    return {
      content: `**StockFox Data Sources**\n\nWe use multiple verified sources to ensure accuracy:\n\n**📊 Financial Data:**\n- BSE/NSE official filings\n- Annual Reports (downloaded from company websites)\n- Quarterly earnings presentations\n- Exchange announcements\n\n**📈 Market Data:**\n- Real-time: NSE/BSE price feeds\n- Historical: Exchange databases\n- Technical indicators: Calculated in-house\n\n**📰 News & Sentiment:**\n- Major financial news sources\n- Company press releases\n- Regulatory announcements (SEBI, RBI)\n\n**🏛️ Ownership Data:**\n- Shareholding patterns from exchange filings\n- Mutual fund/FII holdings from AMFI/SEBI\n- Promoter pledge data from depositories\n\n**Refresh Frequency:**\n| Data Type | Update Frequency |\n|-----------|------------------|\n| Prices | 5-minute delay |\n| Fundamentals | Quarterly |\n| News | Real-time |\n| Ownership | Monthly |\n\n**Citation Policy:** Every metric shows its source. Click the info icon on any metric to see exactly where the data comes from.\n\n*We never use "estimated" or "projected" data without clearly labeling it.*`,
    }
  }

  // ============ FALLBACK (New) ============

  return { content: '' }
}

// Format message content with basic markdown
function formatContent(content: string) {
  // Simple markdown parsing for bold text
  const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="text-neutral-400 text-sm">{part.slice(1, -1)}</em>
    }
    return part
  })
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { currentProfile, demoMode, toggleDemoMode } = useAppStore()

  // Demo Mode spotlights
  const spotlights = useMemo(() => getSpotlightsForLocation('chat'), [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate typing delay
    setTimeout(() => {
      const newsResponse = getNewsResponse(input, currentProfile?.displayName)

      let assistantMessage: Message

      if (newsResponse.content) {
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: newsResponse.content,
          newsItems: newsResponse.newsItems,
          linkedSegments: newsResponse.linkedSegments,
        }
      } else {
        // Improved fallback with helpful suggestions
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I'm still learning about that topic! 🦊\n\nHere are some things I can help you with:\n\n**📊 Analysis Questions:**\n- "Why is Zomato's profitability score low?"\n- "What does 7.2/10 mean?"\n- "How is the score calculated?"\n\n**🎯 Personalization:**\n- "Why different verdicts for Sneha vs Ankit?"\n- "How does risk tolerance affect my score?"\n\n**💡 Stock Decisions:**\n- "Should I buy TCS now?"\n- "What's the biggest risk for Axis Bank?"\n- "When should I sell?"\n\n**📰 News & Data:**\n- "What's the latest news on Zomato?"\n- "Where do you get your data?"\n\n**📚 Learn:**\n- "Explain ROE in simple terms"\n- "What is portfolio concentration?"\n\nTry one of these, or rephrase your question!`,
        }
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 800)
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] animate-fade-in">
      {/* Chat Header */}
      <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-white/5 p-4 mb-4" data-spotlight="chat-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-2xl">🦊</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">StockFox AI</h1>
              <p className="text-sm text-neutral-400">Ask anything about stocks & analysis</p>
            </div>
          </div>
          {/* Demo Mode Toggle - Ankit only */}
          <DemoModeToggle isEnabled={demoMode} onToggle={toggleDemoMode} />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {/* Welcome message when empty */}
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-4xl">🦊</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">How can I help you today?</h2>
            <p className="text-neutral-400 text-sm max-w-md mb-6">
              I can explain stock metrics, analyze companies, compare stocks, and answer your investment questions.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  message.role === 'assistant'
                    ? 'bg-primary-500/20'
                    : 'bg-dark-600'
                )}
              >
                {message.role === 'assistant' ? (
                  <span className="text-sm">🦊</span>
                ) : (
                  <span className="text-sm">👤</span>
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  'max-w-[85%] p-4 rounded-2xl',
                  message.role === 'assistant'
                    ? 'bg-dark-800 border border-white/5'
                    : 'bg-primary-600'
                )}
                {...(message.role === 'assistant' && index === messages.findIndex(m => m.role === 'assistant') && { 'data-spotlight': 'chat-response' })}
              >
                <p className={cn(
                  'text-sm leading-relaxed whitespace-pre-wrap',
                  message.role === 'assistant' ? 'text-neutral-300' : 'text-white'
                )}>
                  {message.role === 'assistant' ? formatContent(message.content) : message.content}
                </p>

                {/* Linked Segments */}
                {message.linkedSegments && message.linkedSegments.length > 0 && (
                  <div
                    className="mt-4 pt-3 border-t border-white/5"
                    {...(index === messages.findIndex(m => m.role === 'assistant' && m.linkedSegments && m.linkedSegments.length > 0) && { 'data-spotlight': 'linked-segments' })}
                  >
                    <p className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />
                      Related Segments:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.linkedSegments.map((seg, i) => (
                        <Link
                          key={i}
                          to={`/stock/${seg.stock}/segment/${seg.segmentId}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary-500/10 text-primary-400 rounded-lg text-xs hover:bg-primary-500/20 transition-colors"
                        >
                          <TrendingUp className="w-3 h-3" />
                          {seg.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
              <span className="text-sm">🦊</span>
            </div>
            <div className="bg-dark-800 border border-white/5 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-neutral-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions - Show when few messages */}
      {messages.length <= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 space-y-3"
        >
          <div data-spotlight="analysis-questions">
            <p className="text-xs text-neutral-500 mb-2">📊 Analysis:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 border border-white/5 rounded-full text-xs text-neutral-300 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          <div data-spotlight="personalization-questions">
            <p className="text-xs text-neutral-500 mb-2">🎯 Personalization:</p>
            <div className="flex flex-wrap gap-2">
              {personalizationQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 bg-success-500/10 hover:bg-success-500/20 border border-success-500/20 text-success-400 rounded-full text-xs transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          <div data-spotlight="decision-questions">
            <p className="text-xs text-neutral-500 mb-2">💡 Decisions:</p>
            <div className="flex flex-wrap gap-2">
              {actionQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 bg-warning-500/10 hover:bg-warning-500/20 border border-warning-500/20 text-warning-400 rounded-full text-xs transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          <div data-spotlight="news-questions">
            <p className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
              <Newspaper className="w-3 h-3" />
              News & signals:
            </p>
            <div className="flex flex-wrap gap-2">
              {newsQuestions.map((question, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 text-primary-400 rounded-full text-xs transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <div className="bg-dark-800/80 backdrop-blur-xl rounded-2xl border border-white/5 p-3" data-spotlight="chat-input">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about any stock..."
            className="flex-1 bg-dark-700 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-primary-500/50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={cn(
              'p-3 rounded-xl transition-all',
              input.trim() && !isTyping
                ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-500/20'
                : 'bg-dark-700 text-neutral-500'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Spotlight Tour for Demo Mode */}
      <SpotlightTour
        spotlights={spotlights}
        isActive={demoMode}
        onEnd={toggleDemoMode}
      />
    </div>
  )
}
