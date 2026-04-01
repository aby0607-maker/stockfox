/**
 * Qual Factor Signal Definitions
 *
 * All 65 signals across 5 factors with:
 * - Signal metadata (id, name, group, escalation tier)
 * - 3-state user-facing copy (strong/monitor/flag)
 * - Version availability (v1 = available at launch, v2 = NLP/future)
 *
 * These definitions are used to:
 * 1. Generate mock data for UI testing
 * 2. Render signal cards with plain English explanations
 * 3. Drive the scoring engine's escalation logic
 */

export interface QualSignalDefinition {
  id: string
  name: string
  factorId: string
  groupId: string
  groupName: string
  escalationTier: 'hard' | 'soft' | 'score_only'
  version: 'v1' | 'v2'
  userCopy: {
    strong: string
    monitor: string
    flag: string
  }
}

// ===== MANAGEMENT & GOVERNANCE (MG) — 15 signals =====

export const MG_SIGNALS: QualSignalDefinition[] = [
  // Group A: Promoter Alignment (Anchor)
  {
    id: 'A1', name: 'Promoter Skin in the Game', factorId: 'management_governance',
    groupId: 'A', groupName: 'Promoter Alignment',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'Promoters hold a significant stake, showing strong personal commitment to the company\'s success.',
      monitor: 'Promoter holding has declined recently — worth watching for further reductions.',
      flag: 'Promoter pledge exceeds 50% of holdings — a serious governance risk.',
    },
  },
  {
    id: 'A2', name: 'Holding Trend (3Y)', factorId: 'management_governance',
    groupId: 'A', groupName: 'Promoter Alignment',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Promoters have been consistently increasing their stake over 3 years.',
      monitor: 'Promoter holding has been stable with minor fluctuations.',
      flag: 'Promoters have been steadily reducing their stake — a potential warning sign.',
    },
  },
  {
    id: 'A3', name: 'Pledge Status', factorId: 'management_governance',
    groupId: 'A', groupName: 'Promoter Alignment',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Zero promoter shares pledged — clean ownership structure.',
      monitor: 'Some promoter shares are pledged, but within acceptable limits.',
      flag: 'High pledge levels increase the risk of forced selling during market downturns.',
    },
  },
  {
    id: 'A4', name: 'Insider Transactions', factorId: 'management_governance',
    groupId: 'A', groupName: 'Promoter Alignment',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Recent insider buying signals confidence from those who know the company best.',
      monitor: 'No significant insider transactions in recent quarters.',
      flag: 'Consistent insider selling may indicate concerns from those closest to the business.',
    },
  },
  {
    id: 'A5', name: 'Related Party Transactions', factorId: 'management_governance',
    groupId: 'A', groupName: 'Promoter Alignment',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Minimal related party transactions — clean separation between promoter and company interests.',
      monitor: 'Some related party transactions exist but are disclosed and at arm\'s length.',
      flag: 'Significant related party transactions raise concerns about potential value leakage.',
    },
  },

  // Group B: Governance Structure
  {
    id: 'B1', name: 'Auditor Quality & Tenure', factorId: 'management_governance',
    groupId: 'B', groupName: 'Governance Structure',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'Reputable auditor with appropriate tenure — strong independent oversight.',
      monitor: 'Auditor is adequate but not among the top tier. Watch for any sudden changes.',
      flag: 'Auditor change or qualification raises serious red flags about financial reporting.',
    },
  },
  {
    id: 'B2', name: 'Board Independence', factorId: 'management_governance',
    groupId: 'B', groupName: 'Governance Structure',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Strong independent board composition ensures management accountability.',
      monitor: 'Board independence meets minimum requirements but could be stronger.',
      flag: 'Weak board independence — promoter interests may override minority shareholders.',
    },
  },
  {
    id: 'B3', name: 'Regulatory Compliance', factorId: 'management_governance',
    groupId: 'B', groupName: 'Governance Structure',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'Clean regulatory track record — no SEBI actions or penalties.',
      monitor: 'Minor regulatory observations on record, but no material penalties.',
      flag: 'SEBI action or significant penalty — a critical governance failure.',
    },
  },
  {
    id: 'B4', name: 'Compensation Alignment', factorId: 'management_governance',
    groupId: 'B', groupName: 'Governance Structure',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Management compensation aligns well with shareholder returns.',
      monitor: 'Compensation structure is standard but not strongly performance-linked.',
      flag: 'Excessive compensation relative to company performance raises alignment concerns.',
    },
  },
  {
    id: 'B5', name: 'Disclosure Quality', factorId: 'management_governance',
    groupId: 'B', groupName: 'Governance Structure',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Excellent disclosure practices — transparent and timely reporting.',
      monitor: 'Adequate disclosures that meet regulatory requirements.',
      flag: 'Poor disclosure quality — important information may be obscured or delayed.',
    },
  },
  {
    id: 'B6', name: 'Whistleblower / Ethics', factorId: 'management_governance',
    groupId: 'B', groupName: 'Governance Structure',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Robust ethics framework and whistleblower mechanism in place.',
      monitor: 'Basic ethics policies exist but enforcement mechanisms are unclear.',
      flag: 'Weak or absent ethics framework — governance risk.',
    },
  },

  // Group C: Management Capability (3 scored + 1 contextualiser)
  {
    id: 'C1', name: 'Capital Allocation Track Record', factorId: 'management_governance',
    groupId: 'C', groupName: 'Management Capability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Proven track record of smart capital allocation decisions.',
      monitor: 'Capital allocation is adequate but lacks standout decisions.',
      flag: 'History of poor capital allocation — value destruction risk.',
    },
  },
  {
    id: 'C2', name: 'Execution vs Guidance', factorId: 'management_governance',
    groupId: 'C', groupName: 'Management Capability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Management consistently meets or exceeds their guidance — credible promises.',
      monitor: 'Mixed track record on guidance — some misses alongside some hits.',
      flag: 'Regular guidance misses suggest either poor planning or overpromising.',
    },
  },
  {
    id: 'C3', name: 'Strategic Clarity', factorId: 'management_governance',
    groupId: 'C', groupName: 'Management Capability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Clear, well-articulated strategic direction with visible execution roadmap.',
      monitor: 'Strategy is communicated but lacks specificity on execution milestones.',
      flag: 'Unclear or frequently changing strategy — raises execution risk.',
    },
  },
  {
    id: 'C4', name: 'Leadership Trajectory', factorId: 'management_governance',
    groupId: 'C', groupName: 'Management Capability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Stable, experienced leadership team with deep domain expertise.',
      monitor: 'Recent leadership changes — too early to assess impact.',
      flag: 'Frequent leadership turnover signals instability or deeper issues.',
    },
  },

  // Group D: Trajectory (narrative-only)
  // No signals here for v1 — this is context/commentary
]

// ===== BUSINESS QUALITY (BQ) — 11 signals =====

export const BQ_SIGNALS: QualSignalDefinition[] = [
  // Group A: Margin & Return Durability (Anchor)
  {
    id: 'A1', name: 'ROCE Consistency', factorId: 'business_quality',
    groupId: 'A', groupName: 'Margin & Return Durability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Consistently high returns on capital — the business earns well on every rupee invested.',
      monitor: 'Returns on capital are adequate but showing some variability.',
      flag: 'Declining returns on capital suggest the business model is weakening.',
    },
  },
  {
    id: 'A2', name: 'Operating Margin Stability', factorId: 'business_quality',
    groupId: 'A', groupName: 'Margin & Return Durability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Operating margins are stable and above sector average — durable pricing power.',
      monitor: 'Margins are acceptable but fluctuate with market conditions.',
      flag: 'Significant margin erosion — competitive pressure or cost issues.',
    },
  },
  {
    id: 'A3', name: 'Margin Expansion Trend', factorId: 'business_quality',
    groupId: 'A', groupName: 'Margin & Return Durability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Margins are expanding — the business is becoming more efficient over time.',
      monitor: 'Margins are stable — no deterioration but no improvement either.',
      flag: 'Sustained margin compression signals structural challenges.',
    },
  },
  {
    id: 'A4', name: 'Revenue Quality', factorId: 'business_quality',
    groupId: 'A', groupName: 'Margin & Return Durability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'High proportion of recurring or predictable revenue — business stability.',
      monitor: 'Revenue mix includes some volatile or one-time components.',
      flag: 'Revenue is highly unpredictable or dependent on few clients/projects.',
    },
  },
  {
    id: 'A5', name: 'Return vs Cost of Capital', factorId: 'business_quality',
    groupId: 'A', groupName: 'Margin & Return Durability',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Returns significantly exceed cost of capital — genuine value creation.',
      monitor: 'Returns roughly match cost of capital — breakeven value creation.',
      flag: 'Returns below cost of capital — the business is destroying value.',
    },
  },

  // Group B: Revenue Fragility (Red Flag only — not scored)
  {
    id: 'B1', name: 'Customer Concentration', factorId: 'business_quality',
    groupId: 'B', groupName: 'Revenue Fragility',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Well-diversified customer base — no single client dominates revenue.',
      monitor: 'Top clients represent a meaningful share but within manageable limits.',
      flag: 'Heavy dependence on few clients — losing one could materially impact results.',
    },
  },
  {
    id: 'B2', name: 'Geographic Concentration', factorId: 'business_quality',
    groupId: 'B', groupName: 'Revenue Fragility',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Revenue from diverse geographies — reduces regional risk.',
      monitor: 'Moderate geographic diversification.',
      flag: 'Revenue heavily concentrated in one geography — regulatory or macro risk.',
    },
  },
  {
    id: 'B3', name: 'Product/Service Concentration', factorId: 'business_quality',
    groupId: 'B', groupName: 'Revenue Fragility',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Diversified product/service portfolio — resilient to single-product risk.',
      monitor: 'Some product concentration but with adjacent growth opportunities.',
      flag: 'Single product/service dependency — high vulnerability to disruption.',
    },
  },

  // Group C: Pricing Power Confirmation
  {
    id: 'C1', name: 'Pricing Power Evidence', factorId: 'business_quality',
    groupId: 'C', groupName: 'Pricing Power Confirmation',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Demonstrated ability to raise prices without losing customers — strong brand/moat.',
      monitor: 'Some pricing power but constrained by competition or regulation.',
      flag: 'No pricing power — commodity business where price is set by the market.',
    },
  },

  // Group D: Earnings Backing
  {
    id: 'D1', name: 'Cash Backing of Earnings', factorId: 'business_quality',
    groupId: 'D', groupName: 'Earnings Backing',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Reported earnings are well-backed by actual cash flows — trustworthy numbers.',
      monitor: 'Some gap between reported earnings and cash flows — needs monitoring.',
      flag: 'Large gap between reported profits and cash flows — earnings quality concern.',
    },
  },

  // Accrual ratio signal (shared with EQ)
  {
    id: 'D2', name: 'Accrual Ratio', factorId: 'business_quality',
    groupId: 'D', groupName: 'Earnings Backing',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Low accrual ratio — earnings are largely cash-based, not accounting-driven.',
      monitor: 'Moderate accrual ratio — some portion of earnings is non-cash.',
      flag: 'High accrual ratio — a significant portion of earnings exists only on paper.',
    },
  },
]

// ===== CAPITAL DISCIPLINE (CD) — 16 signals =====

export const CD_SIGNALS: QualSignalDefinition[] = [
  // Group A: Dilution & Funding
  {
    id: 'A1', name: 'Equity Dilution History', factorId: 'capital_discipline',
    groupId: 'A', groupName: 'Dilution & Funding',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Minimal equity dilution — management respects existing shareholders.',
      monitor: 'Some equity raises but justified by growth needs.',
      flag: 'Frequent equity dilution erodes your ownership — a discipline red flag.',
    },
  },
  {
    id: 'A2', name: 'Debt Management', factorId: 'capital_discipline',
    groupId: 'A', groupName: 'Dilution & Funding',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Conservative debt levels with comfortable interest coverage.',
      monitor: 'Debt is manageable but requires attention during downturns.',
      flag: 'High debt levels strain the company — interest payments eat into profits.',
    },
  },
  {
    id: 'A3', name: 'Funding Mix', factorId: 'capital_discipline',
    groupId: 'A', groupName: 'Dilution & Funding',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Healthy mix of internal accruals and selective debt — balanced funding.',
      monitor: 'Relies somewhat on external funding for growth.',
      flag: 'Heavy external funding dependence — growth may not be self-sustaining.',
    },
  },
  {
    id: 'A4', name: 'Working Capital Efficiency', factorId: 'capital_discipline',
    groupId: 'A', groupName: 'Dilution & Funding',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Efficient working capital management — cash is not tied up unnecessarily.',
      monitor: 'Working capital management is adequate but has room for improvement.',
      flag: 'Poor working capital management — cash is locked up in inventory/receivables.',
    },
  },

  // Group B: Capital Deployment Quality
  {
    id: 'B1', name: 'Capex ROI', factorId: 'capital_discipline',
    groupId: 'B', groupName: 'Capital Deployment Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Capital expenditure consistently generates strong returns — smart investments.',
      monitor: 'Capex returns are adequate but below best-in-class.',
      flag: 'Capital expenditure yields poor returns — money spent without proportional growth.',
    },
  },
  {
    id: 'B2', name: 'R&D Effectiveness', factorId: 'capital_discipline',
    groupId: 'B', groupName: 'Capital Deployment Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'R&D spending translates into revenue growth and competitive advantage.',
      monitor: 'R&D investment exists but impact is not yet visible.',
      flag: 'High R&D spend with little commercial output — potential value waste.',
    },
  },
  {
    id: 'B3', name: 'Growth vs Maintenance Capex', factorId: 'capital_discipline',
    groupId: 'B', groupName: 'Capital Deployment Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Most capex goes toward growth — the company is investing in its future.',
      monitor: 'Balanced between growth and maintenance spending.',
      flag: 'Most capex goes to maintenance — the business needs constant reinvestment just to stay alive.',
    },
  },
  {
    id: 'B4', name: 'Investment Timing', factorId: 'capital_discipline',
    groupId: 'B', groupName: 'Capital Deployment Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Management invests counter-cyclically — buying low and scaling wisely.',
      monitor: 'Investment timing is generally acceptable.',
      flag: 'Tendency to invest at peak — overpaying for growth assets.',
    },
  },
  {
    id: 'B5', name: 'Subsidiary Health', factorId: 'capital_discipline',
    groupId: 'B', groupName: 'Capital Deployment Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Subsidiaries are healthy and value-accretive — well-managed empire.',
      monitor: 'Some subsidiaries are underperforming but not a material drag.',
      flag: 'Loss-making subsidiaries are draining parent company resources.',
    },
  },
  {
    id: 'B6', name: 'Capital Allocation Consistency', factorId: 'capital_discipline',
    groupId: 'B', groupName: 'Capital Deployment Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Consistent, predictable capital allocation strategy — you know what to expect.',
      monitor: 'Generally consistent but with occasional surprises.',
      flag: 'Erratic capital allocation — hard to predict where money will go next.',
    },
  },

  // Group C: Capital Returns (Anchor for CD)
  {
    id: 'C1', name: 'Dividend Track Record', factorId: 'capital_discipline',
    groupId: 'C', groupName: 'Capital Returns',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Consistent dividend payments with growth — shares profits with shareholders.',
      monitor: 'Dividends are paid but inconsistently or without clear growth trend.',
      flag: 'No meaningful dividend despite ability to pay — retention without clear purpose.',
    },
  },
  {
    id: 'C2', name: 'Buyback Discipline', factorId: 'capital_discipline',
    groupId: 'C', groupName: 'Capital Returns',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Smart buybacks at reasonable valuations — returns capital efficiently.',
      monitor: 'Occasional buybacks but timing or scale could be better.',
      flag: 'No capital return mechanism despite excess cash — or buybacks at high valuations.',
    },
  },
  {
    id: 'C3', name: 'Payout Sustainability', factorId: 'capital_discipline',
    groupId: 'C', groupName: 'Capital Returns',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Payouts are well-covered by free cash flow — sustainable distributions.',
      monitor: 'Payouts are covered but leave limited buffer for reinvestment.',
      flag: 'Payouts exceed free cash flow — unsustainable, may require borrowing.',
    },
  },
  {
    id: 'C4', name: 'Total Shareholder Return', factorId: 'capital_discipline',
    groupId: 'C', groupName: 'Capital Returns',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Strong total returns to shareholders (dividends + buybacks + appreciation).',
      monitor: 'Moderate total returns — in line with sector but not standout.',
      flag: 'Poor total shareholder returns despite adequate earnings — value not reaching investors.',
    },
  },

  // Group D: Acquisition Track Record
  {
    id: 'D1', name: 'M&A Track Record', factorId: 'capital_discipline',
    groupId: 'D', groupName: 'Acquisition Track Record',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'History of value-accretive acquisitions with successful integration.',
      monitor: 'Mixed M&A track record — some wins and some questionable deals.',
      flag: 'History of overpaying for acquisitions or failed integrations — capital destruction.',
    },
  },

  // Standalone: Promoter Pledge (shared with MG)
  {
    id: 'PP1', name: 'Promoter Pledge Impact', factorId: 'capital_discipline',
    groupId: 'standalone', groupName: 'Promoter Pledge',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'No promoter pledge — clean capital structure.',
      monitor: 'Some pledge exists but within manageable limits.',
      flag: 'Promoter pledge above 50% — forced selling risk during market stress.',
    },
  },
]

// ===== EARNINGS QUALITY (EQ) — 14 signals =====

export const EQ_SIGNALS: QualSignalDefinition[] = [
  // Group A: Cash Conversion (Anchor)
  {
    id: 'A1', name: 'OCF to PAT Ratio', factorId: 'earnings_quality',
    groupId: 'A', groupName: 'Cash Conversion',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Operating cash flow comfortably exceeds reported profit — earnings are real.',
      monitor: 'Cash flow roughly matches profit — adequate but watch for deterioration.',
      flag: 'Profits significantly exceed cash flow — a classic earnings quality warning.',
    },
  },
  {
    id: 'A2', name: 'FCF Yield', factorId: 'earnings_quality',
    groupId: 'A', groupName: 'Cash Conversion',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Strong free cash flow yield — the business generates real investable cash.',
      monitor: 'Moderate free cash flow yield — reinvestment needs absorb much of the cash.',
      flag: 'Negligible or negative free cash flow — the business consumes more than it generates.',
    },
  },
  {
    id: 'A3', name: 'Cash Conversion Cycle', factorId: 'earnings_quality',
    groupId: 'A', groupName: 'Cash Conversion',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Short cash conversion cycle — money comes in fast after sales.',
      monitor: 'Average cash conversion cycle — in line with industry norms.',
      flag: 'Long cash conversion cycle — cash tied up for extended periods.',
    },
  },

  // Group B: Balance Sheet Quality
  {
    id: 'B1', name: 'Receivables Quality', factorId: 'earnings_quality',
    groupId: 'B', groupName: 'Balance Sheet Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Receivables are healthy relative to revenue — customers pay on time.',
      monitor: 'Receivables growing slightly faster than revenue — watch this trend.',
      flag: 'Receivables growing much faster than revenue — potential bad debt risk.',
    },
  },
  {
    id: 'B2', name: 'Inventory Health', factorId: 'earnings_quality',
    groupId: 'B', groupName: 'Balance Sheet Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Lean inventory management — no sign of channel stuffing or obsolescence.',
      monitor: 'Inventory levels are manageable but slightly elevated.',
      flag: 'Inventory build-up without matching revenue growth — potential write-down risk.',
    },
  },
  {
    id: 'B3', name: 'Contingent Liabilities', factorId: 'earnings_quality',
    groupId: 'B', groupName: 'Balance Sheet Quality',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Minimal contingent liabilities — clean balance sheet.',
      monitor: 'Some contingent liabilities exist but are disclosed and manageable.',
      flag: 'Large contingent liabilities could materialize into real losses.',
    },
  },
  {
    id: 'B4', name: 'Goodwill & Intangibles', factorId: 'earnings_quality',
    groupId: 'B', groupName: 'Balance Sheet Quality',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Low goodwill/intangibles relative to assets — tangible, real value.',
      monitor: 'Moderate intangible assets from acquisitions — watch for impairment.',
      flag: 'Heavy goodwill/intangibles — potential impairment risk if businesses underperform.',
    },
  },
  {
    id: 'B5', name: 'Off-Balance Sheet Items', factorId: 'earnings_quality',
    groupId: 'B', groupName: 'Balance Sheet Quality',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'Minimal off-balance sheet items — what you see is what you get.',
      monitor: 'Some off-balance sheet items exist — leases, guarantees, or SPVs.',
      flag: 'Significant off-balance sheet exposure — hidden risk that could surface.',
    },
  },

  // Group C: Reporting Integrity (hard overrides)
  {
    id: 'C1', name: 'Restatement History', factorId: 'earnings_quality',
    groupId: 'C', groupName: 'Reporting Integrity',
    escalationTier: 'soft', version: 'v1',
    userCopy: {
      strong: 'No financial restatements — consistent, reliable reporting.',
      monitor: 'Minor restatement in the past, but no pattern.',
      flag: 'Financial restatement signals unreliable initial reporting.',
    },
  },
  {
    id: 'C2', name: 'Accounting Policy Changes', factorId: 'earnings_quality',
    groupId: 'C', groupName: 'Reporting Integrity',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'Stable accounting policies — no changes to flatter results.',
      monitor: 'Minor policy changes but well-disclosed with valid reasons.',
      flag: 'Accounting policy changes that boost reported numbers — manipulation risk.',
    },
  },
  {
    id: 'C3', name: 'Auditor Opinion', factorId: 'earnings_quality',
    groupId: 'C', groupName: 'Reporting Integrity',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'Clean auditor opinion with no qualifications.',
      monitor: 'Emphasis of matter but no qualification.',
      flag: 'Qualified or adverse audit opinion — serious credibility concern.',
    },
  },

  // Group D: Pattern Anomalies
  {
    id: 'D1', name: 'Revenue Recognition Patterns', factorId: 'earnings_quality',
    groupId: 'D', groupName: 'Pattern Anomalies',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Revenue recognition follows a natural, predictable pattern.',
      monitor: 'Some lumpiness in revenue recognition but explainable by business nature.',
      flag: 'Unusual revenue recognition patterns — potential front-loading or channel stuffing.',
    },
  },
  {
    id: 'D2', name: 'Expense Timing', factorId: 'earnings_quality',
    groupId: 'D', groupName: 'Pattern Anomalies',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Expenses recognized consistently — no signs of deferral or acceleration.',
      monitor: 'Some timing variation in expenses but within normal bounds.',
      flag: 'Suspect expense timing — potential earnings manipulation through deferrals.',
    },
  },
  {
    id: 'D3', name: 'Tax Rate Anomalies', factorId: 'earnings_quality',
    groupId: 'D', groupName: 'Pattern Anomalies',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Effective tax rate is stable and close to statutory rate.',
      monitor: 'Some tax rate variation but largely due to legitimate incentives.',
      flag: 'Unusually low or volatile tax rate — may be unsustainable or indicate aggressive planning.',
    },
  },
]

// ===== EXECUTION QUALITY (ExQ) — 10 signals =====

export const EXQ_SIGNALS: QualSignalDefinition[] = [
  // Group A: Financial Delivery (Anchor)
  {
    id: 'A1', name: 'Revenue Growth vs Guidance', factorId: 'execution_quality',
    groupId: 'A', groupName: 'Financial Delivery',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Consistently delivers or exceeds guided revenue targets.',
      monitor: 'Mostly meets revenue guidance with occasional shortfalls.',
      flag: 'Regularly misses revenue guidance — promises more than it delivers.',
    },
  },
  {
    id: 'A2', name: 'Margin Delivery vs Guidance', factorId: 'execution_quality',
    groupId: 'A', groupName: 'Financial Delivery',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Consistently hits margin targets — execution matches planning.',
      monitor: 'Margin delivery is close to guidance but with some volatility.',
      flag: 'Significant margin misses relative to guidance — execution gaps.',
    },
  },
  {
    id: 'A3', name: 'Earnings Surprise Pattern', factorId: 'execution_quality',
    groupId: 'A', groupName: 'Financial Delivery',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Positive earnings surprises outnumber misses — management under-promises and over-delivers.',
      monitor: 'Earnings roughly in line with expectations most quarters.',
      flag: 'Frequent negative earnings surprises — market consistently overestimates performance.',
    },
  },
  {
    id: 'A4', name: 'Quarterly Consistency', factorId: 'execution_quality',
    groupId: 'A', groupName: 'Financial Delivery',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Smooth quarter-to-quarter performance — predictable business execution.',
      monitor: 'Some quarterly variability but within expected range for the sector.',
      flag: 'Highly volatile quarterly results — difficult to assess underlying performance.',
    },
  },

  // Group B: Operational Delivery (sector-conditional)
  {
    id: 'B1', name: 'Operational KPI Achievement', factorId: 'execution_quality',
    groupId: 'B', groupName: 'Operational Delivery',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Key operational metrics consistently meet or exceed targets.',
      monitor: 'Operational KPIs show mixed results across different dimensions.',
      flag: 'Material operational KPI misses — execution gaps are systemic.',
    },
  },
  {
    id: 'B2', name: 'Market Share Trajectory', factorId: 'execution_quality',
    groupId: 'B', groupName: 'Operational Delivery',
    escalationTier: 'score_only', version: 'v1',
    userCopy: {
      strong: 'Gaining market share — executing better than competitors.',
      monitor: 'Market share is stable — maintaining position but not gaining.',
      flag: 'Losing market share — competitors are executing better.',
    },
  },

  // Group C: Communication Quality (v2/NLP — excluded at launch)
  {
    id: 'C1', name: 'Concall Tone Consistency', factorId: 'execution_quality',
    groupId: 'C', groupName: 'Communication Quality',
    escalationTier: 'score_only', version: 'v2',
    userCopy: {
      strong: 'Management communication is consistent and transparent across quarters.',
      monitor: 'Communication style varies — some quarters more transparent than others.',
      flag: 'Tone shifts between earnings calls may indicate undisclosed concerns.',
    },
  },
  {
    id: 'C2', name: 'Forward Guidance Clarity', factorId: 'execution_quality',
    groupId: 'C', groupName: 'Communication Quality',
    escalationTier: 'score_only', version: 'v2',
    userCopy: {
      strong: 'Clear, specific forward guidance with measurable targets.',
      monitor: 'Guidance provided but lacks specificity or measurability.',
      flag: 'Vague or absent guidance — management avoiding commitment.',
    },
  },
  {
    id: 'C3', name: 'Narrative vs Numbers Alignment', factorId: 'execution_quality',
    groupId: 'C', groupName: 'Communication Quality',
    escalationTier: 'score_only', version: 'v2',
    userCopy: {
      strong: 'Management narrative aligns with financial data — what they say matches what they deliver.',
      monitor: 'Some disconnect between narrative and numbers — optimism bias.',
      flag: 'Significant gap between management narrative and actual results — credibility risk.',
    },
  },

  // Standalone: No-guidance flag
  {
    id: 'X1', name: 'No Guidance Available', factorId: 'execution_quality',
    groupId: 'standalone', groupName: 'Guidance Availability',
    escalationTier: 'hard', version: 'v1',
    userCopy: {
      strong: 'Company provides regular forward guidance — transparent about expectations.',
      monitor: 'Limited guidance provided — typical for some sectors/company sizes.',
      flag: 'No forward guidance provided — impossible to assess execution against promises.',
    },
  },
]

// ===== AGGREGATED EXPORTS =====

export const ALL_QUAL_SIGNALS: Record<string, QualSignalDefinition[]> = {
  management_governance: MG_SIGNALS,
  business_quality: BQ_SIGNALS,
  capital_discipline: CD_SIGNALS,
  earnings_quality: EQ_SIGNALS,
  execution_quality: EXQ_SIGNALS,
}

/**
 * Get total signal count per factor
 */
export function getSignalCounts(): Record<string, { v1: number; v2: number; total: number }> {
  const counts: Record<string, { v1: number; v2: number; total: number }> = {}
  for (const [factorId, signals] of Object.entries(ALL_QUAL_SIGNALS)) {
    const v1 = signals.filter(s => s.version === 'v1').length
    const v2 = signals.filter(s => s.version === 'v2').length
    counts[factorId] = { v1, v2, total: v1 + v2 }
  }
  return counts
}

/**
 * Get all signals for a factor grouped by group ID
 */
export function getSignalsByGroup(factorId: string): Record<string, QualSignalDefinition[]> {
  const signals = ALL_QUAL_SIGNALS[factorId] || []
  const grouped: Record<string, QualSignalDefinition[]> = {}
  for (const signal of signals) {
    if (!grouped[signal.groupId]) {
      grouped[signal.groupId] = []
    }
    grouped[signal.groupId].push(signal)
  }
  return grouped
}
