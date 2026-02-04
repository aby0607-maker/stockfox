# Cluster O: Monetization

> **Category:** Monetization & Pricing | **Features:** 6 | **Micro-features:** 48 | **Avg Strategic Score:** 14/25
> **Phase:** 1-4 (Progressive) | **Status:** O1-O2 Live

---

## Cluster Overview

| Attribute | Value |
|-----------|-------|
| **Cluster ID** | O |
| **Full Name** | Monetization & Pricing |
| **Total Features** | 6 |
| **Total Micro-features** | 48 |
| **Primary Jobs** | FJ1, EJ2, Business |
| **Target Personas** | All personas (conversion focus) |
| **Phase** | Progressive (O1-O2 Live; O3-O6 Future) |
| **Strategic Tier** | Tier 4 (Business Infrastructure) |

---

## Cluster Philosophy

### Monetization That Aligns with User Success

StockFox's monetization strategy must **never** conflict with user success. The pricing model should:

1. **Value-Aligned**: Users pay when they get value, not before
2. **Transparent**: No hidden fees, no bait-and-switch
3. **Accessible**: Premium features for serious investors, core analysis free
4. **Fair**: 500x cheaper than traditional advisors (₹99 vs ₹50K)

**The Doctor Pricing Analogy:**
- **Free checkup** (3 stocks free) → builds trust
- **Affordable treatment** (₹99/stock/year) → accessible to all
- **Specialist consultation** (Advisory) → premium for those who need it

### Revenue Model Overview

| Tier | Pricing | What User Gets | Target Segment |
|------|---------|----------------|----------------|
| Free | ₹0 | 3 stocks, full features | Trial / Casual |
| Per-Stock | ₹99/stock/year | Full DFY analysis per stock | Active researchers |
| Unlimited | ₹999/year | Unlimited stocks | Power users |
| Advisory | ₹500-15K/session | Human expert consultation | High-conviction decisions |

---

## Feature Inventory

| ID | Feature | Micro-features | Strategic Score | Status | Phase |
|----|---------|----------------|-----------------|--------|-------|
| O1 | Free Tier & Limits | 8 | 15 | **Live** | 1 |
| O2 | Per-Stock Pricing | 9 | 14 | **Live** | 1 |
| O3 | Subscription Plans | 10 | 15 | Planned | 2 |
| O4 | Advisory Revenue | 8 | 16 | Planned | 4 |
| O5 | Affiliate & Referral | 7 | 12 | Planned | 3 |
| O6 | Enterprise & API | 6 | 10 | Planned | 5 |
| **Total** | | **48** | **Avg: 14** | | |

---

## O1: Free Tier & Limits (8 Micro-features)

> **Description:** Generous free tier that demonstrates value before asking for payment
> **Strategic Score:** 15/25 | **Phase:** 1 | **Status:** Live

### Why This Feature Matters

The free tier is StockFox's **growth engine**. It must:
- Give enough value to demonstrate the product
- Create natural upgrade triggers (not artificial walls)
- Build trust before asking for money
- Enable word-of-mouth growth

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| O1.1 | **3 Free Stocks** | Users can analyze any 3 stocks with full features | User experiences complete product before paying | FJ1, FJ2, EJ1 |
| O1.2 | **Full Feature Access** | Free users get ALL features (no feature gating) | User evaluates real product, not limited version | FJ1, FJ2, EJ2 |
| O1.3 | **Free Stock Selector** | UI for choosing which 3 stocks to use free quota on | User controls their free allocation | EJ2 |
| O1.4 | **Free Tier Counter** | Visual display of "2 of 3 free stocks used" | User knows their remaining quota | EJ2, EJ4 |
| O1.5 | **Sample Analysis Access** | Pre-loaded analyses (TCS, Axis Bank, Zomato) don't count against quota | User can explore without spending free quota | FJ2, EJ4 |
| O1.6 | **Upgrade Prompts (Contextual)** | Non-intrusive prompts when user hits limit | User understands upgrade value at natural moment | Business |
| O1.7 | **Free Tier Renewal** | Free stocks reset annually / on conditions | Returning users can re-engage with free tier | FJ1, EJ2 |
| O1.8 | **Free Tier Expansion (Referral)** | Earn extra free stocks by referring friends | User gets value by sharing | SJ1, Business |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR FREE TIER                                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  FREE STOCKS USED: 2 of 3                                │   │
│  │  ████████████████████████░░░░░░░░░░░░                    │   │
│  │                                                          │   │
│  │  ✓ TCS (analyzed Jan 15)                                │   │
│  │  ✓ Axis Bank (analyzed Jan 18)                          │   │
│  │  ○ 1 free analysis remaining                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 SAMPLE ANALYSES (Don't count against quota)                │
│  ├── Explore TCS sample analysis                               │
│  ├── Explore Axis Bank sample analysis                         │
│  └── Explore Zomato sample analysis                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎁 Get 2 MORE free stocks!                              │   │
│  │  Share StockFox with a friend → Get 1 free stock each   │   │
│  │  [Share Now]                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Ready for unlimited? [See Pricing →]                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## O2: Per-Stock Pricing (9 Micro-features)

> **Description:** Pay-per-stock model for users who research specific stocks
> **Strategic Score:** 14/25 | **Phase:** 1 | **Status:** Live

### Why This Feature Matters

Per-stock pricing (₹99/stock/year) is StockFox's **core monetization**:
- Lowest barrier to entry (₹99 is impulse-buy territory)
- Value-aligned (pay only for stocks you actually research)
- 500x cheaper than traditional advisors

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| O2.1 | **₹99/Stock/Year Pricing** | Single stock analysis for one year at ₹99 | User pays only for what they need | FJ1, EJ2 |
| O2.2 | **Stock Pack Discounts** | 5-stock (₹399), 10-stock (₹699) bundles | User saves with bulk purchase | EJ2, Business |
| O2.3 | **One-Time Purchase Flow** | Simple checkout for individual stock | User buys without subscription commitment | EJ2 |
| O2.4 | **Payment Gateway Integration** | Razorpay/PayTM/UPI integration | User pays via preferred method | EJ2 |
| O2.5 | **Stock Validity Tracker** | Shows expiry date for each purchased stock | User knows when renewal is needed | EJ2, FJ6 |
| O2.6 | **Auto-Renewal Option** | Opt-in auto-renewal for purchased stocks | User doesn't lose access unexpectedly | EJ2, FJ6 |
| O2.7 | **Purchase History** | List of all purchased stocks with dates | User tracks their spending | EJ2 |
| O2.8 | **GST Invoice** | Downloadable GST-compliant invoice | User claims tax benefits if applicable | EJ2 |
| O2.9 | **Upgrade to Unlimited CTA** | When per-stock spend > subscription, suggest upgrade | User optimizes their spending | EJ2, Business |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  UNLOCK FULL ANALYSIS                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  HDFC BANK                                                      │
│  Get complete 11-segment DFY analysis for 1 year                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SINGLE STOCK                                            │   │
│  │  ₹99/year                                                │   │
│  │  ✓ Full 11-segment analysis                              │   │
│  │  ✓ 1 year of updates & alerts                            │   │
│  │  ✓ AI chat for this stock                                │   │
│  │  [Buy Now - ₹99]                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ─────────── OR SAVE WITH PACKS ───────────                    │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │  5-STOCK PACK    │  │  10-STOCK PACK   │                   │
│  │  ₹399 (₹80/each) │  │  ₹699 (₹70/each) │                   │
│  │  Save 20%        │  │  Save 30%        │                   │
│  │  [Buy Pack]      │  │  [Buy Pack]      │                   │
│  └──────────────────┘  └──────────────────┘                   │
│                                                                 │
│  💡 Researching many stocks? Get unlimited for ₹999/year       │
│                                                                 │
│  🔒 Secure payment via Razorpay | UPI | Cards | NetBanking     │
└─────────────────────────────────────────────────────────────────┘
```

---

## O3: Subscription Plans (10 Micro-features)

> **Description:** Subscription tiers for power users who research many stocks
> **Strategic Score:** 15/25 | **Phase:** 2 | **Complexity:** Medium

### Why This Feature Matters

Power users (analyzing 10+ stocks) benefit more from subscriptions:
- **₹999/year unlimited** vs buying 10+ stocks individually
- Predictable revenue for StockFox
- Higher LTV customers

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| O3.1 | **Unlimited Plan (₹999/year)** | Analyze any number of stocks for one year | Power user researches freely | FJ1, FJ8, EJ2 |
| O3.2 | **Monthly Option (₹149/month)** | Lower commitment monthly billing | User tries before annual commitment | EJ2 |
| O3.3 | **Plan Comparison Page** | Side-by-side comparison of Free vs Per-Stock vs Unlimited | User chooses right plan easily | EJ4 |
| O3.4 | **Annual vs Monthly Toggle** | Clear savings display for annual (₹999 vs ₹1788) | User sees value of annual commitment | EJ2, Business |
| O3.5 | **Trial Period (7-day)** | Try unlimited free for 7 days | User experiences full product before paying | FJ1, EJ2 |
| O3.6 | **Subscription Management** | Pause, cancel, upgrade/downgrade controls | User feels in control of subscription | EJ2 |
| O3.7 | **Renewal Reminders** | Email/notification before subscription renewal | User isn't surprised by charges | EJ2 |
| O3.8 | **Cancellation Flow** | Feedback collection + retention offers on cancel | Business retains users, learns reasons | Business |
| O3.9 | **Student/Educator Discount** | 50% off for verified students/educators | StockFox supports financial literacy | FJ4, EJ2, P5 |
| O3.10 | **Corporate Gifting** | Gift subscriptions to others | User gifts StockFox to friends/family | SJ1, SJ4 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  CHOOSE YOUR PLAN                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  [Monthly ○]  [Annual ●] ← Save 44%                            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    FREE     │  │  PER-STOCK  │  │  UNLIMITED  │            │
│  │             │  │             │  │   ⭐ BEST   │            │
│  │    ₹0       │  │ ₹99/stock   │  │ ₹999/year   │            │
│  │             │  │   /year     │  │  ₹83/month  │            │
│  │─────────────│  │─────────────│  │─────────────│            │
│  │ 3 stocks    │  │ Pay as you  │  │ Unlimited   │            │
│  │ Full        │  │ research    │  │ stocks      │            │
│  │ features    │  │             │  │             │            │
│  │             │  │ Best for    │  │ Best for    │            │
│  │ Best for    │  │ <10 stocks  │  │ 10+ stocks  │            │
│  │ trying out  │  │ /year       │  │ /year       │            │
│  │             │  │             │  │             │            │
│  │ [Current]   │  │ [Buy Stock] │  │ [Subscribe] │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  🎓 Student? Get 50% off → [Verify Student Status]             │
│                                                                 │
│  ✓ Cancel anytime  ✓ 7-day free trial  ✓ GST invoice           │
└─────────────────────────────────────────────────────────────────┘
```

---

## O4: Advisory Revenue (8 Micro-features)

> **Description:** Revenue from Human Advisory Marketplace (post-SEBI RA license)
> **Strategic Score:** 16/25 | **Phase:** 4 | **Dependencies:** SEBI RA License, I1-I10

### Why This Feature Matters

Advisory represents **highest ARPU opportunity**:
- ₹500-15K per consultation vs ₹99 per stock
- Serves users needing human validation
- Post-SEBI license (expected Jan 2026)

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| O4.1 | **Pay-Per-Consultation** | One-time payment (₹500-5K) for single consultation | User gets expert opinion on specific decision | FJ1, FJ7, EJ1 |
| O4.2 | **Advisor Subscription** | Monthly retainer (₹4K-15K) for ongoing access | User has dedicated advisor relationship | FJ1, FJ6, EJ1 |
| O4.3 | **Bundle Pricing** | 5-consultation packs at discounted rate | User commits to multiple sessions, saves money | EJ2, Business |
| O4.4 | **Platform Commission** | 20-30% platform fee on advisor earnings | StockFox monetizes marketplace | Business |
| O4.5 | **Advisor Payout System** | Automated payout to advisors (weekly/monthly) | Advisors receive timely payments | Business (Advisor) |
| O4.6 | **Escrow for Consultations** | Payment held until consultation delivered | User protected from no-shows | EJ2 |
| O4.7 | **Refund Policy** | Clear refund terms for unsatisfactory consultations | User feels safe paying upfront | EJ1, EJ2 |
| O4.8 | **Advisory Revenue Dashboard** | Analytics on advisory revenue for StockFox | Business tracks advisory performance | Business |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  BOOK CONSULTATION                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  VISHAL RAMPURIA                                                │
│  Elite Advisor | 17 years exp | Ex-Julius Baer                 │
│                                                                 │
│  CONSULTATION OPTIONS                                           │
│  ─────────────────────────────────────────────────────────      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SINGLE SESSION                                          │   │
│  │  30 min video call | Portfolio review + 3 stocks         │   │
│  │  ₹2,500                                                  │   │
│  │  [Book Now]                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  5-SESSION PACK                     ⭐ SAVE 20%          │   │
│  │  5 × 30 min sessions | Use within 6 months               │   │
│  │  ₹10,000 (₹2,000/session)                               │   │
│  │  [Buy Pack]                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MONTHLY RETAINER                                        │   │
│  │  Unlimited chat + 2 calls/month + Priority access        │   │
│  │  ₹8,000/month                                           │   │
│  │  [Subscribe]                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🔒 Money-back guarantee if unsatisfied                        │
│  📋 Includes AI pre-analysis report                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## O5: Affiliate & Referral (7 Micro-features)

> **Description:** Revenue sharing with partners and user referral rewards
> **Strategic Score:** 12/25 | **Phase:** 3 | **Complexity:** Medium

### Why This Feature Matters

Referral programs **reduce CAC** while increasing reach:
- Word-of-mouth is most trusted acquisition channel
- Affiliate partnerships with finfluencers expand reach
- Users who refer have higher retention

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| O5.1 | **User Referral Program** | Refer friend → Both get 1 free stock | User benefits from sharing | SJ1, SJ2, Business |
| O5.2 | **Referral Dashboard** | Track referrals, rewards earned, pending | User sees impact of their referrals | EJ2, EJ6 |
| O5.3 | **Unique Referral Link** | Personal link for sharing | User easily shares their unique link | SJ1 |
| O5.4 | **Affiliate Program** | Commission for finfluencers (10-20% revenue share) | Content creators monetize audience | Business |
| O5.5 | **Affiliate Dashboard** | Clicks, conversions, earnings tracking for affiliates | Affiliates track their performance | Business (Affiliate) |
| O5.6 | **Affiliate Payout** | Monthly payouts to affiliates | Affiliates receive timely commission | Business (Affiliate) |
| O5.7 | **Tiered Referral Rewards** | Higher rewards for super-referrers (5+ referrals) | Top referrers get additional benefits | SJ1, EJ6, Business |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  REFER & EARN                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  🎁 Give ₹50, Get ₹50                                          │
│  Share StockFox with friends. You both get rewards!             │
│                                                                 │
│  YOUR REFERRAL LINK                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ stockfox.in/r/ankit2847                      [Copy 📋]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Share on WhatsApp]  [Share on Twitter]  [Share via Email]    │
│                                                                 │
│  YOUR REFERRAL STATS                                            │
│  ─────────────────────────────────────────────────────────      │
│  │ Clicks:      47                                             │
│  │ Sign-ups:    12                                             │
│  │ Conversions: 5                                              │
│  │ Earned:      ₹250 (5 free stock credits)                   │
│  │ Tier:        SILVER (2 more for GOLD)                      │
│                                                                 │
│  RECENT REFERRALS                                               │
│  ├── Rahul K. signed up (Jan 20) - ₹50 earned ✓               │
│  ├── Priya M. signed up (Jan 18) - Pending first purchase      │
│  └── Amit S. signed up (Jan 15) - ₹50 earned ✓                │
│                                                                 │
│  TIER BENEFITS                                                  │
│  ├── SILVER (5+ referrals): 1 bonus free stock                 │
│  ├── GOLD (10+ referrals): 3 bonus free stocks + early access  │
│  └── PLATINUM (25+): Free unlimited for 1 year                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## O6: Enterprise & API (6 Micro-features)

> **Description:** B2B offerings for financial institutions and developers
> **Strategic Score:** 10/25 | **Phase:** 5 | **Complexity:** High

### Why This Feature Matters

Enterprise/API represents **long-term revenue diversification**:
- B2B contracts have higher LTV
- API licensing is passive income
- White-label builds brand in B2B

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| O6.1 | **API Access (Developer)** | REST API for stock scores, analysis | Developers build on StockFox data | Business (B2B) |
| O6.2 | **API Pricing Tiers** | Free (100 calls/day), Pro (10K calls), Enterprise (unlimited) | Developers choose based on volume | Business (B2B) |
| O6.3 | **White-Label Solution** | StockFox analysis under partner branding | Banks/brokers offer StockFox-powered analysis | Business (B2B) |
| O6.4 | **Enterprise Dashboard** | Admin portal for enterprise clients | Enterprise clients manage their usage | Business (B2B) |
| O6.5 | **Custom Integration Support** | Dedicated support for enterprise integrations | Enterprise clients get hands-on help | Business (B2B) |
| O6.6 | **Data Licensing** | License historical scores data for research | Research firms access historical data | Business (B2B) |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  STOCKFOX API                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  Build with institutional-grade stock analysis                  │
│                                                                 │
│  ENDPOINTS                                                      │
│  ─────────────────────────────────────────────────────────      │
│  GET /v1/stocks/{symbol}/score     → Overall score + verdict   │
│  GET /v1/stocks/{symbol}/segments  → 11-segment breakdown      │
│  GET /v1/stocks/{symbol}/metrics   → 200+ metrics              │
│  GET /v1/compare?stocks=X,Y,Z      → Side-by-side comparison   │
│                                                                 │
│  PRICING                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │    FREE      │ │     PRO      │ │  ENTERPRISE  │           │
│  │              │ │              │ │              │           │
│  │  100 calls   │ │  10K calls   │ │  Unlimited   │           │
│  │   /day       │ │   /day       │ │              │           │
│  │              │ │              │ │              │           │
│  │    ₹0       │ │ ₹4,999/mo    │ │   Custom     │           │
│  │              │ │              │ │              │           │
│  │ [Get Key]    │ │ [Subscribe]  │ │ [Contact]    │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                 │
│  🏢 WHITE-LABEL SOLUTION                                       │
│  Offer StockFox analysis to your customers under your brand.   │
│  [Request Demo →]                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## JTBD Mapping Summary

### Functional Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| FJ1 | Help me decide if this stock is worth buying | O1.1-O1.2, O2.1-O2.3, O3.1, O4.1 |
| FJ4 | Help me learn investing without taking a course | O3.9 (student discount) |
| FJ6 | Help me stay updated on my holdings | O2.5, O4.2 |
| FJ7 | Help me verify tips before acting | O4.1 |
| FJ8 | Help me find new investment opportunities | O3.1 (unlimited access) |

### Emotional Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| EJ1 | Make me feel confident, not anxious | O1.1, O4.1-O4.2, O4.7 |
| EJ2 | Make me feel in control, not dependent | O1.2-O1.4, O2.1-O2.8, O3.2-O3.8, O4.6-O4.7 |
| EJ4 | Remove the feeling of being overwhelmed | O1.5, O3.3 |
| EJ6 | Make me feel I'm making progress | O5.2, O5.7 |

### Social Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| SJ1 | Help me be seen as a knowledgeable investor | O5.1-O5.3, O5.7 |
| SJ2 | Help me belong to a community | O5.1 |
| SJ4 | Help me gain respect from family | O3.10 (gifting) |

---

## Dependencies Map

```
CLUSTER O DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O1 (Free Tier) ─────────────► All features
                              Foundation for user acquisition

O2 (Per-Stock) ─────────────► A1-A14 (Stock Analysis)
                              Pricing tied to analysis access

O3 (Subscriptions) ─────────► O2 (Per-Stock)
                              Upgrade path from per-stock

O4 (Advisory Revenue) ──────► I1-I10 (Advisory Marketplace)
                              SEBI RA License required

O5 (Referral) ──────────────► N3 (Mobile App)
                              Native sharing for better conversion

O6 (Enterprise) ────────────► A1-A14 (Stock Analysis)
                              API exposes analysis capabilities

EXTERNAL DEPENDENCIES:

Payment Gateway ────────────► O2, O3, O4
                              Razorpay/PayTM integration

SEBI RA License ────────────► O4
                              Required for advisory revenue
                              (Expected Jan 2026)

GST Compliance ─────────────► O2, O3, O4
                              Invoice generation
```

---

## Revenue Projections (Illustrative)

### Per-User Revenue Model

| User Segment | % of Users | Annual Revenue/User | Notes |
|--------------|------------|---------------------|-------|
| Free (never converts) | 50% | ₹0 | Growth driver |
| Per-Stock (1-3 stocks) | 25% | ₹150 | Low commitment |
| Per-Stock (4-9 stocks) | 15% | ₹500 | Active researchers |
| Unlimited Subscription | 8% | ₹999 | Power users |
| Advisory User | 2% | ₹5,000 | High-touch |
| **Blended ARPU** | | **₹310** | |

### Year 1-3 Revenue Trajectory

| Year | Users | Paying % | Revenue |
|------|-------|----------|---------|
| Year 1 | 50,000 | 15% | ₹23L |
| Year 2 | 200,000 | 20% | ₹1.2Cr |
| Year 3 | 500,000 | 25% | ₹4Cr |

---

## Implementation Considerations

### Payment Infrastructure

| Component | Provider | Notes |
|-----------|----------|-------|
| Payment Gateway | Razorpay | UPI, cards, netbanking |
| Subscription Management | Razorpay Subscriptions | Recurring billing |
| Invoicing | Zoho Invoice / Custom | GST compliant |
| Affiliate Tracking | FirstPromoter / Custom | Conversion attribution |

### Compliance Requirements

| Requirement | Status | Notes |
|-------------|--------|-------|
| GST Registration | ✓ Required | Invoice generation |
| SEBI RA License | Pending (Jan 2026) | Advisory revenue |
| Payment Compliance | Via Razorpay | PCI DSS handled |
| Terms of Service | Required | Legal protection |

### Pricing Experimentation

| Test | Hypothesis | Metrics |
|------|------------|---------|
| Free tier (3 vs 5 stocks) | 5 stocks increases conversion | Conversion rate |
| Per-stock (₹79 vs ₹99 vs ₹129) | ₹99 optimal price point | Revenue per user |
| Annual vs monthly default | Annual as default increases LTV | Annual subscription % |

---

## Success Metrics

| Metric | Target (Year 1) | Measurement |
|--------|-----------------|-------------|
| Free-to-Paid Conversion | >15% | Payment events |
| Per-Stock to Subscription Upgrade | >20% | Upgrade funnel |
| Monthly Churn (Subscription) | <5% | Cancellations |
| ARPU | ₹300+ | Revenue / Active Users |
| LTV:CAC Ratio | >3:1 | Cohort analysis |
| Referral Contribution | >20% of new users | Attribution |

---

## Running Total (FINAL)

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
| M: Mutual Funds | 4 | 36 |
| N: Platform & UX | 5 | 42 |
| **O: Monetization** | **6** | **48** |
| **GRAND TOTAL** | **111** | **637** |

---

*Document Version 1.0 | February 2026 | StockFox Product Team*
