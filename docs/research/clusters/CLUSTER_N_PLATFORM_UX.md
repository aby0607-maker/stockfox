# Cluster N: Platform & UX

> **Category:** Platform & User Experience | **Features:** 5 | **Micro-features:** 42 | **Avg Strategic Score:** 16/25
> **Phase:** 1-5 (Progressive) | **Status:** N1, N5 Live

---

## Cluster Overview

| Attribute | Value |
|-----------|-------|
| **Cluster ID** | N |
| **Full Name** | Platform & User Experience |
| **Total Features** | 5 |
| **Total Micro-features** | 42 |
| **Primary Jobs** | FJ1, FJ4, EJ2, EJ4 |
| **Target Personas** | All personas (especially Curious Kavya, Transitioning Tanmay) |
| **Phase** | Progressive (N1, N5 Live; N2-N4 Future) |
| **Strategic Tier** | Tier 3 (Enabling Infrastructure) |

---

## Cluster Philosophy

### The Invisible Foundation

Platform & UX features are the **invisible foundation** that makes all other features usable. Users don't come to StockFox "for the UX" - they come for stock analysis. But **poor UX breaks trust instantly**.

**Core UX Principles for StockFox:**

1. **Progressive Disclosure**: Show simple first, reveal complexity on demand
2. **Plain English First**: No jargon without explanation
3. **Speed > Features**: Fast, reliable experience over feature bloat
4. **Mobile-First India**: 80%+ of users access via mobile
5. **Accessibility**: Financial education should be accessible to all

**The Doctor's Waiting Room Analogy:**
- A doctor's expertise matters most, but a dirty waiting room destroys confidence
- StockFox analysis is world-class; the platform must match that quality

---

## Feature Inventory

| ID | Feature | Micro-features | Strategic Score | Status | Phase |
|----|---------|----------------|-----------------|--------|-------|
| N1 | Guided Onboarding | 10 | 18 | **Live** | 1 |
| N2 | Vernacular Support | 9 | 15 | Planned | 5 |
| N3 | Mobile App Experience | 8 | 17 | Planned | 2-3 |
| N4 | Accessibility Features | 7 | 14 | Planned | 3-4 |
| N5 | Performance & Reliability | 8 | 16 | **Live** | 1 |
| **Total** | | **42** | **Avg: 16** | | |

---

## N1: Guided Onboarding (10 Micro-features)

> **Description:** Progressive onboarding that captures user profile while delivering immediate value
> **Strategic Score:** 18/25 | **Phase:** 1 | **Status:** Live

### Why This Feature Matters

First-time users have **high intent but low context**. A well-designed onboarding:
- Captures 6D profile for personalization
- Delivers first "aha moment" within 60 seconds
- Educates without overwhelming
- Builds trust through transparency

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| N1.1 | **Welcome Flow** | 3-step intro explaining what StockFox does and how | User understands the product value proposition immediately | FJ1, EJ4 |
| N1.2 | **Profile Quick-Capture** | Minimal questions to establish 6D profile (thesis, risk, horizon) | User gets personalized experience from first analysis | FJ1, EJ2, B1 |
| N1.3 | **First Stock Prompt** | "Which stock are you considering?" prompt to drive first analysis | User experiences core value within 60 seconds | FJ1, EJ4 |
| N1.4 | **Sample Analysis Demo** | Pre-loaded TCS/Axis Bank analysis user can explore | User sees what full analysis looks like before committing | FJ2, EJ4 |
| N1.5 | **Feature Tour Tooltips** | Contextual tooltips highlighting key features on first use | User discovers features naturally without tutorial overwhelm | FJ4, EJ4 |
| N1.6 | **Progressive Profile Building** | Additional profile questions surfaced after 2-3 analyses | User profile deepens without upfront friction | FJ4, EJ2, B1 |
| N1.7 | **Skip Options** | Every onboarding step skippable with "I'll explore myself" | Power users bypass without friction | EJ2 |
| N1.8 | **Onboarding Checkpoints** | Progress indicators showing onboarding completion | User sees progress and knows what's left | EJ4, EJ6 |
| N1.9 | **Personalization Preview** | Show how answers affect recommendations before finalizing | User understands why profile questions matter | FJ4, EJ2, EJ4 |
| N1.10 | **Return User Re-engagement** | Tailored re-entry for returning users who didn't complete onboarding | User picks up where they left off | FJ1, EJ4 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  WELCOME TO STOCKFOX                              [Skip →]      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  StockFox is your personal stock research analyst.              │
│  We analyze 200+ metrics so you don't have to.                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Let's personalize your experience (30 seconds)          │   │
│  │                                                          │   │
│  │  Step 1 of 3: What's your investing style?               │   │
│  │  ○ ○ ○                                                   │   │
│  │                                                          │   │
│  │  ┌─────────────────┐ ┌─────────────────┐                │   │
│  │  │   📈 GROWTH     │ │   💎 VALUE      │                │   │
│  │  │  Future gains   │ │  Undervalued    │                │   │
│  │  │  over dividends │ │  bargains       │                │   │
│  │  └─────────────────┘ └─────────────────┘                │   │
│  │                                                          │   │
│  │           ┌─────────────────┐                           │   │
│  │           │   🎯 BALANCED   │                           │   │
│  │           │  Mix of both    │                           │   │
│  │           └─────────────────┘                           │   │
│  │                                                          │   │
│  │  [← Back]                          [Continue →]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  💡 Why we ask: Your answers help us highlight what matters     │
│     most to YOU in each stock analysis.                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## N2: Vernacular Support (9 Micro-features)

> **Description:** Multi-language support for India's diverse linguistic landscape
> **Strategic Score:** 15/25 | **Phase:** 5 | **Complexity:** High

### Why This Feature Matters

Only **~10% of India speaks English** comfortably. To democratize stock analysis beyond metros, StockFox must speak users' languages. Vernacular support expands TAM by **5-10x**.

**Priority Languages (by speaker base + internet penetration):**
1. Hindi (largest)
2. Tamil
3. Telugu
4. Marathi
5. Bengali

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| N2.1 | **Language Selector** | Prominent language switch in settings and onboarding | User chooses preferred language | EJ2, EJ4 |
| N2.2 | **UI Translation (Hindi)** | All UI elements, buttons, labels in Hindi | Hindi speakers navigate without English | FJ1, FJ4, EJ4 |
| N2.3 | **Content Translation (Hindi)** | AI analysis, explanations, verdicts in Hindi | Hindi speakers understand analysis fully | FJ2, FJ4, EJ3, EJ4 |
| N2.4 | **South Indian Languages** | Tamil, Telugu, Kannada UI + content support | South Indian users access in mother tongue | FJ4, EJ2, EJ4 |
| N2.5 | **Regional Languages** | Marathi, Bengali, Gujarati support | Regional language speakers included | FJ4, EJ2 |
| N2.6 | **Mixed Language Support** | Handle Hinglish and code-mixing gracefully | User can type in mixed language and get response | FJ2, EJ2 |
| N2.7 | **Voice Input (Vernacular)** | Voice search/query in regional languages | User can speak instead of type | FJ2, EJ2, EJ4 |
| N2.8 | **Financial Term Glossary** | Translated financial terms with explanations | User learns terms in their language | FJ4, EJ3, EJ4 |
| N2.9 | **Auto-Detect Language** | Detect user's preferred language from device/browser | User gets right language without manual selection | EJ4 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  भाषा चुनें / Select Language                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ English  │  │  हिंदी    │  │  தமிழ்    │  │  తెలుగు   │       │
│  │   🇬🇧    │  │   🇮🇳    │  │   🇮🇳    │  │   🇮🇳    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  मराठी   │  │  বাংলা   │  │ ગુજરાતી  │                      │
│  │   🇮🇳    │  │   🇮🇳    │  │   🇮🇳    │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  एक्सिस बैंक विश्लेषण                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌──────────────┐   समग्र मूल्यांकन                             │
│  │              │   ━━━━━━━━━━━━━━━━━━━                         │
│  │    7.8/10    │   यह बैंक मजबूत वित्तीय स्थिति में है।          │
│  │  अच्छी खरीद   │   NPA कम है और CASA अनुपात स्वस्थ है।          │
│  │              │                                               │
│  └──────────────┘   📊 लाभप्रदता: 8.2/10                        │
│                     📈 विकास: 7.5/10                            │
│                     💰 मूल्यांकन: 7.1/10                         │
│                                                                 │
│  💡 यह क्या मतलब है?                                            │
│  ROE 16.2% का मतलब है कि बैंक शेयरधारकों के पैसे से              │
│  अच्छा रिटर्न कमा रहा है।                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## N3: Mobile App Experience (8 Micro-features)

> **Description:** Native mobile experience optimized for on-the-go stock research
> **Strategic Score:** 17/25 | **Phase:** 2-3 | **Complexity:** High

### Why This Feature Matters

**80%+ of Indian internet users** access via mobile. Current web app is responsive, but a dedicated mobile experience unlocks:
- Push notifications for alerts
- Offline access to saved analyses
- Biometric authentication
- Native performance

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| N3.1 | **Native iOS App** | Full-featured iOS app with native performance | iOS users get optimized experience | FJ1, EJ4, P4 |
| N3.2 | **Native Android App** | Full-featured Android app for majority of Indian users | Android users (85% of India) get native experience | FJ1, EJ4, P4 |
| N3.3 | **Push Notifications** | Real-time alerts for score changes, news, watchlist updates | User stays informed without opening app | FJ6, EJ1, F1-F8 |
| N3.4 | **Offline Mode** | View saved analyses and portfolio without internet | User accesses data in low-connectivity areas | FJ6, EJ2 |
| N3.5 | **Biometric Login** | Face ID / fingerprint authentication | User logs in securely without typing password | EJ2, Security |
| N3.6 | **Quick Actions (3D Touch/Widgets)** | Home screen widgets, quick actions for common tasks | User accesses frequently used features instantly | FJ1, EJ4, P4 |
| N3.7 | **Share Sheet Integration** | Share analysis to WhatsApp, email directly from iOS/Android | User shares with friends/family natively | SJ1, K1 |
| N3.8 | **Mobile-Optimized Charts** | Touch-friendly interactive charts with pinch-zoom | User explores data comfortably on small screens | FJ2, EJ4 |

### Visual Interface Sample

```
┌─────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓ 9:41 AM ▓▓▓▓▓▓▓▓▓▓▓▓▓    │
├─────────────────────────────────────────┤
│  🦊 StockFox                    🔔 3   │
├─────────────────────────────────────────┤
│                                         │
│  Good morning, Ankit!                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Search any stock...          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📊 YOUR WATCHLIST                      │
│  ─────────────────────────────────      │
│  ┌─────────────────────────────────┐   │
│  │ TCS          ₹3,842    +1.2%   │   │
│  │ Score: 9.1   ████████████████▎ │   │
│  ├─────────────────────────────────┤   │
│  │ Axis Bank    ₹1,124    -0.8%   │   │
│  │ Score: 7.8   █████████████▌    │   │
│  ├─────────────────────────────────┤   │
│  │ Zomato       ₹198      +2.4%   │   │
│  │ Score: 6.2   ██████████        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  🔔 RECENT ALERTS                       │
│  ─────────────────────────────────      │
│  ⚠️ Axis Bank score dropped 7.8→7.5    │
│  📰 TCS quarterly results tomorrow      │
│                                         │
├─────────────────────────────────────────┤
│  🏠     📊     🔍     📋     👤        │
│ Home  Analysis Discover Journal Profile │
└─────────────────────────────────────────┘
```

---

## N4: Accessibility Features (7 Micro-features)

> **Description:** Making StockFox usable for users with disabilities
> **Strategic Score:** 14/25 | **Phase:** 3-4 | **Complexity:** Medium

### Why This Feature Matters

**15% of the global population** has some form of disability. Financial literacy should be accessible to all. Accessibility also improves UX for everyone (e.g., high contrast helps in sunlight).

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| N4.1 | **Screen Reader Compatibility** | Full ARIA labels, semantic HTML for VoiceOver/TalkBack | Visually impaired users navigate and understand content | FJ1, FJ2, EJ2 |
| N4.2 | **High Contrast Mode** | Toggle for high contrast color scheme | Users with low vision or in bright environments see clearly | FJ2, EJ4 |
| N4.3 | **Font Size Controls** | Adjustable font sizes beyond browser defaults | Users with vision challenges read comfortably | FJ2, EJ4 |
| N4.4 | **Keyboard Navigation** | Full keyboard navigability without mouse | Users with motor disabilities navigate efficiently | FJ1, EJ2 |
| N4.5 | **Reduced Motion Mode** | Option to disable animations and transitions | Users with vestibular disorders avoid discomfort | EJ4 |
| N4.6 | **Color Blind Friendly Charts** | Charts use patterns + colors, not color alone | Color blind users distinguish data series | FJ2, EJ4 |
| N4.7 | **Voice Control Support** | Integrate with OS voice control features | Users with motor disabilities control via voice | FJ1, EJ2 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  ACCESSIBILITY SETTINGS                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  VISION                                                         │
│  ─────────────────────────────────────────────────────────      │
│  High Contrast Mode          [━━━━━━━━●] ON                    │
│  Font Size                   [─────●─────] Large               │
│  Color Blind Friendly Charts [━━━━━━━━●] ON                    │
│                                                                 │
│  MOTION                                                         │
│  ─────────────────────────────────────────────────────────      │
│  Reduce Motion               [━━━━●━━━━] ON                    │
│  Disable Auto-playing Media  [━━━━━━━━●] ON                    │
│                                                                 │
│  NAVIGATION                                                     │
│  ─────────────────────────────────────────────────────────      │
│  Enable Keyboard Shortcuts   [━━━━━━━━●] ON                    │
│  Focus Indicators            [━━━━━━━━●] Enhanced              │
│                                                                 │
│  PREVIEW (High Contrast Mode)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ██████████████████████████████████████████████████████ │   │
│  │ ██  TCS SCORE: 9.1/10 ████████████████████████████████ │   │
│  │ ██  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │   │
│  │ ██  91% Positive                                     ██ │   │
│  │ ██████████████████████████████████████████████████████ │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## N5: Performance & Reliability (8 Micro-features)

> **Description:** Fast, reliable platform that works even on slow connections
> **Strategic Score:** 16/25 | **Phase:** 1 | **Status:** Live

### Why This Feature Matters

In India:
- **Average mobile data speed:** 15 Mbps (varies widely)
- **2G/3G still common** in Tier 3+ cities
- **Patience threshold:** 3 seconds before abandonment

StockFox must be **fast everywhere** to serve all of India.

### Micro-features

| ID | Micro-feature | Description | Capability Enabled | JTBD |
|----|---------------|-------------|-------------------|------|
| N5.1 | **Sub-3s Page Load** | All pages load within 3 seconds on 3G | Users don't abandon due to slow loading | FJ1, EJ4, P4 |
| N5.2 | **Progressive Loading** | Show skeleton UI immediately, load data progressively | Users see progress while data loads | EJ4, P4 |
| N5.3 | **Smart Caching** | Cache frequently accessed data (scores, watchlist) locally | Users see instant results for repeat queries | FJ1, EJ4, P4 |
| N5.4 | **Image Optimization** | Compressed images, lazy loading, WebP format | Pages load fast even with visuals | EJ4, P4 |
| N5.5 | **Error Recovery** | Graceful degradation when APIs fail, with retry options | Users don't lose context on temporary failures | EJ2, EJ4 |
| N5.6 | **Uptime Monitoring** | 99.9% uptime target with status page | Users trust platform availability | EJ1, EJ2 |
| N5.7 | **Performance Analytics** | Track Core Web Vitals, identify slow pages | Team continuously improves performance | P4 (internal) |
| N5.8 | **Low Data Mode** | Option to reduce data usage by disabling non-essential assets | Users on limited data plans can use freely | EJ2, EJ4 |

### Visual Interface Sample

```
┌─────────────────────────────────────────────────────────────────┐
│  LOADING ANALYSIS...                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌──────────────┐   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  │   ░░░░░░░    │   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│  │   ░░░░░░░    │                                              │
│  │   ░░░░░░░    │   PROFITABILITY                              │
│  │              │   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│  └──────────────┘                                              │
│                     GROWTH                                      │
│  ░░░░░░░░░░░░░░░    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│  ░░░░░░░░░░░░░░░                                               │
│  ░░░░░░░░░░░░░░░    VALUATION                                  │
│                     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░           │
│                                                                 │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  45%       │
│  Fetching stock data...                                         │
└─────────────────────────────────────────────────────────────────┘

↓ 2 seconds later ↓

┌─────────────────────────────────────────────────────────────────┐
│  TCS ANALYSIS                                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                 │
│  ┌──────────────┐   OVERALL VERDICT                            │
│  │              │   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━           │
│  │    9.1/10    │   TCS is a high-quality blue chip with       │
│  │  STRONG BUY  │   consistent growth and strong fundamentals. │
│  │              │                                               │
│  └──────────────┘   📊 Profitability: 9.2/10                   │
│                     📈 Growth: 8.8/10                          │
│  Refreshed 2s ago   💰 Valuation: 8.1/10                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## JTBD Mapping Summary

### Functional Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| FJ1 | Help me decide if this stock is worth buying | N1.1-N1.4, N3.1-N3.2, N5.1-N5.3 |
| FJ2 | Help me understand WHY this stock is good/bad | N2.2-N2.8, N4.1-N4.3, N4.6 |
| FJ4 | Help me learn investing without taking a course | N1.5, N1.6, N1.9, N2.2-N2.8 |
| FJ6 | Help me stay updated on my holdings | N3.3, N3.4 |

### Emotional Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| EJ1 | Make me feel confident, not anxious | N3.3, N5.6 |
| EJ2 | Make me feel in control, not dependent | N1.7, N1.9, N2.1, N3.4-N3.5, N4.1, N4.4, N4.7, N5.5, N5.8 |
| EJ3 | Make me feel smart, not foolish | N2.3, N2.8 |
| EJ4 | Remove the feeling of being overwhelmed | All features (core UX goal) |
| EJ6 | Make me feel I'm making progress | N1.8 |

### Social Jobs Served

| Job ID | Job Statement | Features |
|--------|--------------|----------|
| SJ1 | Help me be seen as a knowledgeable investor | N3.7 (share to appear knowledgeable) |

---

## Dependencies Map

```
CLUSTER N DEPENDENCIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

N1 (Onboarding) ────────────► B1 (6D Personalization)
                              Captures initial profile

N2 (Vernacular) ────────────► All content features
                              Requires translation of all UI + content

N3 (Mobile App) ────────────► F1-F8 (Alerts)
                              Push notifications for alerts
                    │
                    └───────► K1-K3 (Social)
                              Native sharing integration

N4 (Accessibility) ─────────► All UI components
                              Cross-cutting concern

N5 (Performance) ──────────► All features
                              Foundational infrastructure

INTERNAL DEPENDENCIES:

N1 (Onboarding) is PREREQUISITE for:
├── B1 (Personalization) - captures profile
├── G7 (Watchlist) - first stock addition
└── All engagement features - user activation

N5 (Performance) is PREREQUISITE for:
├── N2 (Vernacular) - can't add languages to slow base
├── N3 (Mobile) - mobile users expect speed
└── All features - speed is table stakes
```

---

## Implementation Considerations

### Technology Stack

| Feature | Technology Options | Recommendation |
|---------|-------------------|----------------|
| N1 | React state, local storage | Implement with existing stack |
| N2 | i18n libraries (react-intl, next-intl) | Professional translation + AI assist |
| N3 | React Native / Flutter / Native | React Native for code sharing |
| N4 | ARIA, WAI-ARIA, axe-core testing | Built into component library |
| N5 | CDN, Redis caching, image CDN | CloudFlare + Vercel Edge |

### Phase Rationale

| Feature | Phase | Rationale |
|---------|-------|-----------|
| N1 | 1 | Critical for user activation, live now |
| N5 | 1 | Table stakes, live now |
| N3 | 2-3 | Mobile app after web is proven |
| N4 | 3-4 | Important but not blocking growth |
| N2 | 5 | Large investment, needs product maturity |

### Localization Complexity

| Language | UI Effort | Content Effort | Notes |
|----------|-----------|----------------|-------|
| Hindi | Medium | High | Largest impact, RTL considerations |
| Tamil | Medium | High | Complex script, technical vocabulary |
| Telugu | Medium | High | Complex script |
| Marathi | Low | Medium | Shares Devanagari with Hindi |
| Bengali | Medium | Medium | Different script |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Onboarding Completion | >60% | Funnel analytics |
| Profile Capture Rate | >70% complete 6D profile | Profile completeness |
| Time to First Analysis | <90 seconds | Event tracking |
| Mobile App Rating | >4.5 stars | App Store / Play Store |
| Page Load Time (P95) | <3 seconds | Core Web Vitals |
| Accessibility Score | >90 (Lighthouse) | Automated testing |
| Vernacular User Growth | 2x after launch | Regional user signups |

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
| M: Mutual Funds | 4 | 36 |
| **N: Platform & UX** | **5** | **42** |
| **Running Total** | **105** | **589** |

---

*Document Version 1.0 | February 2026 | StockFox Product Team*
