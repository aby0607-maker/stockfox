# StockFox Feature Cluster Map

> Comprehensive macro view of all features to be built, organized by cluster with prioritization for the next 3 months.

**Last Updated:** 2026-02-03
**Status:** Planning Document
**Purpose:** Feature inventory, prioritization, and open questions for development roadmap

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Clusters Overview](#feature-clusters-overview)
3. [Complete Feature Inventory](#complete-feature-inventory)
4. [3-Month Development Priority](#3-month-development-priority)
5. [Open Questions](#open-questions)
6. [Dependencies Map](#dependencies-map)

---

## Executive Summary

StockFox's feature set spans **7 clusters** with **70+ features** total. For the MLP prototype and initial product phases, features are organized into:

| Cluster | Full Name | Feature Count | MLP Priority |
|---------|-----------|---------------|--------------|
| CVP | Core Value Proposition | 14 | P1 - Critical |
| PERS | Personalization | 11 | P2 - High |
| LEARN | Learning & Education | 14 | P2 - High |
| UX | Interface & Navigation | 12 | P1 - Critical |
| ENG | Engagement & Alerts | 11 | P3 - Medium |
| VAL | Validation Entry | 10 | P4 - Low (Entry Points) |
| **Total** | | **72** | |

---

## Feature Clusters Overview

### Cluster Positioning

```
USER JOURNEY FLOW:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[DISCOVER]        [ANALYZE]         [LEARN]          [VALIDATE]
    │                 │                │                  │
    ▼                 ▼                ▼                  ▼
┌────────┐      ┌──────────┐     ┌──────────┐      ┌──────────┐
│  UX    │ ───▶ │   CVP    │ ───▶│  LEARN   │ ───▶ │   VAL    │
│Cluster │      │ Cluster  │     │ Cluster  │      │ Cluster  │
└────────┘      └──────────┘     └──────────┘      └──────────┘
                     │                │
                     ▼                ▼
               ┌──────────┐     ┌──────────┐
               │   PERS   │     │   ENG    │
               │ Cluster  │     │ Cluster  │
               └──────────┘     └──────────┘
               (Overlays)       (Retention)
```

---

## Complete Feature Inventory

### CVP Cluster - Core Value Proposition (14 Features)

The CVP cluster delivers the "doctor analogy" - comprehensive diagnosis with transparent reasoning.

| ID | Feature | Brief Explainer | Phase | Status |
|----|---------|-----------------|-------|--------|
| A1 | 11-Segment DFY Analysis | AI-interpreted analysis across 11 segments (Profitability, Growth, Valuation, etc.) with scores and insights | MLP | To Build |
| A2 | 200+ Metrics Coverage | Comprehensive data coverage across all segments, surpassing competitors | MLP | To Build |
| A3 | 3-Layer Scoring | Metric → Segment → Overall scoring hierarchy (e.g., ROE 8.5 → Profitability 7.8 → Overall 7.2) | MLP | To Build |
| A4 | Overall Score + Verdict | Single score (8.2/10) with actionable verdict ("STRONG BUY") | MLP | To Build |
| A5 | Peer Ranking System | Contextual ranking within sector ("#2 of 15 Banking Stocks") | MLP | To Build |
| A6 | Sector-Relative Interpretation | Metrics interpreted relative to sector norms (e.g., PE of 25 is low for IT, high for Banking) | Phase 1 | To Build |
| A7 | Historical Trajectory | 5-year sparklines showing metric evolution over time | Phase 1 | To Build |
| A8 | Evidence Citations | 94% citation target - every claim backed by verifiable source | MLP | To Build |
| A9 | 3-Level Evidence Drill-Down | Summary → Detail → Raw Data access for any claim | MLP | To Build |
| A10 | Red Flag Identification | Automatic detection and flagging of concerning metrics/patterns | MLP | To Build |
| A11 | Stock Comparison | Side-by-side comparison of 2-3 stocks across all metrics | Phase 1 | To Build |
| B1 | RAG-Based AI Assistant | Chat interface with retrieval-augmented generation for stock Q&A | MLP | To Build |
| B2 | Stock-Specific Q&A | Contextual answers about the currently viewed stock | MLP | To Build |
| B3 | Verified Signal Queries | Queries that return only verified, cited information | Phase 1 | To Build |

---

### PERS Cluster - Personalization (11 Features)

The PERS cluster makes generic analysis personally relevant through 6-dimension personalization.

| ID | Feature | Brief Explainer | Phase | Status |
|----|---------|-----------------|-------|--------|
| C1 | 6D Personalization Engine | Core engine processing: Thesis, Risk, Horizon, Experience, Sector Pref, Portfolio Context | Phase 1 | To Build |
| C2 | Investment Thesis Profiles | Growth/Value/Agnostic thesis alignment affecting all interpretations | MLP | To Build |
| C3 | Risk Tolerance Calibration | Conservative/Moderate/Aggressive risk mapping to position sizing and alerts | MLP | To Build |
| C4 | Time Horizon Alignment | Short/Medium/Long-term horizon affecting valuation and growth emphasis | MLP | To Build |
| C5 | Experience Level Adaptation | Beginner/Intermediate/Advanced adjusting complexity of explanations | MLP | To Build |
| C6 | Sector Preference Filtering | User sector interests for discovery personalization | Phase 1 | To Build |
| C7 | Portfolio Context Awareness | Holdings data informing diversification and concentration analysis | Phase 1 | To Build |
| D1 | Adaptive Complexity Explainers | Same concept explained differently based on experience level | MLP | To Build |
| D2 | Position Sizing Guidance | "Consider 8-12% allocation" based on risk profile and conviction | Phase 2 | Planned |
| D3 | Entry Timing Guidance | "Wait for better entry" or "Current levels attractive" personalized signals | Phase 2 | Planned |
| J1 | For You Discovery | Personalized stock suggestions based on profile and portfolio gaps | Phase 1 | To Build |

---

### LEARN Cluster - Learning & Education (14 Features)

The LEARN cluster builds user independence through contextual education and self-reflection tools.

| ID | Feature | Brief Explainer | Phase | Status |
|----|---------|-----------------|-------|--------|
| E1 | Metric-by-Metric Learning Mode | Toggle to see educational content for any metric | MLP | To Build |
| E2 | Contextual Learning (Hover) | Tooltips explaining metrics in plain English | MLP | To Build |
| E3 | Analysis Journal | Auto-logged history of all analyses with notes capability | MLP | To Build |
| E4 | Journal System Feedback | AI prompts for reflection ("What made you confident?") | Phase 1 | To Build |
| E5 | Highlight-to-Note | Select text to save as note in journal | Phase 1 | To Build |
| E6 | Decision Logging | Buy/Hold/Avoid decisions with reasoning capture | MLP | To Build |
| E7 | Outcome Tracking | Track actual outcomes vs decisions for learning | Phase 2 | Planned |
| E8 | Blind Spot Detection | AI identifies patterns user consistently misses | Phase 2 | Planned |
| E9 | Progressive Skill Development | Track learning progress across concepts | Phase 2 | Planned |
| E10 | Pattern Recognition Feedback | "You tend to overlook debt levels" type insights | Phase 2 | Planned |
| B4 | Interactive Learning via Chat | Ask questions to learn, not just analyze | MLP | To Build |
| H5 | Historical Drawdown Education | "During COVID, this stock fell 35%" stress test context | MLP | To Build |
| K1 | Position Tracking | Track paper positions to learn without real money risk | Phase 2 | Planned |

---

### UX Cluster - Interface & Navigation (12 Features)

The UX cluster provides the interface foundation for all features.

| ID | Feature | Brief Explainer | Phase | Status |
|----|---------|-----------------|-------|--------|
| G1 | Progressive Disclosure Scorecard | Collapsed → Summary → Full detail expansion pattern | MLP | To Build |
| G2 | DIY ↔ DFY Toggle | Switch between AI-interpreted and raw data views | MLP | To Build |
| G3 | Unified Discovery Section | Single hub for Trending, Top Rated, For You | MLP | To Build |
| G4 | Watchlist Management | Add/remove stocks, organize into lists | MLP | To Build |
| G5 | Plain English Explanations | No jargon without inline definition | MLP | To Build |
| G6 | Guided Onboarding | Profile setup flow capturing 6D preferences | MLP | To Build |
| G7 | Personalization Presets | Quick-select profiles (Conservative Beginner, Aggressive Expert, etc.) | MLP | To Build |
| G8 | Analysis Sharing & Export | Share analysis as image/PDF, export to notes | Phase 1 | To Build |
| G9 | Free Tier Indicator | Clear display of free quota (3 stocks) and premium CTA | MLP | To Build |
| G10 | Profile Switcher | Demo-specific: switch between Ankit/Sneha/Kavya | MLP | To Build |
| G11 | Dashboard Home | Watchlist, alerts summary, quick actions | MLP | To Build |
| G12 | Navigation System | Bottom nav (mobile), sidebar (desktop), consistent routing | MLP | To Build |

---

### ENG Cluster - Engagement & Alerts (11 Features)

The ENG cluster drives retention through proactive notifications and social discovery.

| ID | Feature | Brief Explainer | Phase | Status |
|----|---------|-----------------|-------|--------|
| F1 | Smart Alerts (Customizable) | User-configured alert preferences with thresholds | MLP | To Build |
| F2 | Score Drop Alerts | Notify when watchlist stock score decreases significantly | MLP | To Build |
| F3 | Peer Rank Change Alerts | Notify when stock moves in sector ranking | Phase 1 | To Build |
| F4 | Quarterly Earnings Alerts | Calendar reminders for upcoming earnings | Phase 1 | To Build |
| F5 | Portfolio Concentration Alerts | Warn when sector allocation exceeds threshold | MLP | To Build |
| F6 | Thesis-Breaking Event Alerts | Critical alerts when investment thesis is challenged | MLP | To Build |
| F7 | News & Event Integration | Curated news feed for watchlist stocks | Phase 1 | To Build |
| J2 | Trending Stocks | Most analyzed stocks by community | MLP | To Build |
| J3 | Top Rated by Sector | Leaderboard of highest-scored stocks per sector | MLP | To Build |
| J4 | Score Movers | Stocks with biggest score changes (up/down) | Phase 1 | To Build |
| J9 | Community Signals | Aggregated community sentiment (shown after analysis) | Phase 2 | Planned |

---

### VAL Cluster - Validation Entry (10 Features)

The VAL cluster provides entry points to validation tools (Phase 2+ full implementation).

| ID | Feature | Brief Explainer | Phase | Status |
|----|---------|-----------------|-------|--------|
| H1 | Forward-Testing Simulator | Virtual portfolio to test thesis risk-free | Entry Point Only | To Build |
| H2 | Backtesting Engine | Historical "what-if" analysis for stocks | Entry Point Only | To Build |
| H4 | What-If Scenarios | Explore different entry points, position sizes | Concept Only | To Build |
| I1 | Advisor Marketplace | Browse SEBI-registered advisors for consultation | Browse View | To Build |
| I2 | 3-Tier Advisor System | Elite/Expert/Emerging advisor categorization | Visual Only | To Build |
| I3 | Advisor Specialization Filters | Filter by sector, strategy, price | Filter UI | To Build |
| I4 | AI + Human Review Concept | Explanation of 10x efficiency model | Explainer | To Build |
| I5 | Verified Credentials & AUM | Verification badges for advisors | Visual Only | To Build |
| I6 | Track Record Display | Advisor performance metrics and history | Visual Only | To Build |
| I8 | Pricing Display | Consultation costs and inclusions | Visual Only | To Build |

---

## 3-Month Development Priority

### Priority Framework

| Priority | Definition | Timeline |
|----------|------------|----------|
| P0 | Foundation/Blockers | Week 1-2 |
| P1 | Core MLP Features | Month 1 |
| P2 | Enhanced MLP Features | Month 2 |
| P3 | Polish & Engagement | Month 3 |
| P4 | Future/Entry Points | Month 3+ |

---

### Month 1: Core Analysis Experience (Weeks 1-4)

**Goal:** Deliver functional stock analysis with verdicts, scores, and basic personalization

| Week | Features | Cluster | Rationale |
|------|----------|---------|-----------|
| 1-2 | G12 Navigation, G11 Dashboard, G6 Onboarding | UX | Foundation for all features |
| 1-2 | A4 Overall Score + Verdict, A3 3-Layer Scoring | CVP | Hero feature - the "verdict" |
| 2-3 | A1 11-Segment Analysis (4-5 DFY, rest DIY) | CVP | Core value proposition |
| 2-3 | G1 Progressive Disclosure, G2 DIY/DFY Toggle | UX | Analysis presentation |
| 3-4 | C2-C5 Basic Personalization (Thesis, Risk, Horizon, Experience) | PERS | Make analysis relevant |
| 3-4 | A8 Evidence Citations, A9 3-Level Drill-Down | CVP | Trust and transparency |
| 4 | G10 Profile Switcher | UX | Demo capability |

**Month 1 Deliverable:** Working stock analysis with score, verdict, segments, and basic personalization for 3 demo stocks (TCS, Axis Bank, Eternal)

---

### Month 2: Intelligence & Learning (Weeks 5-8)

**Goal:** Add AI chat, learning features, and peer context

| Week | Features | Cluster | Rationale |
|------|----------|---------|-----------|
| 5 | B1 RAG AI Assistant, B2 Stock-Specific Q&A | CVP | Interactive analysis |
| 5-6 | A5 Peer Ranking System | CVP | Context for verdicts |
| 6 | A10 Red Flag Identification | CVP | Risk awareness |
| 6-7 | E1-E2 Learning Mode + Hover Tooltips | LEARN | Plain English education |
| 7 | E3 Analysis Journal, E6 Decision Logging | LEARN | Track user journey |
| 7-8 | G4 Watchlist Management | UX | User data persistence |
| 8 | D1 Adaptive Complexity | PERS | Profile-aware explanations |

**Month 2 Deliverable:** Full analysis experience with AI chat, peer rankings, learning mode, and journal

---

### Month 3: Engagement & Polish (Weeks 9-12)

**Goal:** Add alerts, discovery, and validation entry points

| Week | Features | Cluster | Rationale |
|------|----------|---------|-----------|
| 9 | F1-F2 Smart Alerts, Score Drop Alerts | ENG | Retention mechanism |
| 9-10 | F5-F6 Concentration + Thesis-Breaking Alerts | ENG | Critical alerts |
| 10 | J2-J3 Trending Stocks, Top Rated | ENG | Discovery engagement |
| 10-11 | G9 Free Tier Indicator, Pricing UI | UX | Monetization foundation |
| 11 | H2 Backtest Concept, H5 Drawdown Education | VAL/LEARN | Validation preview |
| 11-12 | I1-I2 Advisor Marketplace Browse | VAL | Advisory preview |
| 12 | A11 Stock Comparison | CVP | Enhanced analysis |
| 12 | Polish, Bug Fixes, Demo Prep | All | Production readiness |

**Month 3 Deliverable:** Complete MLP with alerts, discovery, validation entry points, and monetization UI

---

### 3-Month Feature Summary

| Category | Feature Count | % of Total |
|----------|---------------|------------|
| Fully Built | 45 | 62% |
| Entry Points/Concepts | 10 | 14% |
| Deferred to Phase 2+ | 17 | 24% |

---

## Open Questions

### Strategic Questions (Need Product Decision)

| # | Question | Options | Impact | Owner |
|---|----------|---------|--------|-------|
| 1 | **How many segments should be DFY vs DIY in MLP?** | A) 5 DFY + 6 DIY, B) 8 DFY + 3 DIY, C) All 11 DFY | Scope, AI complexity, time | Product |
| 2 | **Should AI chat be stock-scoped or general?** | A) Only current stock, B) Any stock user asks, C) General investing Q&A | RAG complexity, hallucination risk | Product |
| 3 | **What's the free tier for MLP demo?** | A) Unlimited (demo), B) 3 stocks like production, C) 1 stock to show upgrade | Demo effectiveness vs realism | Product |
| 4 | **Should personalization affect scores?** | A) Same score, different interpretation, B) Personalized scores | User confusion vs relevance | Product |
| 5 | **How to handle stocks not in demo set?** | A) "Coming soon" message, B) Basic data only, C) Full analysis attempt | User expectations, data coverage | Product |

### Technical Questions (Need Engineering Decision)

| # | Question | Options | Impact | Owner |
|---|----------|---------|--------|-------|
| 6 | **Where to store user data (watchlist, journal)?** | A) Local storage, B) Mock backend, C) Real backend (Firebase/Supabase) | Data persistence, demo reset | Eng |
| 7 | **How to implement RAG for AI chat?** | A) Pre-computed responses, B) Real RAG with embeddings, C) Hybrid | Response quality, development time | Eng |
| 8 | **Mobile-first or desktop-first?** | A) Mobile-first, B) Desktop-first, C) Simultaneous | Design effort, demo context | Eng/Design |
| 9 | **What charting library for sparklines/trends?** | A) Recharts, B) Chart.js, C) D3, D) Lightweight custom | Bundle size, customization | Eng |
| 10 | **How to handle profile switching state?** | A) Full page reload, B) Context swap, C) URL-based | UX smoothness, state complexity | Eng |

### Data Questions (Need Content Decision)

| # | Question | Options | Impact | Owner |
|---|----------|---------|--------|-------|
| 11 | **How realistic should mock data be?** | A) Exactly accurate, B) Realistic but simplified, C) Illustrative only | Demo credibility, data effort | Content |
| 12 | **Should we use real historical events?** | A) Real events (COVID, etc.), B) Generic "market correction" | Relatability vs datedness | Content |
| 13 | **How many advisor profiles needed?** | A) 3 (one per tier), B) 6 (two per tier), C) 12 (full marketplace feel) | Content effort vs realism | Content |

---

## Dependencies Map

### Feature Dependencies (Build Order)

```
LAYER 0 - Foundation (No Dependencies):
├── G12 Navigation System
├── G11 Dashboard Home
└── G6 Guided Onboarding

LAYER 1 - Core Analysis (Depends on Layer 0):
├── A4 Overall Score + Verdict
├── A3 3-Layer Scoring
├── A1 11-Segment Analysis
│   └── Depends on: A3 Scoring
├── G1 Progressive Disclosure
└── G2 DIY/DFY Toggle

LAYER 2 - Personalization (Depends on Layer 1):
├── C2-C5 Basic Personalization
│   └── Depends on: G6 Onboarding
├── A8 Evidence Citations
│   └── Depends on: A1 Segments
└── G10 Profile Switcher
    └── Depends on: C2-C5 Personalization

LAYER 3 - Intelligence (Depends on Layer 2):
├── B1 RAG AI Assistant
│   └── Depends on: A1 Segments, A8 Citations
├── A5 Peer Ranking
│   └── Depends on: A4 Scores
├── A10 Red Flags
│   └── Depends on: A1 Segments
└── E1-E2 Learning Mode
    └── Depends on: A1 Segments

LAYER 4 - Engagement (Depends on Layer 3):
├── E3 Analysis Journal
│   └── Depends on: A1 Analysis
├── G4 Watchlist
│   └── Depends on: A4 Scores
├── F1-F6 Alerts
│   └── Depends on: A4 Scores, G4 Watchlist
└── J2-J3 Discovery
    └── Depends on: A5 Peer Ranking

LAYER 5 - Validation (Depends on Layer 4):
├── H2 Backtest Concept
│   └── Depends on: A1 Analysis
├── I1 Advisor Marketplace
│   └── Depends on: G12 Navigation
└── A11 Stock Comparison
    └── Depends on: A1 Analysis (x2 stocks)
```

### External Dependencies

| Dependency | Features Affected | Risk Level |
|------------|-------------------|------------|
| Stock Data (Mock) | All CVP features | Low (pre-built) |
| AI/LLM Integration | B1-B4 Chat features | Medium (API setup) |
| Charting Library | A7 Trajectory, H2 Backtest | Low (standard lib) |
| State Management | All features | Low (standard setup) |
| Routing | All navigation | Low (standard setup) |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-02-03 | Initial feature cluster map created | Claude |

---

*This document consolidates information from:*
- `docs/prd/stockfox_mlp_feature_clusters_v1.md`
- `docs/prd/CONSOLIDATED_PRD_SUMMARY.md`
- `docs/research/Stock Fox _ Claude _ Feature Mapping.md`
- `docs/research/StockFox Feature Map.md`
- `docs/prd/stockfox_cvp_personalisation_prd_v2.md`
- `docs/prd/stockfox_prd_learn_cluster.md`
- `docs/prd/stockfox_prd_ux_navigation_cluster.md`
- `docs/prd/stockfox_prd_tech_spech_eng_cluster.md`
- `docs/prd/stockfox_prd_tech_spec_val_cluster.md`
- `docs/research/Hero Feature Now vs Future Roadmap.md`
