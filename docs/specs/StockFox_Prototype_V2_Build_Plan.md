# Plan: Migrate 11-Segment Scoring to Quant + Qual + Risk Architecture (V2)

## Context

StockFox currently uses a **flat 11-segment scoring model** (V1) where `overallScore = Σ(segment.score × weight)` on a 0-10 scale. The v3/v4 architecture documents introduce a **4-layer hierarchy** with three independent verdict pillars — Quant, Qual, Risk. This is accompanied by a comprehensive Qual Layer 4 spec (5 factors fully built with signal-level detail) and a 48-type News & Events classification.

**V2 replaces V1 entirely.** V1 code is copied and edited in-place — no toggle, no parallel architecture. V1 is revoked from deployment; V2 becomes the sole default on Vercel.

**All scores are 0-100 in V2** (both Quant and Qual), with label bands: STRONG (80-100) / GOOD (60-79) / MIXED (40-59) / WEAK (0-39).

**Overall Score is independent** of Quant + Qual + Risk pillar scores. It retains V1-style weighted computation (0-100 scale) with verdict labels: **Strong Buy / Buy / Hold / Sell**. The pillar scores are informational breakdowns, not inputs to the overall.

**Real APIs in V2.** The architecture is designed to wire in actual stock market APIs. Phase 1-3 build on mock data for UI testing; Phase 4 integrates live APIs. Stock search will be functional, pulling from the API. Wherever data is unavailable, alternatives will be defined after mock UI testing.

---

## Segment Mapping: Old → New

| Old Segment (11) | New Home | Notes |
|---|---|---|
| `profitability` | **Quant > Profitability** | ROCE emphasis added |
| `financial_ratios` | **Quant > Financial Health** | Merged |
| `growth` | **Quant > Growth** | Expanded: TAM runway, quarterly growth |
| `valuation` | **Quant > Valuation** | Same + DCF intrinsic value |
| `price_volume` | **Quant > Performance** | CONTEXT only (unscored) |
| `technical` | **Quant > Technical Indicators** | Long-term subset only |
| `broker_ratings` | **Quant > Institutional/Market Signals** | CONTEXT only + FII/DII + MF |
| `ownership` | **Split:** FII/DII → Institutional Signals; Promoter → Qual MG | |
| `stock_deals` (F&O) | **DROPPED** | Not relevant for long-term investors |
| `income_statement` | **Quant > Financial Health** | Merged |
| `balance_sheet` | **Quant > Financial Health** | Merged |

---

## Phase 1: Type System & Scoring Engine

### 1.1 New Types — `src/types/index.ts`

```typescript
// === V2 LAYER HIERARCHY — All scores 0-100 ===

type VerdictPillar = 'quant' | 'qual' | 'risk';
type SegmentScoringType = 'scored' | 'context';
type ScoreBandV2 = 'strong' | 'good' | 'mixed' | 'weak' | 'suppressed';
type EscalationTier = 'hard' | 'soft' | 'score_only';

// Layer 2: Three independent verdicts
interface PillarVerdict {
  pillar: VerdictPillar;
  name: string;
  score: number;                   // 0-100
  scoreBand: ScoreBandV2;
  label: string;                   // "STRONG" / "GOOD" / "MIXED" / "WEAK"
  summary: string;
  summaryByProfile?: Record<string, string>;
  segments: SegmentVerdictV2[];    // Layer 3 children (quant segments or qual factors)
}

// Layer 3: Individual segment/factor verdicts
interface SegmentVerdictV2 {
  id: string;
  name: string;
  pillar: VerdictPillar;
  scoringType: SegmentScoringType;
  score?: number;                  // 0-100, undefined for context segments
  scoreBand?: ScoreBandV2;
  label?: string;                  // Per-factor label (MG uses TRUSTED/ADEQUATE)
  weight?: number;                 // only for scored segments
  status: 'positive' | 'neutral' | 'negative';
  interpretation: string;
  quickInsight?: string;
  summaryByProfile?: Record<string, string>;
  scoreJustification?: string;
  confidenceIndicator?: ConfidenceIndicator;
  // Layer 4 drill-down
  signalGroups?: SignalGroup[];    // Qual: Group A, B, C, D
  subClassifications?: SubClassification[]; // Quant: Income Statement, Balance Sheet, etc.
  metrics?: Metric[];
  // Escalation
  redFlags?: RedFlagV2[];
  convictionSignals?: string[];
  isSuppressed?: boolean;         // Hard override fired
  suppressionReason?: string;
}

// Qual Factor Signal Architecture
interface SignalGroup {
  id: string;                      // 'group_a', 'group_b', etc.
  name: string;                    // "Promoter Alignment", "Governance Structure"
  role: 'anchor' | 'scored' | 'red_flag_only' | 'narrative_only' | 'contextualiser';
  weight?: number;                 // Within non-anchor composite
  score?: number;                  // 0-100
  signals: QualSignal[];
}

interface QualSignal {
  id: string;                      // 'A1', 'A2', etc.
  name: string;                    // User-facing name: "Promoter Skin in the Game"
  group: string;
  escalationTier: EscalationTier;
  score?: number;                  // 0-100, undefined for hard triggers/contextualisers
  state: 'strong' | 'monitor' | 'flag' | 'suppressed' | 'not_applicable';
  userText: string;                // Plain English 3-state text for current state
  isTriggered?: boolean;           // For soft/hard escalations
  version: 'v1' | 'v2';           // Signal availability
}

interface RedFlagV2 {
  signalId: string;
  severity: 'hard' | 'soft';
  title: string;
  description: string;             // Plain English
  source: string;                  // "MG-A1", "EQ-C3", etc.
}

interface ConfidenceIndicator {
  signalsComputed: number;
  signalsTotal: number;
  dataRange?: string;              // "FY20–FY24"
  state: 'full' | 'partial' | 'limited_history' | 'suppressed' | 'cmots_gap';
  tooltip: string;
}

// News & Events (separate from scored factors)
interface NewsEvent {
  id: string;
  type: string;                    // 48-type taxonomy
  bucket: NewsBucket;
  title: string;
  source: string;
  date: string;
  severity: 'positive' | 'neutral' | 'watch' | 'flag' | 'hard_stop';
  investorMeaning: string;
  impactPillars: VerdictPillar[];  // Which pillars this event affects
}

type NewsBucket =
  | 'financial_performance'
  | 'corporate_actions'
  | 'governance_ownership'
  | 'strategic_business'
  | 'external_macro'
  | 'market_signals'
  | 'sentiment_third_party'
  | 'documents_reference';

// Overall Verdict — INDEPENDENT of pillar scores
type OverallVerdictLabel = 'strong_buy' | 'buy' | 'hold' | 'sell';

interface StockVerdictV2 {
  // Layer 1: Overall (independent computation, not derived from pillars)
  overallVerdict: OverallVerdictLabel;
  overallScore: number;            // 0-100, independent weighted computation
  overallLabel: string;            // "Strong Buy" / "Buy" / "Hold" / "Sell"
  overallSummary: string;          // 1-line verdict summary
  // Layer 2: Pillar breakdowns (informational, not inputs to overall)
  pillars: PillarVerdict[];        // [quant, qual, risk]
  newsEvents: NewsEvent[];         // Separate section, replaces old "Recent News"
  ticker: string;
  stockName: string;
  sector: string;
  lastUpdated: string;
}
```

### 1.2 Qual Factor Scoring Engine — `src/lib/qualScoringEngine.ts` (NEW)

Reusable engine implementing the **hybrid anchor-group pattern** used by all 5 scored factors:

```typescript
// Core algorithm (same for all factors):
// 1. Score each signal 0-100
// 2. Compute group averages (equal weight within group, inapplicable excluded)
// 3. Anchor group sets ceiling/floor band
// 4. Final = (Anchor × 0.50) + (Non-anchor composite × 0.50), clamped to band
// 5. Hard overrides suppress score entirely → Red Flag replaces display
// 6. Suppression if anchor group has insufficient signals

interface FactorConfig {
  factorId: string;
  anchorGroup: string;                    // Which group anchors (A for most, C for CD)
  bands: { groupScore: [number, number]; ceiling: number; floor: number }[];
  nonAnchorWeights: Record<string, number>; // e.g., { B: 0.50, C: 0.50 }
  minAnchorSignals: number;               // Below this → suppress
  hardOverrides: string[];                // Signal IDs that suppress on trigger
  labels: Record<string, string>;         // Score band → label (MG: TRUSTED vs STRONG)
}

// Factor configs (from Qual Layer 4 spec):
const FACTOR_CONFIGS: Record<string, FactorConfig> = {
  management_governance: {
    factorId: 'management_governance',
    anchorGroup: 'A',   // Promoter Alignment
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 30 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 15 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { B: 0.50, C: 0.50 }, // Equal weight
    minAnchorSignals: 2,  // of 5
    hardOverrides: ['A1_pledge_50', 'B1_auditor', 'B3_sebi', 'fraud'],
    labels: { strong: 'TRUSTED', good: 'ADEQUATE', mixed: 'MIXED', weak: 'WEAK' },
  },
  business_quality: {
    factorId: 'business_quality',
    anchorGroup: 'A',   // Margin & Return Durability
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 35 },
      { groupScore: [40, 69],  ceiling: 72,  floor: 18 },
      { groupScore: [0, 39],   ceiling: 48,  floor: 0 },
    ],
    nonAnchorWeights: { CD: 1.0 }, // C+D combined, B excluded from score
    minAnchorSignals: 3,  // of 5, with sub-cluster constraint
    hardOverrides: [],     // No hard overrides in BQ
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },
  capital_discipline: {
    factorId: 'capital_discipline',
    anchorGroup: 'C',   // Capital Returns — ONLY factor where C anchors
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 40 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 20 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { A: 0.30, B: 0.45, D: 0.25 }, // NOT equal — only factor
    minAnchorSignals: 2,  // of 4
    hardOverrides: ['promoter_pledge_50'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },
  earnings_quality: {
    factorId: 'earnings_quality',
    anchorGroup: 'A',   // Cash Conversion
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 40 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 20 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { B: 0.60, D: 0.40 },
    minAnchorSignals: 2,  // of 3
    hardOverrides: ['C3_auditor_opinion', 'C2_accounting_policy'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },
  execution_quality: {
    factorId: 'execution_quality',
    anchorGroup: 'A',   // Financial Delivery
    bands: [
      { groupScore: [70, 100], ceiling: 100, floor: 40 },
      { groupScore: [40, 69],  ceiling: 75,  floor: 20 },
      { groupScore: [0, 39],   ceiling: 50,  floor: 0 },
    ],
    nonAnchorWeights: { B: 1.0 }, // Group C is v2 NLP, excluded at launch
    minAnchorSignals: 2,  // of 4
    hardOverrides: ['X1_no_guidance'],
    labels: { strong: 'STRONG', good: 'GOOD', mixed: 'MIXED', weak: 'WEAK' },
  },
};
```

### 1.3 Qual Factor Signal Inventory (Layer 4)

Full signal counts from the spec — this is the data that needs mock values:

| Factor | Group A | Group B | Group C | Group D | Other | Total |
|--------|---------|---------|---------|---------|-------|-------|
| **MG** | 5 (Promoter Alignment) | 6 (Governance Structure) | 3 scored + 1 contextualiser (Mgmt Capability) | 1 narrative-only (Trajectory) | — | 15 |
| **BQ** | 5 (Margin & Return Durability) | 3 Red Flag only (Revenue Fragility) | 1 (Pricing Power Confirmation) | 1 (Earnings Backing) | — | 11 |
| **CD** | 4 (Dilution & Funding) | 6 (Capital Deployment Quality) | 4 (Capital Returns) | 1 (Acquisition Track Record) | 1 standalone Promoter Pledge | 15+1 |
| **EQ** | 3 (Cash Conversion) | 5 (Balance Sheet Quality) | 3 hard overrides (Reporting Integrity) | 3 (Pattern Anomalies) | — | 14 |
| **ExQ** | 4 (Financial Delivery) | 2 sector-conditional (Operational Delivery) | 3 v2/NLP (Communication Quality) | — | X1 no-guidance flag | 10 |
| **Total** | | | | | | **65 signals** |

### 1.4 Quant Segment Definitions — 7 segments (0-100 scale)

| # | ID | Name | Type | V1 Source |
|---|---|---|---|---|
| 1 | `profitability` | Profitability | scored | profitability |
| 2 | `growth` | Growth | scored | growth |
| 3 | `valuation` | Valuation | scored | valuation |
| 4 | `financial_health` | Financial Health | scored | financial_ratios + income_statement + balance_sheet |
| 5 | `technical` | Technical Indicators | scored | technical |
| 6 | `performance` | Performance | **context** | price_volume |
| 7 | `institutional_signals` | Institutional / Market Signals | **context** | broker_ratings + ownership (FII/DII) |

### 1.5 News & Events — 48-type taxonomy, 8 buckets

**Not scored.** Replaces the existing "Recent News" section on the scorecard with a richer event classification:

| Bucket | Event Count | Examples |
|--------|-------------|---------|
| Financial Performance | 8 | Results, Concall, Capex Impact, Earnings Revision, Dividend, Guidance Update, Credit Rating, Investor Presentation |
| Corporate Actions | 6 | Fund Raise, IPO Lock-in, Block/Bulk Deals, Bonus/Split/Rights, Buyback, Delisting |
| Governance & Ownership | ~6 | Promoter pledge, auditor change, SEBI action, board changes |
| Strategic & Business | ~6 | M&A, JVs, product launches, partnerships |
| External & Macro | ~6 | Policy changes, regulatory, sector events |
| Market Signals | ~4 | Index inclusion/exclusion, short interest |
| Sentiment & Third Party | ~4 | Broker upgrades/downgrades, media |
| Documents & Reference | ~4 | Annual reports, prospectus filings |

Each event has: severity (positive/neutral/watch/flag/hard_stop), investor meaning, measurement method, threshold trigger, and `impactPillars` linking to affected Quant/Qual segments.

### 1.6 Profile Weights — `src/data/profiles.ts`

```typescript
interface ProfileWeightsV2 {
  pillarWeights: { quant: number; qual: number; risk: number; };
  quantWeights: {
    profitability: number; growth: number; valuation: number;
    financial_health: number; technical: number;
  };
  qualWeights: {
    management_governance: number; business_quality: number;
    capital_discipline: number; earnings_quality: number;
    execution_quality: number;
    // news_events: not weighted — event feed, not scored
    // sector_intelligence: Coming Soon
  };
}
```

### 1.7 Score Band Utilities — `src/lib/scoring.ts`

Replace V1 bands (0-10) with V2 (0-100):

**Pillar/Segment/Factor bands:**
```
STRONG: 80-100  →  "GREAT" badge (green)
GOOD:   60-79   →  "GOOD" badge (teal)
MIXED:  40-59   →  "FAIR" badge (orange)
WEAK:   0-39    →  "WEAK" badge (red)
SUPPRESSED      →  Red Flag replaces score
```

**Overall Verdict bands (independent):**
```
STRONG BUY: 80-100  →  green
BUY:        60-79   →  teal
HOLD:       40-59   →  orange
SELL:       0-39    →  red
```

---

## Phase 2: Data Layer — Mock Verdicts

**Goal:** Create `StockVerdictV2` data for 3 stocks × 3 profiles = 9 verdicts.

### 2.1 Quant Data Migration

Reuse existing V1 metric data, re-bucket and rescale to 0-100:
- `financial_health`: merge metrics from old `financial_ratios` + `income_statement` + `balance_sheet` into sub-classifications (Income Statement, Balance Sheet, Cash Flow, Leverage & Liquidity, Efficiency, Sector-Specific)
- `performance`: old `price_volume` marked `scoringType: 'context'`
- `institutional_signals`: old `broker_ratings` + FII/DII from `ownership`
- Promoter holding metrics move to Qual > MG

### 2.2 Qual Data — New Mock Data

For each of the 5 scored factors, create mock signal-level data for 3 stocks × 3 profiles. Each signal needs:
- Score (0-100), state (strong/monitor/flag), user-facing text (3-state copy from spec)
- Group scores computed per aggregation formula
- Factor score computed via anchor-group hybrid pattern
- Escalation triggers evaluated (hard/soft)
- Confidence indicator computed

**Signal copy is production-ready** — the Qual Layer 4 spec provides full 3-state user-facing text for every signal in all 5 factors. This goes directly into mock data.

### 2.3 News & Events Data

Create mock news events for 3 demo stocks using the 48-type taxonomy. Each event classified by bucket, severity, and impact pillars. Replaces existing `src/data/news.ts` content for V2.

### 2.4 Files to create/modify

| File | Change |
|---|---|
| `src/types/index.ts` | Replace V1 types with V2 hierarchy |
| `src/data/verdicts.ts` | Replace V1 verdicts with V2 structures (mock data) |
| `src/data/qualSignals.ts` | **NEW** — Signal definitions, user-facing copy, configs |
| `src/data/news.ts` | Replace with 48-type taxonomy mock data |
| `src/data/metricDefinitions.ts` | Replace old segments with Quant + Qual definitions |
| `src/data/profiles.ts` | Replace V1 weights with V2 pillar/segment/factor weights |
| `src/lib/qualScoringEngine.ts` | **NEW** — Reusable anchor-group scoring engine |
| `src/lib/scoring.ts` | Replace 0-10 bands with 0-100 + overall verdict engine |

---

## Phase 3: UI — Scorecard Page Redesign

### 3.1 Layout

```
┌──────────────────────────────────────────┐
│          OVERALL VERDICT (Layer 1)        │
│   Score/100 · Strong Buy/Buy/Hold/Sell    │
│   Independent of pillars · 1-line summary │
└──────────────────────────────────────────┘

┌────────────┐ ┌────────────┐ ┌────────────┐
│   QUANT    │ │    QUAL    │ │    RISK    │
│  72/100    │ │  65/100    │ │  78/100    │
│  GOOD      │ │  GOOD      │ │  GOOD      │
│  7 segs →  │ │  6 factors →│ │  6 dims → │
└────────────┘ └────────────┘ └────────────┘

┌──────────────────────────────────────────┐
│     NEWS & EVENTS (replaces Recent News)  │
│  [Financial Results] [Concall] [Buyback]  │
│  Cards with severity badges               │
└──────────────────────────────────────────┘
```

### 3.2 Qual Factor Deep Dive — 3-layer progressive disclosure

From the spec, each factor tab shows:
- **Layer 1:** Score/100 + label band + Red Flag line (if any) + 1-line verdict
- **Layer 2:** Group cards (Promoter Alignment, Governance Structure, etc.) — default visible, expandable
- **Layer 3:** Individual signal cards (expanded on demand) — plain English, no raw numbers

### 3.3 Components

| Component | Action | File |
|---|---|---|
| `PillarCard` | **NEW** | `src/components/scoring/PillarCard.tsx` |
| `PillarDrillDown` | **NEW** | `src/components/scoring/PillarDrillDown.tsx` |
| `QualFactorTab` | **NEW** | `src/components/scoring/QualFactorTab.tsx` |
| `SignalGroupCard` | **NEW** | `src/components/scoring/SignalGroupCard.tsx` |
| `SignalCard` | **NEW** | `src/components/scoring/SignalCard.tsx` |
| `RedFlagBanner` | **NEW** | `src/components/scoring/RedFlagBanner.tsx` |
| `ConfidenceIndicator` | **NEW** | `src/components/scoring/ConfidenceIndicator.tsx` |
| `NewsEventCard` | **NEW** | `src/components/news/NewsEventCard.tsx` |
| `NewsEventSection` | **NEW** | `src/components/news/NewsEventSection.tsx` (replaces old news section) |
| `SegmentBar` | MODIFY | Add `scoringType: 'context'` support |
| `SegmentRadar` | MODIFY | 3-pillar or 5-scored-quant + 5-qual radar |
| `StockAnalysis.tsx` | MODIFY | 3-pillar layout + news section |
| `SegmentDeepDive.tsx` | MODIFY | Support new segment/factor IDs |

### 3.4 Navigation

```
StockAnalysis
├── PillarCard (Quant) → PillarDrillDown → SegmentDeepDive (Financial Health)
│                                        → SubClassifications (Cash Flow, Leverage...)
├── PillarCard (Qual)  → PillarDrillDown → QualFactorTab (Earnings Quality)
│                                        → SignalGroupCard (Cash Conversion)
│                                        → SignalCard (OCF/PAT ratio)
├── PillarCard (Risk)  → PillarDrillDown → RedFlagBanner (aggregated)
└── NewsEventSection   → NewsEventCard (per event, severity badge)
```

### 3.5 Other page updates

| Page/Component | Change |
|---|---|
| `Compare.tsx` | Compare pillar verdicts + factor scores |
| `GuidedAnalysisModal.tsx` | Reference new pillar/factor structure |
| `BlindSpotChart.tsx` | Track coverage across Quant + Qual |
| `Chat.tsx` | Update segment references |

---

## Phase 4: API Integration & Live Data

V2 replaces V1 as the sole deployment. No toggle — V1 is revoked from the UI.

### 4.1 Approach: Copy V1 → Edit in Place
- All V1 source files are the starting point — copy and modify directly
- Old V1 types, data structures, and components are overwritten with V2 equivalents
- No backward compatibility layer needed

### 4.2 Stock Market API Integration
- Wire in actual APIs for all stock data (financials, price, ownership, etc.)
- Stock search becomes functional — users can search and pull any stock from the API
- Service layer (`src/services/`) adapted for real API endpoints
- **Phase 1-3 use mock data for UI testing**; API swap happens in Phase 4
- Where data is unavailable from primary API, alternatives will be defined post-UI testing

### 4.3 Overall Score Engine
- **Independent of pillar scores** — retains V1-style weighted computation
- Scale: 0-100
- Verdict labels: **Strong Buy** (80-100) / **Buy** (60-79) / **Hold** (40-59) / **Sell** (0-39)
- Computation uses its own weight configuration (not pillar weights)
- Profile-aware: different profiles may weight inputs differently

### 4.4 Deployment
- V2 deployed as new default on Vercel
- V1 completely removed from production build
- No feature flag or version toggle in the store

---

## Files Summary

### New files
1. `src/lib/qualScoringEngine.ts` — Reusable anchor-group scoring engine
2. `src/data/qualSignals.ts` — Signal definitions + 3-state user copy
3. `src/components/scoring/PillarCard.tsx`
4. `src/components/scoring/PillarDrillDown.tsx`
5. `src/components/scoring/QualFactorTab.tsx`
6. `src/components/scoring/SignalGroupCard.tsx`
7. `src/components/scoring/SignalCard.tsx`
8. `src/components/scoring/RedFlagBanner.tsx`
9. `src/components/scoring/ConfidenceIndicator.tsx`
10. `src/components/news/NewsEventCard.tsx`
11. `src/components/news/NewsEventSection.tsx`

### Modified files (copy V1 → edit in place)
14. `src/types/index.ts` — Replace V1 types with V2 hierarchy
15. `src/data/metricDefinitions.ts` — Replace old segments with Quant segments + Qual factor/signal definitions
16. `src/data/profiles.ts` — Replace V1 weights with V2 pillar/segment/factor weights
17. `src/data/verdicts.ts` — Replace V1 verdicts with V2 structure (mock data, later API)
18. `src/data/news.ts` — Replace with 48-type taxonomy event data
19. `src/lib/scoring.ts` — Replace 0-10 bands with 0-100 bands + overall verdict engine
20. `src/pages/StockAnalysis.tsx` — 3-pillar layout + news section
21. `src/pages/SegmentDeepDive.tsx` — Support new segment/factor IDs
22. `src/components/charts/SegmentBar.tsx` — Context segment support
23. `src/components/charts/SegmentRadar.tsx` — Pillar-level radar
24. `src/pages/Compare.tsx` — Pillar comparison
25. `src/components/learning/GuidedAnalysisModal.tsx` — Reference updates
26. `src/components/learning/BlindSpotChart.tsx` — Pillar coverage
27. `src/pages/Chat.tsx` — Segment reference updates
28. `src/services/` — Adapt for real API integration (Phase 4)

---

## Verification

1. `npx tsc --noEmit` passes
2. `npm run dev` — no console errors
3. StockAnalysis page shows 3 pillar cards for all 3 demo stocks
4. Click Quant → 7 segments (5 scored at 0-100 + 2 context)
5. Click Qual → 6 factors (5 with signal groups + News & Events)
6. Qual factor drill-down → 3-layer progressive disclosure (score → groups → signals)
7. Red Flag banner appears when hard override fires (e.g., promoter pledge >50%)
8. Confidence indicator shows "Based on X of Y signals"
9. News & Events section shows categorized event cards with severity badges
10. Profile switch updates pillar weights and verdicts
11. Compare page shows pillar-level comparison
12. Overall Score displays independently with Strong Buy/Buy/Hold/Sell labels
13. No F&O/stock_deals segment anywhere in V2
14. No V1 code or toggle remains — V2 is the sole architecture
15. Stock search UI is functional (mock data initially, API later)

---

## Open Questions (Truly Unresolved)

| # | Question | V2 Default |
|---|---|---|
| OQ-4 | Risk Verdict in Overall Score or independent? | Independent for now |
| OQ-8 | Sector-specific metrics (banking NPA, NIM) | Deferred — uniform metrics |
| OQ-9 | Dynamic thresholds per sector | Deferred — uniform thresholds |
| Inter-factor weights | How 6 qual factors combine into Qual Score | Equal weight as v1 prior |
| Group C v2 signals | ExQ NLP pipeline (concall tone, narrative) | Excluded at launch, teaser line |

**V2 ships without OQ-8, OQ-9, and NLP signals.** Equal inter-factor weights until backtesting data is available.
