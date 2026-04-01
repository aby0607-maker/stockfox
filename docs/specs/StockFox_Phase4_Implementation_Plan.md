# Plan: Phase 4 — API Integration & Live Data

## Context

Phases 1-3 built the V2 scoring architecture (Quant + Qual + Risk pillars, 65 signals, tooltips, standardized UI) entirely on **mock data**. Phase 4 replaces mock data with real stock market APIs so any stock can be analyzed — not just the 3 demo stocks.

**Starting point**: The `backtesting` branch already has **3 production-grade API integrations** — all following the same pattern (retry 3x, 20s timeout, in-memory TTL cache, transient-only retries). We port all three to `main`:

1. **CMOTS** (primary) — Company master, TTM, FinData, P&L, Cash Flow, Balance Sheet, Quarterly, OHLCV, Shareholding. Bearer token auth. Vercel proxy.
2. **DhanHQ** (price fallback) — Historical OHLCV when CMOTS returns empty. POST-based, `access-token` header auth.
3. **IndianAPI.in** (fundamentals fallback) — 12-year annual data. GET with `X-Api-Key` header. Converts responses to `CMOTSStatementRow[]` format so `metricResolver` works unchanged. Has `mergeFundamentals()` to combine CMOTS accuracy + IndianAPI depth.

**Current state of `main`**: All data is hardcoded in `src/data/*.ts`. Services layer exists but wraps static arrays — zero HTTP calls. Pages import directly from `@/data`. V1 code paths (0-10 scale) are still active in Dashboard, StockAnalysis (dual V1+V2), SegmentDeepDive (dual paths).

---

## Sub-Phase Breakdown

### Phase 4A: Port All API Infrastructure

**Goal**: Get all 3 API clients, proxies, and types onto `main`. Zero UI changes.

**Create** (port from `backtesting` branch):

**CMOTS (primary data source)**:
- `src/services/cmots/client.ts` — HTTP client (retry 3x, 20s timeout, TTL cache, response normalization)
- `src/services/cmots/companyMaster.ts` — BSE universe (15K+ stocks), symbol → co_code resolution
- `src/services/cmots/fundamentals.ts` — TTM, FinData, P&L, Cash Flow, Balance Sheet, Quarterly (parallel fetch)
- `src/services/cmots/priceData.ts` — Historical OHLCV, delayed price feed
- `src/services/cmots/shareholding.ts` — Promoter/FII/DII ownership
- `src/services/cmots/index.ts` — Barrel export
- `api/cmots/[...path].ts` — Vercel serverless proxy (token injection, endpoint whitelist)

**DhanHQ (price data fallback)**:
- `src/services/dhan/client.ts` — HTTP client (POST-based, `access-token` header auth, same retry/cache pattern)
- `src/services/dhan/index.ts` — Barrel export
- `api/dhan/[...path].ts` — Vercel serverless proxy (token injection)

**IndianAPI (fundamentals fallback)**:
- `src/services/indianapi/client.ts` — HTTP client (GET, `X-Api-Key` header auth, same retry/cache pattern)
- `src/services/indianapi/fundamentals.ts` — Full fundamentals fetch, **CMOTS-compatible `CMOTSStatementRow[]` conversion**, `mergeFundamentals()` function, symbol override map
- `src/services/indianapi/index.ts` — Barrel export
- `api/indianapi/[...path].ts` — Vercel serverless proxy (key injection)

**Config**:
- `.env.example` — `CMOTS_API_TOKEN=`, `DHAN_ACCESS_TOKEN=`, `INDIANAPI_KEY=`

**Modify**:
- `src/types/index.ts` — Add API types: `CMOTSCompany`, `CMOTSTTMRecord`, `CMOTSFinancialRecord`, `CMOTSStatementRow`, `CMOTSOHLCVRecord`, `CMOTSShareholding`, `DhanOHLCVRecord`
- `vite.config.ts` — Add proxies: `/api/cmots` → CMOTS, `/api/dhan` → DhanHQ, `/api/indianapi` → IndianAPI
- `vercel.json` — Add rewrite rules for all 3 APIs before SPA fallback

**Verify**: `fetch('/api/cmots/companymaster')` returns 15K+ companies in dev mode.

**Dependencies**: None.

---

### Phase 4B: Stock Universe & Search

**Goal**: Replace 3-stock hardcode with live search across 15K+ BSE stocks.

**Create**:
- `src/components/ui/SearchDialog.tsx` — Debounced search input, calls CMOTS `searchCompanies()`, shows results with symbol/name/sector, navigates to `/stock/:symbol`

**Modify**:
- `src/services/stockService.ts` — Rewrite to async: `searchStocks(query)` calls CMOTS, `getStockBySymbol(symbol)` resolves via company master + delayed price feed. Add `cmotCompanyToStock()` mapper.
- `src/data/stocks.ts` — Keep as fallback. Add `DEMO_STOCK_IDS` export.
- `src/components/layout/Header.tsx` — Wire search button to `SearchDialog`
- `src/store/useAppStore.ts` — Add `searchResults`, `searchLoading`, `searchQuery` state
- `src/pages/Compare.tsx` — Support arbitrary stocks from search (not just 3 hardcoded)

**Dependencies**: 4A.

---

### Phase 4C: Quant Data Resolution (CMOTS → V2 Signals)

**Goal**: Build the engine that fetches CMOTS data for any stock and produces the 7 Quant `SegmentVerdictV2[]`.

**CMOTS endpoint → Quant signal mapping**:

| Endpoint | Feeds |
|---|---|
| TTM | Profitability (ROE, ROCE, OPM, NPM), Valuation (PE, PB, EV/EBITDA), Fin Health (D/E, Current Ratio) |
| FinData (5yr) | Growth (Revenue CAGR, multi-year trends), Fin Health (WC, Interest Coverage) |
| P&L rows | Growth (Revenue/EBITDA/PAT CAGR, EPS), Profitability (margins), Gates (Altman Z″, Beneish M) |
| Cash Flow rows | Fin Health gate G4 (CFO > 0 for 2/3 years), B1 cluster (OCF/EBITDA, FCF/NI) |
| Balance Sheet rows | Gates (Altman Z″ components), Valuation (PB, EV), Fin Health B2 cluster |
| Shareholding | Institutional Signals (FII/DII/MF), Gate G3 (Promoter Pledge) |
| Price/OHLCV | Technical (EMA, RSI, VPT), Performance (1Y/3Y/5Y returns) |

**Data Fallback Chain** (critical pattern from backtesting):
```
Fundamentals: CMOTS → IndianAPI (mergeFundamentals()) → mock fallback
Price/OHLCV:  CMOTS → DhanHQ → mock fallback
Shareholding: CMOTS only → mock fallback
```

The `mergeFundamentals()` function from `src/services/indianapi/fundamentals.ts` is key — it combines CMOTS (more accurate recent data) with IndianAPI (deeper 12-year history) into a unified dataset. IndianAPI converts its responses to `CMOTSStatementRow[]` format so `metricResolver` works without any changes.

**Create**:
- `src/services/quantScoringService.ts` — Orchestrates: fetch fundamentals (with fallback chain) → resolve metrics → compute gates → score signals → build segments. Falls back to `quantSignals.ts` mock data for demo stocks.
- `src/services/metricResolver.ts` — Port from backtesting (1161 lines — simplify: strip `asOfDate` windowing, keep metric computation functions). Works with `CMOTSStatementRow[]` regardless of source (CMOTS or IndianAPI).
- `src/lib/technicalCalc.ts` — Port from backtesting (EMA, RSI, VPT calculations)

**Modify**:
- `src/data/quantSignals.ts` — Add `getQuantSignalsFallback()` export for demo stocks

**Dependencies**: 4A.

---

### Phase 4D: Qual Signal Resolution

**Goal**: Compute ~30% of Qual signals from CMOTS data, mark the rest as `not_applicable` with `cmots_gap` confidence.

**What CAN be computed from CMOTS** (~20 of 65 signals):
- **MG**: A1 Promoter Holding (shareholding), A2 Holding Trend 3Y (shareholding history), A3 Pledge Status (partial)
- **BQ**: A1-A3 ROCE/OPM consistency (TTM + FinData), A5 ROCE vs WACC, D1-D2 Cash Backing (cash flow)
- **CD**: A1-A4 Dilution/Debt/Funding/WC (balance sheet), C1/C3 Dividend/Payout (TTM + cash flow)
- **EQ**: A1-A3 OCF/PAT/FCF (cash flow), B1-B2/B4 Receivables/Inventory/Goodwill (balance sheet), D3 Tax Rate (P&L)
- **ExQ**: A4 Quarterly Consistency (quarterly results CoV)

**What CANNOT from current APIs** (~45 signals — annual report, editorial):
- All of MG Groups B-D (auditor, board, disclosure, strategy)
- BQ Groups B-C (concentration, pricing power)
- CD Groups B, D (capex ROI, M&A track record)
- EQ Group C (restatements, auditor opinion, accounting policy)
- ExQ Groups A1-A3, B, C, X1 (guidance, ops KPIs, communication)

**NLP-dependent signals** → marked as "Coming Soon" in UI (Phase 2 scope):
- Sentiment analysis, management commentary parsing, annual report NLP
- These signals display a "Coming Soon" badge instead of `not_applicable`

**Future data sources** (needs research — what can fill the remaining Qual gaps?):
- **Screener.in** — Potential source for auditor info, board composition, related party transactions (via annual report parsing). Needs investigation of API availability, rate limits, data format.
- **Yahoo Finance** — Global data, useful for cross-listed stocks or as validation layer
- **Other sources TBD** — Research needed to determine which APIs can cover the ~45 Qual signals that CMOTS/IndianAPI cannot
- Architecture: Each new source implements the same `CMOTSStatementRow[]` conversion pattern established by IndianAPI, so `metricResolver` stays unchanged
- **Action item**: Spike research task before Phase 4D implementation to evaluate available sources

**Create**:
- `src/services/qualScoringService.ts` — For each factor: compute available signals from CMOTS + IndianAPI data, mark rest as `not_applicable`. Uses existing `qualScoringEngine.ts` for anchor-group scoring. Adjusts denominators when signals are excluded.

**Modify**:
- `src/lib/qualScoringEngine.ts` — Handle `not_applicable` signals: exclude from score computation
- `src/data/verdictsV2.ts` — Add `getQualSignalsFallback()` for demo stocks

**Dependencies**: 4A.

---

### Phase 4E: Verdict Assembly & Async Data Flow

**Goal**: Wire scoring services to UI. Pages fetch async, show loading states, fall back to mock.

**Create**:
- `src/hooks/useStockData.ts` — React hook: `useStockData(symbol)` returns `{ stock, verdict, loading, error, refetch }`. Manages loading via `useAppStore`.

**Modify**:
- `src/services/verdictService.ts` — Rewrite as async orchestrator: calls `quantScoringService` + `qualScoringService` in parallel, assembles `StockVerdictV2`. Falls back to mock for demo stocks.
- `src/pages/StockAnalysis.tsx` — Replace sync `@/data` imports with `useStockData()`. Add loading skeleton, error banner. Remove V1 code paths.
- `src/pages/SegmentDeepDive.tsx` — Use `useStockData()`, remove dual V1/V2 paths
- `src/pages/Dashboard.tsx` — Replace V1 verdicts with V2. Keep 3 demo stocks as featured.
- `src/pages/Compare.tsx` — Use async verdict loading for arbitrary stocks
- `src/store/useAppStore.ts` — Expand `LoadingKey` to include `'stock_analysis'`

**Dependencies**: 4B + 4C + 4D.

---

### Phase 4F: V1 Cleanup & Polish

**Goal**: Remove all V1 code paths. Clean deployment.

**Modify**:
- `src/data/verdicts.ts` — Add deprecation comment, remove from page imports
- `src/data/index.ts` — Remove V1 `getVerdictForStock` re-export
- `src/lib/scoring.ts` — Remove V1 functions (getScoreBand 0-10 scale)
- `src/services/index.ts` — Update barrel exports with CMOTS + new services
- Remove orphaned V1 components: `ScoreGauge` (unused), consider `SegmentBar`/`DIYSegmentList` migration

**Dependencies**: 4E.

---

## Dependency Graph

```
4A (All API Infrastructure: CMOTS + DhanHQ + IndianAPI)  ← Foundation, do first
├── 4B (Stock Search)       ← Can parallel with 4C/4D
├── 4C (Quant Resolution + mergeFundamentals fallback chain)
└── 4D (Qual Resolution + future source plug-in architecture)
    └── 4E (Verdict Assembly + Async UI)  ← Needs 4B+4C+4D
        └── 4F (V1 Cleanup)               ← Needs 4E
```

---

## Key Design Decisions

1. **Port, don't rebuild** — All 3 API clients from backtesting are battle-tested. Copy with minimal changes.
2. **Multi-source fallback chain** — CMOTS → IndianAPI/DhanHQ → mock data → error state. App never fully breaks. `mergeFundamentals()` combines the best of each source.
3. **Uniform data format** — All sources convert to `CMOTSStatementRow[]` so `metricResolver` works identically regardless of data origin. Future sources (Screener, Yahoo) follow same pattern.
4. **Confidence drives trust** — `ConfidenceIndicator` shows "5 of 15 signals computed" when APIs can't provide qual data. `cmots_gap` state already exists in UI.
5. **BFSI detection** — `metricResolver` from backtesting already handles BFSI (NIM, NPA, CRAR). Preserve this.
6. **Overall score** — Remains weighted pillar average for now (flagged for independent redesign).

---

## Verification

1. `npm run build` passes after each sub-phase
2. After 4A: `/api/cmots/companymaster` returns data in dev; DhanHQ and IndianAPI proxies respond
3. After 4B: Header search finds any BSE stock, navigates to analysis page
4. After 4C: Quant scores computed from API data; verify `mergeFundamentals()` combines sources correctly; DhanHQ fallback triggers when CMOTS OHLCV is empty
5. After 4D: Qual factors show computed signals + `not_applicable` with cmots_gap tooltip
6. After 4E: Any searched stock renders full V2 scorecard with loading states
7. After 4F: No V1 imports remain, `git grep 'getScoreBand(' src/` returns only V2
