# Cluster M: Mutual Funds

> **Category:** Mutual Funds | **Features:** 4 | **Micro-features:** 36 | **Avg Strategic Score:** 18/25
> **Phase:** 5 (12+ months) | **Dependencies:** A1-A14 (Stock Analysis), G1 (Portfolio Sync)

---

## Cluster Overview

| Attribute | Value |
|-----------|-------|
| **Cluster ID** | M |
| **Full Name** | Mutual Funds |
| **Total Features** | 4 |
| **Total Micro-features** | 36 |
| **Primary Jobs** | FJ1, FJ2, FJ8, EJ1, EJ4 |
| **Target Personas** | All personas (especially Busy Rajesh, Transitioning Tanmay) |
| **Phase** | 5 (12+ months) |
| **Strategic Tier** | Tier 2-3 (expansion category) |

---

## Cluster Philosophy

### Why Mutual Funds in StockFox?

StockFox's core value is **DFY (Done-For-You) analysis** - bringing institutional-grade research to retail investors. While direct equity is the primary focus, **70%+ of Indian retail investors** hold mutual funds either through SIPs or as part of diversified portfolios.

**The Gap Today:**
- Mutual fund platforms (Groww, Zerodha Coin) show star ratings and returns
- No platform explains **WHY** a fund performs well/poorly
- Users can't compare MF performance to direct equity alternatives
- No personalization based on user's equity holdings

**StockFox's MF Approach:**
- Apply same 11-segment methodology to fund holdings analysis
- Show **transparency** into what the fund actually holds
- Personalized recommendations based on **existing equity gaps**
- Help users decide: "Should I buy the stock or the fund?"

---

## Feature Inventory

| ID | Feature | Micro-features | Strategic Score | Primary Jobs |
|----|---------|----------------|-----------------|--------------|
| M1 | MF Analysis Engine | 12 | 19 | FJ1, FJ2, EJ1, EJ4 |
| M2 | MF Comparison | 8 | 18 | FJ1, FJ8, EJ4 |
| M3 | MF Portfolio Integration | 9 | 18 | FJ5, FJ6, EJ2 |
| M4 | MF Recommendations | 7 | 17 | FJ8, EJ1, EJ5 |
| **Total** | | **36** | **Avg: 18** | |

---

## M1: MF Analysis Engine (12 Micro-features)

> **Description:** Comprehensive mutual fund analysis using StockFox's transparent, DFY methodology
> **Strategic Score:** 19/25 | **Phase:** 5 | **Complexity:** High

### Why This Feature Matters

Users want to understand their mutual funds with the **same depth** they get for individual stocks. Current platforms show past returns and star ratings - essentially "black box" recommendations. StockFox brings **transparency and evidence-based analysis** to MF selection.

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| M1.1 | **Fund Scorecard** | Overall score (1-10) with verdict for any mutual fund | User sees at-a-glance whether a fund is worth investing in | FJ1, EJ1, EJ4 |
| M1.2 | **Holdings Transparency View** | Complete list of stocks/bonds the fund holds with % allocation | User knows exactly what they're buying into | FJ2, EJ2, P2 |
| M1.3 | **Holdings Quality Score** | Aggregate StockFox score of all holdings weighted by allocation | User understands if the fund holds quality stocks | FJ1, FJ2, EJ1 |
| M1.4 | **Sector Exposure Breakdown** | Visual breakdown of fund's sector allocation vs benchmarks | User sees concentration risks and diversification level | FJ2, FJ3, EJ4 |
| M1.5 | **Fund Manager Analysis** | Track record, tenure, AUM managed, previous funds performance | User evaluates the human behind the fund | FJ2, EJ1 |
| M1.6 | **Expense Ratio Impact Calculator** | Shows how expense ratio affects returns over 5/10/20 years | User understands the true cost of the fund | FJ2, FJ3, EJ3 |
| M1.7 | **Risk-Adjusted Returns** | Sharpe ratio, Sortino ratio, max drawdown with explanations | User compares funds on risk-adjusted basis, not just returns | FJ2, EJ1, EJ3 |
| M1.8 | **Rolling Returns Analysis** | Performance across different time periods (1Y, 3Y, 5Y, 10Y rolling) | User sees consistency vs point-in-time returns | FJ2, EJ1 |
| M1.9 | **Benchmark Comparison** | Fund vs benchmark (Nifty 50, Nifty Next 50, etc.) with alpha calculation | User knows if active management is adding value | FJ1, FJ2, EJ3 |
| M1.10 | **Fund Category Context** | Performance relative to category (Large Cap, Mid Cap, etc.) | User evaluates fund against relevant peers | FJ1, FJ8, EJ4 |
| M1.11 | **Exit Load & Lock-in Info** | Clear display of exit loads, lock-in periods, tax implications | User understands liquidity constraints | FJ3, EJ2 |
| M1.12 | **Red Flags for Funds** | Alerts for concerning patterns (high churn, style drift, AUM bloat) | User avoids problematic funds | FJ3, FJ7, EJ1 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  AXIS BLUECHIP FUND - DIRECT GROWTH                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌──────────────┐   HOLDINGS QUALITY                           │
│  │              │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━                │
│  │    7.8/10    │   Avg StockFox Score: 7.8                    │
│  │  GOOD BUY    │   Top Holdings: TCS (9.1), HDFC Bank (8.4)   │
│  │              │   Weak Holdings: None flagged                 │
│  └──────────────┘                                              │
│                                                                 │
│  SECTOR EXPOSURE           vs NIFTY 50                         │
│  ├── Banking      28% ████████████▌    (+3%)                   │
│  ├── IT           22% █████████▏       (-2%)                   │
│  ├── Consumer     15% ██████▎          (+1%)                   │
│  ├── Pharma       12% █████            (+4%)                   │
│  └── Others       23% █████████▌       (-6%)                   │
│                                                                 │
│  EXPENSE RATIO IMPACT (₹10K SIP/month over 20 years)           │
│  ├── This Fund (0.35%):  ₹1,02,34,000                         │
│  ├── Category Avg (0.75%): ₹96,78,000                         │
│  └── You Save: ₹5,56,000 by choosing this fund                │
│                                                                 │
│  ⚠️ RED FLAGS: None identified                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## M2: MF Comparison (8 Micro-features)

> **Description:** Side-by-side comparison of multiple mutual funds across all dimensions
> **Strategic Score:** 18/25 | **Phase:** 5 | **Complexity:** Medium

### Why This Feature Matters

Users often shortlist 2-4 funds in the same category and struggle to make a final decision. Comparison features help users make **confident, informed choices** by seeing all factors side-by-side.

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| M2.1 | **Fund vs Fund Comparison** | Compare 2-4 funds side-by-side across all metrics | User directly compares shortlisted funds | FJ1, EJ4 |
| M2.2 | **Holdings Overlap Analysis** | Shows % overlap in holdings between funds | User avoids buying duplicate exposure | FJ3, EJ4 |
| M2.3 | **Historical Performance Chart** | Overlayed performance chart for visual comparison | User sees relative performance over time | FJ2, EJ4 |
| M2.4 | **Risk-Return Scatter Plot** | Funds plotted on risk vs return axes | User visualizes risk-reward tradeoff | FJ2, EJ3 |
| M2.5 | **Cost Comparison Matrix** | Expense ratio, exit load, minimum investment comparison | User evaluates total cost of ownership | FJ2, FJ3 |
| M2.6 | **Recommendation Winner** | AI-generated verdict on which fund is better for user's profile | User gets personalized recommendation | FJ1, EJ1, EJ4 |
| M2.7 | **MF vs Direct Equity** | Compare fund to buying its top holdings directly | User decides between fund vs direct stocks | FJ1, FJ2, EJ3 |
| M2.8 | **Tax Efficiency Comparison** | LTCG, STCG implications for each fund option | User optimizes for post-tax returns | FJ3, EJ3 |

### Visual Interface Sample

```
┌──────────────────────────────────────────────────────────────────────────┐
│  COMPARE: AXIS BLUECHIP vs MIRAE ASSET LARGE CAP vs SBI BLUECHIP        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                          │
│                    AXIS          MIRAE         SBI                       │
│  ─────────────────────────────────────────────────────────              │
│  StockFox Score   7.8 ⭐        8.1 ⭐         7.4                       │
│  5Y Returns       14.2%         15.8%         12.9%                      │
│  Expense Ratio    0.35%         0.52%         0.89%                      │
│  Sharpe Ratio     1.12          1.24          0.98                       │
│  Max Drawdown     -18%          -21%          -19%                       │
│  AUM              ₹32,500 Cr    ₹41,200 Cr    ₹28,100 Cr                │
│                                                                          │
│  HOLDINGS OVERLAP                                                        │
│  ├── AXIS ↔ MIRAE: 68% overlap                                          │
│  ├── AXIS ↔ SBI: 54% overlap                                            │
│  └── MIRAE ↔ SBI: 61% overlap                                           │
│                                                                          │
│  ┌─────────────────────────────────────────────┐                        │
│  │  🏆 RECOMMENDATION FOR YOUR PROFILE          │                        │
│  │  Based on your moderate risk + 5Y horizon:   │                        │
│  │  MIRAE ASSET LARGE CAP is the best fit       │                        │
│  │  (+1.6% better returns, +0.12 higher Sharpe) │                        │
│  └─────────────────────────────────────────────┘                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## M3: MF Portfolio Integration (9 Micro-features)

> **Description:** Integrate mutual fund holdings with user's direct equity portfolio for unified view
> **Strategic Score:** 18/25 | **Phase:** 5 | **Dependencies:** G1 (Portfolio Sync)

### Why This Feature Matters

Most investors hold **both** mutual funds and direct stocks, but view them separately. This creates blind spots around concentration risk, sector overlap, and true portfolio allocation. Integration provides a **single source of truth**.

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| M3.1 | **Unified Portfolio View** | Single dashboard showing MF + direct equity holdings | User sees complete portfolio in one place | FJ6, EJ2, EJ4 |
| M3.2 | **True Allocation Calculator** | Calculates actual sector/stock exposure including MF underlying | User knows real portfolio concentration | FJ3, FJ5, EJ1 |
| M3.3 | **Hidden Overlap Detector** | Identifies stocks held both directly AND in MFs | User avoids unintended concentration | FJ3, EJ1 |
| M3.4 | **MF Portfolio Health Score** | Overall score for all MF holdings weighted by value | User monitors MF portion's quality | FJ5, FJ6, EJ1 |
| M3.5 | **Direct vs MF Split Analysis** | Shows what % of portfolio is direct vs through funds | User understands portfolio structure | FJ5, EJ4 |
| M3.6 | **SIP Tracker** | Track active SIPs with projected future value | User monitors SIP progress and projections | FJ5, FJ6, EJ2 |
| M3.7 | **MF Rebalancing Alerts** | Alerts when MF allocation drifts from target | User maintains intended allocation | FJ3, FJ6, EJ1 |
| M3.8 | **Tax Harvesting Opportunities** | Identifies MF units eligible for tax-loss harvesting | User optimizes tax efficiency | FJ3, EJ3 |
| M3.9 | **Consolidated Returns View** | XIRR across all holdings (direct + MF combined) | User knows true portfolio returns | FJ5, EJ2, EJ6 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  UNIFIED PORTFOLIO VIEW                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  TOTAL VALUE: ₹18,45,000        XIRR: 16.2%                    │
│                                                                 │
│  ALLOCATION BREAKDOWN                                           │
│  ├── Direct Equity    ₹12,30,000 (67%)  ████████████████▌       │
│  └── Mutual Funds     ₹6,15,000  (33%)  ████████▎               │
│                                                                 │
│  TRUE SECTOR EXPOSURE (Direct + MF Underlying)                  │
│  ├── Banking          34% ████████████████▌                     │
│  │   ├── Direct: HDFC Bank, ICICI (22%)                        │
│  │   └── via MFs: Additional 12% exposure                      │
│  ├── IT               28% ██████████████                        │
│  └── Others           38% ███████████████████                   │
│                                                                 │
│  ⚠️ HIDDEN OVERLAP DETECTED                                     │
│  You own TCS directly (₹1.5L) AND via 3 MFs (₹45K equivalent)  │
│  Total TCS exposure: 10.5% of portfolio (recommended: <8%)      │
│                                                                 │
│  ACTIVE SIPs                                                    │
│  ├── Axis Bluechip: ₹10K/month × 24 months = ₹2,62,000         │
│  ├── Mirae Mid Cap: ₹5K/month × 18 months = ₹98,000            │
│  └── Projected 5Y value: ₹14,20,000 (at 12% CAGR)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## M4: MF Recommendations (7 Micro-features)

> **Description:** Personalized mutual fund recommendations based on user profile and existing portfolio
> **Strategic Score:** 17/25 | **Phase:** 5 | **Dependencies:** B1 (6D Engine), G1 (Portfolio Sync)

### Why This Feature Matters

Generic "top funds" lists don't account for what a user already owns. **Personalized recommendations** consider existing portfolio gaps, risk profile, and investment goals to suggest truly complementary funds.

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| M4.1 | **Gap-Based Recommendations** | Suggest funds that fill portfolio gaps (sector, cap, style) | User gets funds that complement existing holdings | FJ8, EJ4 |
| M4.2 | **Risk-Aligned Suggestions** | Filter recommendations by user's risk profile | User gets funds matching their risk tolerance | FJ8, EJ1 |
| M4.3 | **Goal-Based Fund Picker** | Recommend funds for specific goals (retirement, child education) | User builds goal-oriented portfolio | FJ8, EJ1, EJ2 |
| M4.4 | **SIP vs Lumpsum Advisor** | Recommend investment mode based on market conditions | User chooses optimal entry strategy | FJ1, FJ3, EJ1 |
| M4.5 | **Category Recommendations** | Best-in-class funds for each category with reasoning | User discovers top funds with transparent reasoning | FJ8, EJ1, EJ4 |
| M4.6 | **New Fund Offer (NFO) Analysis** | Analysis of new funds with subscription recommendation | User evaluates NFOs with StockFox methodology | FJ7, FJ8, EJ1 |
| M4.7 | **Fund Exit Recommendations** | Identify underperforming funds to consider exiting | User knows when to switch funds | FJ3, FJ5, EJ1 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  PERSONALIZED MF RECOMMENDATIONS                                │
│  Based on: Moderate Risk | 5-7 Year Horizon | Growth Thesis    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  🎯 PORTFOLIO GAPS IDENTIFIED                                   │
│  ├── Missing: Mid Cap exposure (current: 0%, recommended: 15%)  │
│  ├── Low: International diversification (current: 2%)           │
│  └── Overweight: Large Cap Banking (current: 34%)               │
│                                                                 │
│  RECOMMENDED TO ADD                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #1 MIRAE ASSET MIDCAP FUND                              │   │
│  │  Score: 8.4/10 | 5Y: 18.2% | Expense: 0.48%              │   │
│  │  Why: Fills your mid-cap gap, top-rated in category       │   │
│  │  Suggested: ₹5,000/month SIP                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  #2 MOTILAL OSWAL NASDAQ 100 FOF                         │   │
│  │  Score: 7.9/10 | 5Y: 22.1% | Expense: 0.50%              │   │
│  │  Why: Adds international tech exposure, uncorrelated      │   │
│  │  Suggested: Lumpsum ₹25,000                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ CONSIDER EXITING                                            │
│  HDFC Equity Fund - Underperforming category by 4.2% for 3Y     │
│  Better alternative: ICICI Pru Bluechip (similar style, +2.8%)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## JTBD Mapping Summary

### Functional Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| FJ1 | Help me decide if this fund is worth buying | M1.1, M1.3, M2.1, M2.6, M4.4 |
| FJ2 | Help me understand WHY this fund is good/bad | M1.2, M1.4-M1.10, M2.3-M2.5, M2.7 |
| FJ3 | Help me avoid making costly mistakes | M1.6, M1.11, M1.12, M2.5, M2.8, M3.3, M3.7, M4.4, M4.7 |
| FJ5 | Help me track and improve my decisions | M3.1-M3.9, M4.7 |
| FJ6 | Help me stay updated on my holdings | M3.1, M3.4, M3.6, M3.7 |
| FJ7 | Help me verify tips before acting | M1.12, M4.6 |
| FJ8 | Help me find new investment opportunities | M2.1, M4.1-M4.6 |

### Emotional Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| EJ1 | Make me feel confident, not anxious | M1.1, M1.5, M1.7, M2.6, M3.4, M4.2-M4.7 |
| EJ2 | Make me feel in control, not dependent | M1.2, M1.11, M3.1, M3.6, M3.9, M4.3 |
| EJ3 | Make me feel smart, not foolish | M1.6, M1.7, M2.4, M2.7, M2.8, M3.8 |
| EJ4 | Remove the feeling of being overwhelmed | M1.1, M1.4, M1.10, M2.1, M2.3, M3.1, M3.5, M4.1, M4.5 |
| EJ5 | Remove the fear of missing out | M4.6 |
| EJ6 | Make me feel I'm making progress | M3.9 |

### Social Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| SJ1 | Help me be seen as a knowledgeable investor | M1.2, M1.7 (understand funds deeply) |
| SJ3 | Help me teach others | M1.2, M1.6 (explain fund concepts to others) |

---

## Dependencies Map

```
CLUSTER M DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXTERNAL DEPENDENCIES (from other clusters):

A1 (Stock Scorecard) ───────┐
                            ├──► M1.3 (Holdings Quality Score)
A4 (Overall Score)  ────────┤    Uses stock scores for MF underlying
                            │
G1 (Portfolio Sync) ────────┼──► M3 (MF Portfolio Integration)
                            │    Needs portfolio data for unified view
                            │
B1 (6D Engine) ─────────────┼──► M4 (MF Recommendations)
                            │    Personalization for recommendations
                            │
B3 (Risk Calibration) ──────┘    Risk profile for fund suggestions

INTERNAL DEPENDENCIES (within Cluster M):

M1 (Analysis Engine) ───────► M2 (Comparison)
                              Uses scoring methodology
        │
        └──────────────────► M4 (Recommendations)
                              Uses fund scores for suggestions

M3 (Portfolio Integration) ─► M4.1 (Gap-Based Recommendations)
                              Needs portfolio data to find gaps

DATA DEPENDENCIES:

MF NAV Feed ────────────────► M1, M2, M3, M4
                              Real-time NAV data

MF Holdings Data ───────────► M1.2, M2.2, M3.2, M3.3
                              Underlying holdings disclosure
                              (Monthly data from AMCs)

Historical Returns ─────────► M1.8, M2.3
                              Rolling returns calculation
```

---

## Implementation Considerations

### Data Requirements

| Data Type | Source | Frequency | Usage |
|-----------|--------|-----------|-------|
| NAV Data | AMFI, BSE Star MF | Daily | Returns calculation, portfolio valuation |
| Holdings Data | AMC Disclosures | Monthly | Holdings analysis, overlap detection |
| AUM & Expense Ratio | AMFI | Monthly | Fund size monitoring, cost calculation |
| Fund Manager Info | AMC websites | Quarterly | Manager track record |
| Benchmark Data | NSE, BSE | Daily | Alpha calculation |

### Technical Complexity

| Feature | Complexity | Notes |
|---------|------------|-------|
| M1 | High | Requires real-time data feeds + underlying holdings mapping |
| M2 | Medium | Comparison logic on top of M1 |
| M3 | High | Needs G1 (Portfolio Sync) + holdings aggregation |
| M4 | Medium | Recommendation engine on top of B1 + M1 + M3 |

### Phase 5 Rationale

Mutual Funds are scheduled for Phase 5 because:
1. **Core focus first**: Direct equity analysis is StockFox's primary differentiator
2. **Data complexity**: MF holdings data is monthly, requiring different data architecture
3. **Dependency chain**: Requires mature A (Stock Analysis) + G (Portfolio) + B (Personalization)
4. **Market validation**: Validate core product before expanding scope

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| MF Analysis Usage | 30% of users analyze ≥1 MF | Feature engagement |
| Portfolio Integration Adoption | 40% of users with MF holdings sync | Sync completion rate |
| Recommendation Conversion | 15% of recommendations lead to action | Click-through to broker |
| Hidden Overlap Detection Value | ₹50K avg overlap identified per user | Calculated savings |
| User NPS for MF features | >50 | Feature-specific NPS survey |

---

## Running Total

| Cluster | Features | Micro-features |
|---------|----------|----------------|
| A: Stock Scorecard | 12 segments | 76 |
| A12: AI Assistant Wrapper | 8 | 28 |
| B: Personalization Engine | 11 | 57 |
| C: Customization & Templates | 6 | 32 |
| E: Learning & Education | 9 | 47 |
| F: Alerts & Monitoring | 8 | 40 |
| G: Portfolio Features | 8 | 44 |
| H: Validation & Simulation | 5 | 32 |
| I: Human Advisory Marketplace | 10 | 48 |
| J: Discovery | 9 | 47 |
| K: Social & Sharing | 3 | 22 |
| L: Transaction | 7 | 38 |
| **M: Mutual Funds** | **4** | **36** |
| **Running Total** | **100** | **547** |

---

*Document Version 1.0 | February 2026 | StockFox Product Team*
