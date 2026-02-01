# Multibagg AI Stock Detail Page - Complete Product Architecture

> **Document Type:** Competitor Product Analysis
> **Company:** Multibagg AI
> **Reference Stock:** Bharti Airtel Ltd (BHARTIARTL)
> **Document Date:** January 2026
> **Purpose:** Reference guide for StockFox stock detail page development

---

## Table of Contents

1. [Executive Summary](#i-executive-summary)
2. [Global Header & Navigation](#ii-global-header--navigation-structure)
3. [Page Header Section](#iii-page-header-section-stock-specific)
4. [Investment Checklist](#iv-investment-checklist-component)
5. [Interactive Price Chart](#v-interactive-price-chart-section)
6. [Main Navigation Tabs](#vi-main-navigation-tabs-11-sections)
7. [Overview Section](#vii-overview-section-detailed)
8. [Technicals Section](#viii-technicals-section)
9. [Forecasts Section](#ix-forecasts-section)
10. [Peers Section](#x-peers-section)
11. [Financial Statements](#xi-financial-statements-section)
12. [Shareholdings Section](#xii-shareholdings-section)
13. [Projection Section](#xiii-projection-section)
14. [Actions Section](#xiv-actions-section)
15. [Announcements Section](#xv-announcements-section)
16. [News Section](#xvi-news-section)
17. [Documents Section](#xvii-documents-section)
18. [Engagement Features](#xviii-engagement--special-features)
19. [Design & UX Patterns](#xix-design--ux-patterns)
20. [Data Refresh & Real-Time Updates](#xx-data-refresh--real-time-updates)
21. [Competitor Recommendations](#xxi-competitor-product-recommendations)
22. [Page Load Performance](#xxii-page-load-performance-insights)

---

## I. EXECUTIVE SUMMARY

### Product Overview

The Multibagg AI stock detail page represents a sophisticated investment research platform combining real-time market data, AI-powered analysis, and comprehensive fundamental research tools. The page is designed for retail investors seeking quick assessments and deep-dive analysis in a unified interface.

### Key Features & Strategic Positioning

| Feature | Description |
|---------|-------------|
| Quick Investment Assessment | Investment Checklist provides instant visual feedback across 6 key criteria |
| AI-Powered Intelligence | "Ask AI" feature strategically placed throughout the page |
| Comprehensive Data | 11 distinct content sections consolidating data from 5+ typical tools |

### Core User Value Propositions

1. **Quick Investment Assessment** - The Investment Checklist provides instant visual feedback across 6 key criteria, enabling users to make faster investment decisions without scrolling through extensive data
2. **AI-Powered Intelligence** - The "Ask AI" feature is strategically placed throughout the page, providing contextual AI analysis at multiple touch points
3. **Comprehensive Data Repository** - 11 distinct content sections provide everything from technical analysis to financial statements to news aggregation

### Information Architecture Philosophy

The page follows a **progressive disclosure pattern**: above-the-fold elements provide quick answers, while the tabbed interface offers deeper dives. This respects user intent variations—some users want a 2-minute assessment, others need 20 minutes of detailed analysis.

---

## II. GLOBAL HEADER & NAVIGATION STRUCTURE

### Top Navigation Bar Components

#### 1. Logo & Branding
- **Location:** Far left
- **Function:** Clickable link to homepage, establishes brand identity
- **Design:** Multibagg logo with distinctive styling

#### 2. Search Bar
- **Location:** Center-left
- **Placeholder Text:** "Search or Ask Iris"
- **Keyboard Shortcut:** Cmd+K (Mac) / Ctrl+K (Windows)
- **Purpose:** Global site search and access to Iris (AI chat assistant)

#### 3. Global Navigation Menu
- **Location:** Center
- **Items:**
  - **Ask Iris** - Direct link to AI chat
  - **Dashboard** - User's personal dashboard
  - **Portfolio** - User's stock holdings
  - **Discovery** - Stock discovery/screening tools
  - **Timeline** - Activity feed or historical view
  - **Toolkit** - Additional tools dropdown menu

#### 4. User Profile Section
- **Location:** Far right
- **Components:**
  - User avatar image
  - Username display
  - Badge/status indicator (e.g., "Pro" or achievement badge)
  - Dropdown menu for account settings

#### 5. Theme Toggle
- **Location:** Right side, before user profile
- **Purpose:** Switch between light and dark mode
- **Design:** Icon button (sun/moon icon)

### Design Characteristics
- **Fixed Positioning:** Sticky to viewport top at all times
- **Theme:** Dark background with high contrast for navigation items
- **Responsive:** Collapses to mobile menu on smaller screens

---

## III. PAGE HEADER SECTION (STOCK-SPECIFIC)

### A. Breadcrumb Navigation
- **Path:** Home > All Stocks > [Company Name]
- **Purpose:** Contextual navigation and SEO optimization

### B. Stock Information Header

#### Left Column
| Element | Description |
|---------|-------------|
| Company Logo | 48x48px circular logo |
| Company Name | H1 heading, large bold (e.g., "Bharti Airtel Ltd") |
| Ticker Symbol | Secondary text (e.g., "BHARTIARTL") |

#### Center-Left Column
| Element | Description |
|---------|-------------|
| Current Price | Large display, 32-48px font (e.g., "₹1968.10") |
| Price Change | Color-coded with arrow (e.g., "▲ 0.00 (0.00%)") |

#### Center-Right Column (Key Metrics)
| Metric | Example |
|--------|---------|
| Market Cap | ₹11,84,048 Cr |
| P/E Ratio | 35.49 |

#### Right Column (CTAs)
| Button | Description |
|--------|-------------|
| Watchlist Button | Icon + text, toggles add/remove from watchlist |
| Ask AI Button | **PRIMARY CTA** - Purple accent color, positioned top-right, highest visual hierarchy |

### C. Social Proof Element
- **Content:** "Turned 1L into 3.34L in last 5 Years"
- **Purpose:** Emotional appeal and social proof of stock performance
- **Visual:** Light bulb or star icon in gold/yellow, highlighted box

---

## IV. INVESTMENT CHECKLIST COMPONENT

### Component Overview & Purpose

The Investment Checklist is a **game-changing feature** that provides instant visual assessment of a stock across 6 critical investment criteria. Rather than requiring users to digest pages of data, this component delivers an at-a-glance verdict through color-coded status indicators.

> **Strategic Value:** Reduces decision-making time from 20 minutes to 20 seconds while maintaining credibility through data-driven assessments.

### Six Evaluation Criteria

#### 1. PERFORMANCE
**Icon:** Chart/trending icon
**Definition:** How the stock performs relative to its peers and market expectations

| Status | Color | Definition |
|--------|-------|------------|
| Under Performer | 🔴 Red | The stock has consistently delivered below-average returns compared to its industry or benchmark |
| Steady Performer | ⚪ Neutral | Reliable and consistent in performance, meeting average market expectations |
| Market Leader | 🟢 Green | Outperforms its peers and dominates its industry with strong metrics |

#### 2. VALUATION
**Icon:** Price tag/calculator icon
**Definition:** Whether the stock is priced fairly relative to its intrinsic value

| Status | Color | Definition |
|--------|-------|------------|
| Overvalued | 🔴 Red | Stock is trading above its fair value based on fundamentals |
| Reasonable | ⚪ Neutral | Stock is trading at or near its fair value |
| Undervalued | 🟢 Green | Stock is trading below its intrinsic value, potential upside |

#### 3. GROWTH
**Icon:** Upward arrow/growth chart icon
**Definition:** Company's ability to grow revenue, earnings, and market share

| Status | Color | Definition |
|--------|-------|------------|
| Sluggish | 🔴 Red | Slow or declining growth in key metrics |
| Stable | ⚪ Neutral | Consistent but moderate growth |
| Exceptional | 🟢 Green | Strong, above-average growth trajectory |

#### 4. PROFITABILITY
**Icon:** Money/percentage icon
**Definition:** Company's ability to generate profits from operations

| Status | Color | Definition |
|--------|-------|------------|
| Low Margin | 🔴 Red | Poor profit margins compared to peers |
| Moderate Margin | ⚪ Neutral | Average profitability for the sector |
| High Margin | 🟢 Green | Excellent profit margins, efficient operations |

#### 5. TECHNICALS
**Icon:** Chart pattern icon
**Definition:** Technical analysis signals from price and volume patterns

| Status | Color | Definition |
|--------|-------|------------|
| Bearish | 🔴 Red | Technical indicators suggest downward pressure |
| Neutral | ⚪ Neutral | Mixed or sideways technical signals |
| Bullish | 🟢 Green | Technical indicators suggest upward momentum |

#### 6. RISK
**Icon:** Shield/warning icon
**Definition:** Overall risk assessment considering various factors

| Status | Color | Definition |
|--------|-------|------------|
| High Risk | 🔴 Red | Significant risk factors present |
| Moderate Risk | ⚪ Neutral | Balanced risk profile |
| Low Risk | 🟢 Green | Minimal risk factors, stable investment |

### Checklist Legend Modal
- Definition descriptions for each status
- Help documentation accessible via "?" icon
- Explanations of how each criterion is calculated

---

## V. INTERACTIVE PRICE CHART SECTION

### A. Chart Component

| Feature | Description |
|---------|-------------|
| Chart Type | Candlestick chart with OHLC data |
| Volume Overlay | Bar chart showing trading volume below price |
| Event Markers | Visual indicators for dividends, earnings, splits |
| Interactive | Hover tooltips with detailed data |

### B. Chart Controls

| Control | Function |
|---------|----------|
| Price View Toggle | Show raw price data |
| PE Ratio View Toggle | Show price-to-earnings ratio over time |

### C. Time Period Selectors

| Period | Description |
|--------|-------------|
| 1D | 1 Day - Intraday view |
| 1M | 1 Month |
| 3M | 3 Months |
| 1Y | 1 Year |
| 3Y | 3 Years |
| 5Y | 5 Years |
| 10Y | 10 Years |

Each period displays the **return percentage** for that timeframe.

---

## VI. MAIN NAVIGATION TABS (11 SECTIONS)

### Tab Structure
- **Fixed Positioning:** Sticky below header when scrolling
- **Visual:** Active tab highlighted with accent color
- **Behavior:** Smooth scroll to section on click

### Complete Tab List

| # | Tab Name | Purpose |
|---|----------|---------|
| 1 | Overview | Company summary, key metrics, growth data |
| 2 | Technicals | Technical analysis with oscillators and moving averages |
| 3 | Forecast | Analyst estimates and price targets |
| 4 | Peers | Competitive comparison table and charts |
| 5 | Financials | Quarterly results, P&L, Balance Sheet, Cash Flows |
| 6 | Shareholdings | Ownership pattern and history |
| 7 | Projection | EPS and revenue projections |
| 8 | Actions | Dividend history and corporate actions |
| 9 | Announcements | Regulatory filings and company announcements |
| 10 | News | Latest news articles with sentiment |
| 11 | Documents | Presentations, concalls, reports |

---

## VII. OVERVIEW SECTION (DETAILED)

### A. Section Header
- "Detailed Summary" link for expanded view
- Collapsible/expandable behavior

### B. Company Description Cards (4-Column Grid)

| Card | Content |
|------|---------|
| General Company Information | Company history, business description, headquarters |
| Strategic Initiatives | Current strategic focus areas, expansion plans |
| Technology & Innovation | R&D activities, tech investments, patents |
| Business Strength & Order Books | Order pipeline, customer contracts, market position |

### C. Quick Metrics Cards

| Metric | Example |
|--------|---------|
| Sector | Telecom |
| Industry | Wireless Services |
| Market Cap | ₹11,84,048 Cr |
| Volatility | Low/Medium/High |
| P/E Ratio | 35.49 |
| PEG Ratio | 1.2 |
| P/B Ratio | 5.6 |
| 52W High | ₹1778 |
| 52W Low | ₹1200 |

### D. Growth Metrics Section (4 Cards)

#### Sales CAGR
| Period | Value |
|--------|-------|
| 1Y | X% |
| 3Y | X% |
| 5Y | X% |
| 10Y | X% |

#### Profit CAGR
| Period | Value |
|--------|-------|
| 1Y | X% |
| 3Y | X% |
| 5Y | X% |
| 10Y | X% |

#### ROE - Return on Equity
| Period | Value |
|--------|-------|
| TTM | X% |
| 3Y | X% |
| 5Y | X% |
| 10Y | X% |

#### ROCE - Return on Capital Employed
| Period | Value |
|--------|-------|
| TTM | X% |
| 3Y | X% |
| 5Y | X% |
| 10Y | X% |

---

## VIII. TECHNICALS SECTION

### A. Technical Analysis Overview
Three-column layout with gauge charts

### B. Three Analysis Components

#### 1. Oscillators
- **Display:** Semi-circular gauge chart
- **Distribution:** Bullish / Neutral / Bearish percentage
- **Indicators included:** RSI, MACD, Stochastic, etc.

#### 2. Overall Sentiment
- **Display:** Semi-circular gauge chart
- **Verdict:** Buy / Neutral / Sell recommendation
- **Aggregation:** Combined signal from all indicators

#### 3. Moving Averages
- **Display:** Semi-circular gauge chart
- **Distribution:** Above MA / At MA / Below MA
- **Timeframes:** Short-term, medium-term, long-term MAs

### C. Call-to-Action
"View Detailed Analysis" button for expanded technical view

---

## IX. FORECASTS SECTION

### A. Analyst Metrics

| Metric | Description |
|--------|-------------|
| Number of Analysts | Count of analysts covering the stock |
| 1Y Price Target | Consensus target with upside % |

### B. Q4 Estimates

| Metric | Description |
|--------|-------------|
| EPS Estimate | Earnings per share estimate with change % |
| Revenue Estimate | Revenue estimate with change % |

### C. Analyst Rating Distribution

| Rating | Display |
|--------|---------|
| Strong Buy | Count |
| Buy | Count |
| Hold | Count |
| Sell | Count |
| Strong Sell | Count |

### D. Projection Table

| Metric | Average | Max | Min |
|--------|---------|-----|-----|
| 1Y Price Target | ₹XXX | ₹XXX | ₹XXX |
| Q4 EPS Estimate | ₹XX | ₹XX | ₹XX |
| Q4 Revenue Estimate | ₹XXX Cr | ₹XXX Cr | ₹XXX Cr |

---

## X. PEERS SECTION

### A. Peer Comparison Table

#### Column Structure
| Column | Description |
|--------|-------------|
| Symbol | Stock ticker |
| Price | Current price |
| Market Cap | Market capitalization |
| P/E | Price to earnings ratio |
| P/B | Price to book ratio |
| Div Yield | Dividend yield % |
| ROE | Return on equity |
| ROCE | Return on capital employed |
| ROA | Return on assets |

#### Features
- Data for 7+ comparable companies
- Action buttons per row (Info, Edit, Download)
- Sortable columns
- Highlight current stock row

### B. Price Comparison Chart
- Multi-line historical chart
- Legend with toggle switches for each peer
- Date range visualization
- Normalized or absolute price view toggle

---

## XI. FINANCIAL STATEMENTS SECTION

### A. AI-Powered Summary Component
- Feature description highlighting AI capabilities
- "Ask AI" button integration for financial analysis
- Contextual prompts for common financial questions

### B. Consolidated Quarterly Results Table

| Feature | Description |
|---------|-------------|
| Data Range | 10+ quarters |
| View Options | Total Figures vs YoY Changes toggle |

#### Row Items
- Sales
- Expenses
- Operating Profit
- OPM %
- Other Income
- Interest
- Depreciation
- Profit Before Tax
- Tax %
- Net Profit
- EPS

### C. Consolidated Profit & Loss Statement

| Feature | Description |
|---------|-------------|
| Data Range | Multi-year historical (Mar 2017 - Present) |
| TTM Data | Trailing Twelve Months included |

### D. Consolidated Balance Sheet

| Section | Items |
|---------|-------|
| Assets | Fixed Assets, Current Assets, Investments, etc. |
| Liabilities | Current Liabilities, Long-term Debt, etc. |
| Equity | Share Capital, Reserves, Retained Earnings |

### E. Consolidated Cash Flows

| Category | Description |
|----------|-------------|
| Operating Cash Flow | Cash from core operations |
| Investing Cash Flow | Capital expenditure, investments |
| Financing Cash Flow | Debt, equity, dividends |
| Net Cash Flow | Total change in cash |

---

## XII. SHAREHOLDINGS SECTION

### A. Shareholding Pattern (Dual Pie Charts)

#### Main Distribution Chart
| Category | Example % |
|----------|-----------|
| Promoters | 55% |
| FIIs | 25% |
| DIIs | 15% |
| Others | 5% |

#### Promoters Holding Breakdown
| Category | Example % |
|----------|-----------|
| Unpledged Holding | 95% |
| Pledged Holding | 5% |

### B. Shareholding History Table

| Feature | Description |
|---------|-------------|
| Data Range | Quarterly data spanning multiple years |
| View Toggle | Quarterly vs Yearly |

#### Category Rows
- Promoters %
- FIIs %
- DIIs %
- Public %
- Total Shareholders Count

### C. Market Transactions Section

| Feature | Description |
|---------|-------------|
| Filterable | Search and filter transactions |
| Pagination | Paginated results |

#### Column Structure
| Column | Description |
|--------|-------------|
| Date | Transaction date |
| Company | Company name |
| Category | Promoter/Insider type |
| Action | Acquisition (Green) / Sell (Red) |
| Price | Transaction price |
| Value | Total value |
| Shares | Number of shares |
| % | Percentage of holdings |

---

## XIII. PROJECTION SECTION

### A. EPS Projections
- **Chart:** Dual-bar chart (Actual vs Estimated)
- **Time Period:** Historical + Forward looking
- **Data Table:** Includes Surprise % (Actual vs Estimated variance)

### B. Revenue Projections
- Similar chart structure to EPS
- Revenue values displayed in Crores
- Historical actuals + analyst estimates

---

## XIV. ACTIONS SECTION

### A. Dividend History

#### Card Layout for Each Dividend
| Field | Description |
|-------|-------------|
| Amount | Dividend per share (e.g., ₹5.00) |
| Type | Interim / Final / Special |
| Ex Date | Ex-dividend date |
| Record Date | Record date |
| Announcement Date | Declaration date |

### B. Filters
- Date range selector
- Action type dropdown (Dividends, Splits, Bonus)
- Sorting options (Newest, Oldest, Highest)

---

## XV. ANNOUNCEMENTS SECTION

### A. Announcement Cards (3-Column Grid)

| Element | Description |
|---------|-------------|
| Category Label | With icon (e.g., Earnings, AGM, Regulatory) |
| Timestamp | Date and time |
| Title | Announcement headline |
| Description | Brief summary |
| Sentiment Indicator | Positive/Negative/Neutral badge |
| Bookmark Icon | Save for later |

### B. Filters (Top-Right)
- Time filter: "Last 7 days", "Last 30 days", etc.
- Sort order: "Newest", "Oldest"
- Sentiment filter: All, Positive, Negative, Neutral

---

## XVI. NEWS SECTION

### A. News Cards (2-3 Column Grid)

| Element | Description |
|---------|-------------|
| Source Logo | News outlet logo |
| Timestamp | Publication date/time |
| Headline | Article title |
| Summary | Brief excerpt |
| Sentiment Indicator | AI-determined sentiment |
| Bookmark Icon | Save for later |

### B. Filters
- Time filter
- Sort order
- Sentiment filter
- Source filter

---

## XVII. DOCUMENTS SECTION

### A. Document Category Tabs

| Tab | Content |
|-----|---------|
| Presentations | Investor presentations, quarterly decks |
| Concalls | Conference call transcripts |
| Reports | Annual reports, credit ratings |

### B. Document Cards (4-Column Grid)

| Element | Description |
|---------|-------------|
| Document Icon | PDF/PPT icon based on type |
| Document Name | File name |
| Metadata | Quarter/Year information |
| Action Buttons | Lock (premium), Share, Bookmark |

---

## XVIII. ENGAGEMENT & SPECIAL FEATURES

### A. Ask AI Feature

#### Placement Strategy
| Location | Description |
|----------|-------------|
| Primary CTA | Top-right of page header |
| Secondary Placements | Within content sections (Financials, Overview) |
| Contextual | Relevant prompts based on section |

#### Styling & Visual Hierarchy
- Purple/violet accent color
- High contrast button
- Sparkle/AI icon
- Prominent size (larger than secondary buttons)

#### Functionality Overview
- Stock-specific Q&A
- Financial analysis assistance
- Plain English explanations
- Citation of data sources

### B. Watchlist Feature

| Aspect | Description |
|--------|-------------|
| Placement | Page header, right of stock info |
| Toggle | Add/Remove from watchlist |
| Visual | Filled/outlined star or heart icon |
| Feedback | Toast notification on action |

### C. Share/Export Features

| Feature | Description |
|---------|-------------|
| Download Buttons | Export tables as CSV/Excel |
| Share Functionality | Share stock page link |
| Copy-to-Clipboard | Quick copy of key metrics |

---

## XIX. DESIGN & UX PATTERNS

### A. Color Scheme

| Usage | Color | Hex (Approximate) |
|-------|-------|-------------------|
| Primary | Purple/Violet | #7C3AED |
| Success/Positive | Green | #10B981 |
| Danger/Negative | Red | #EF4444 |
| Neutral | Gray | #6B7280 |
| Background | Dark Blue | #1A1A2E |
| Accent | Gold/Yellow | #F59E0B |

### B. Typography Hierarchy

| Level | Usage | Size |
|-------|-------|------|
| H1 | Company Name | 32-48px |
| H2 | Section Titles | 24-32px |
| H3 | Subsection Titles | 18-24px |
| Body | Regular text | 14-16px |
| Small | Labels, captions | 12px |

### C. Component Patterns

#### Card Component Structure
- Rounded corners (8-12px radius)
- Subtle shadow or border
- Consistent padding (16-24px)
- Optional header with icon

#### Button Styling
- Primary: Filled with accent color
- Secondary: Outlined
- Ghost: Text only with hover state

#### Table Display
- Alternating row colors
- Fixed header on scroll
- Sortable columns with indicators
- Hover highlighting

#### Chart Styling
- Consistent color palette
- Legend with toggles
- Tooltip on hover
- Responsive sizing

#### Modal Structure
- Centered overlay
- Close button (X)
- Clear title
- Action buttons at bottom

### D. Responsive Design Breakpoints

| Breakpoint | Description |
|------------|-------------|
| Desktop | 1920px+ - Full layout |
| Laptop | 1024-1919px - Adjusted grid |
| Tablet | 768-1023px - Stacked columns |
| Mobile | 375-767px - Single column |

#### Sticky Elements Behavior
- Header: Always sticky
- Tab navigation: Sticky below header
- Sidebar (if any): Hidden on mobile

---

## XX. DATA REFRESH & REAL-TIME UPDATES

### A. Real-Time Price Updates
- Price refreshes every few seconds during market hours
- Last update timestamp displayed
- Visual indicator for live data

### B. Chart Auto-Refresh Behavior
- Intraday chart updates in real-time
- Longer timeframes refresh on interval

### C. Upcoming Result Date Badges
- Visual badge showing "Results on [Date]"
- Countdown to earnings

### D. Timestamp Display
- "Last updated: X minutes ago" format
- Different refresh rates for different data types

---

## XXI. COMPETITOR PRODUCT RECOMMENDATIONS

### A. Must-Have Features (Priority 1)

| Feature | Rationale |
|---------|-----------|
| Quick Investment Checklist | Instant visual assessment, key differentiator |
| AI Chat Feature | Modern expectation, high engagement |
| Interactive Price Chart | Table stakes for stock pages |
| Structured Data Tables | Professional data presentation |
| Visual Metrics Cards | Quick consumption of key data |
| Multiple Evaluation Views | Cater to different user needs |

### B. Value-Add Features (Priority 2)

| Feature | Rationale |
|---------|-----------|
| Detailed Summary Toggle | Progressive disclosure |
| Announcement/News Section | Keep users informed |
| Analyst Forecasts | Forward-looking data |
| Shareholding Visualizations | Institutional interest indicator |
| Document Repository | One-stop resource |

### C. Information Hierarchy Best Practices

#### Above-the-Fold Elements
1. Stock name, price, change
2. Key metrics (Market Cap, P/E)
3. Investment Checklist
4. Primary CTAs (Watchlist, Ask AI)

#### Tab Priority
| Priority | Tabs |
|----------|------|
| Primary | Overview, Technicals, Financials |
| Secondary | Forecast, Peers, Shareholdings |
| Tertiary | Projection, Actions, News, Announcements, Documents |

### D. Engagement Strategy

| Strategy | Implementation |
|----------|----------------|
| AI Feature Prominence | Multiple touchpoints, contextual placement |
| Visual Status Indicators | Color-coded, icon-based signals |
| Interactive Elements | Charts, toggles, filters |
| Time-Based Content | Latest news, upcoming events |

### E. Accessibility Considerations

| Consideration | Implementation |
|---------------|----------------|
| Keyboard Navigation | Tab order, focus states |
| Color Contrast | WCAG AA compliance minimum |
| Alt Text | For all images and charts |
| Tooltips | Explanatory content on hover/focus |

---

## XXII. PAGE LOAD PERFORMANCE INSIGHTS

### A. Critical Elements (Above Fold) - Load First
- Stock header with price
- Investment Checklist
- Price chart skeleton

### B. Secondary Load Elements
- Tab content (lazy load on tab switch)
- Full chart data
- News and announcements

### C. Lazy-Load Candidates
- Document repository
- Historical shareholding data
- Peer comparison full data
- News articles beyond first few

---

## Implementation Notes for StockFox

### Key Differentiators to Leverage

1. **Investment Checklist** - Adapt to StockFox's 11-segment analysis with DFY scoring
2. **AI Integration** - Use RAG-based assistant for contextual, cited responses
3. **Personalization** - Apply 6D personalization to checklist weights and explanations
4. **Evidence Citations** - Maintain 94% citation target in all AI responses
5. **Plain English** - Translate all jargon with contextual learning tooltips

### StockFox-Specific Adaptations

| Multibagg Feature | StockFox Adaptation |
|-------------------|---------------------|
| 6 Checklist Items | 11 Segment Scores with DFY/DIY toggle |
| Generic AI Chat | Personalized AI with user thesis context |
| Standard Tables | Tables with learning mode annotations |
| Static Content | Journal integration for note-taking |

---

*Document created for StockFox competitive analysis and product development reference.*
*Last Updated: January 2026*
