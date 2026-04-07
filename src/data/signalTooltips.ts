/**
 * Plain-English tooltips for Layer 3 (segments/factors) and Layer 4 (signals)
 *
 * These definitions explain what each term means to a retail investor.
 * Keyed by ID so they work across all demo stocks without duplication.
 */

// ============================================================
// LAYER 3 — Segment & Factor Tooltips
// ============================================================

export const SEGMENT_TOOLTIPS: Record<string, string> = {
  // Quant Segments
  financial_health: 'Checks if the company can pay its debts, generate cash, and survive downturns. This is the gatekeeper — if it fails, other scores are capped.',
  profitability: 'How efficiently the company turns revenue into profit. Looks at margins, return on capital, and whether profitability is improving or declining.',
  growth: 'How fast the company is growing revenue, profit, and market share. Evaluates both historical trajectory and future growth runway.',
  valuation: 'Is the stock cheap or expensive relative to its earnings, sector peers, and its own history? Combines three valuation lenses.',
  technical: 'Price momentum and trend signals from technical analysis. Evaluates whether the stock is in an uptrend, downtrend, or range-bound.',
  performance: 'Historical stock price returns over 1-month, 3-month, 1-year, and 3-year periods. Context only — not scored.',
  institutional_signals: 'What are institutional investors (FIIs, DIIs, mutual funds) and analysts doing? Tracks smart money flows and broker consensus. Context only — not scored.',

  // Qual Factors
  management_governance: 'Are the people running this company trustworthy and competent? Evaluates promoter alignment, board governance, and management track record.',
  business_quality: 'Does this company have a durable competitive advantage? Looks at pricing power, margin sustainability, and revenue concentration risk.',
  capital_discipline: 'Is the company deploying capital wisely? Checks dilution history, acquisition track record, capex returns, and capital return policy.',
  earnings_quality: 'Are reported earnings backed by real cash? Detects aggressive accounting, cash conversion gaps, and audit red flags.',
  execution_quality: 'Does management deliver on what they promise? Compares guidance vs actual results, revenue consistency, and operational milestones.',
}

// ============================================================
// LAYER 4 — Individual Signal Tooltips
// ============================================================

export const SIGNAL_TOOLTIPS: Record<string, string> = {
  // === HARD GATES (G1-G5) ===
  G1: 'Altman Z-Score — a formula that predicts bankruptcy risk using working capital, retained earnings, EBIT, and book value ratios. Below 1.10 signals distress.',
  G2: 'Beneish M-Score — a statistical model that detects earnings manipulation. A score above -1.78 suggests the company may be inflating profits.',
  G3: 'Promoter Pledge — when promoters borrow money against their shares. Above 50% creates margin-call risk where forced selling can crash the stock price.',
  G4: 'Cash Flow Viability — checks if the business generates real cash from operations. If operating cash flow was negative in 2 of the last 3 years, the business model is unproven.',
  G5: 'Regulatory Surveillance — checks if the stock is on SEBI\'s ASM (Additional Surveillance) or GSM (Graded Surveillance) lists, which indicate unusual trading patterns.',

  // === FINANCIAL HEALTH CLUSTERS ===
  // Cash Flow Quality (B1)
  B1a: 'CFO vs Net Income — operating cash flow should exceed reported profit. If it doesn\'t, the company is reporting profits it hasn\'t actually received in cash.',
  B1b: 'Free Cash Flow / Net Income — after paying for growth capex, how much profit converts to free cash? Higher is better. Below 50% is a concern.',
  B1c: 'Debt Serviceability — can the company comfortably repay its debt? Measures Net Debt relative to EBITDA (earnings). Lower is safer. For banks: Capital Adequacy Ratio (CRAR).',
  B1d: 'OCF / EBITDA — how much of the company\'s operating profit (EBITDA) converts to actual cash (OCF). A ratio below 0.5 means half the profit isn\'t real cash.',

  // Balance Sheet Strength (B2)
  B2a: 'Net Debt / EBITDA — how many years of earnings it would take to repay all debt. Below 2× is comfortable. Negative means the company has more cash than debt.',
  B2b: 'Interest Coverage — how easily the company can pay interest on its debt from operating profits. Above 3× is safe. Below 1.5× is dangerous.',
  B2c: 'Net Debt Change YoY — is the company taking on more debt or paying it down? Increasing debt needs a good reason (growth investment, not covering losses).',
  B2d: 'Current Ratio Trend — can the company pay bills due within 1 year? A ratio above 1.5× is healthy. A declining trend signals tightening liquidity.',

  // Earnings Quality (B3)
  B3a: 'Return on Assets (ROA) — how much profit the company earns per rupee of total assets. Higher means more efficient use of resources.',
  B3b: 'Change in ROA — is the return on assets improving or declining year over year? An improving trend signals the business is becoming more efficient.',
  B3c: 'ROCE vs WACC Spread — Return on Capital Employed minus the cost of that capital. A positive spread means the company is creating value. Negative means it\'s destroying value.',
  B3d: 'DuPont ROE Decomposition — breaks down Return on Equity into margins × asset turnover × leverage. High ROE from margins is healthy; high ROE from debt is risky.',

  // Operating Efficiency (B4)
  B4a: 'Asset Turnover Trend — how efficiently the company uses its assets to generate revenue. An improving trend means the business is scaling well.',
  B4b: 'Gross Margin Stability — how consistent are profit margins over 5 years? Low volatility (σ) means predictable profitability. High volatility means cyclical or fragile pricing.',
  B4c: 'Revenue Consistency — has the company grown revenue every year? Consistent topline growth signals a reliable business model.',

  // Capital Allocation (B5)
  B5a: 'Incremental ROCE — return earned on new capital invested. If the company is reinvesting at high returns, it\'s creating shareholder value.',
  B5b: 'Share Count Trend — is the company diluting shareholders (issuing new shares) or buying back shares? Flat or declining share count is shareholder-friendly.',
  B5c: 'FCF CAGR (5Y) — compound annual growth rate of free cash flow over 5 years. Growing FCF means the business is generating more and more surplus cash.',

  // === INDIA MODIFIERS (M1-M4) ===
  M1: 'Promoter Pledge (20-50%) — a moderate pledge level. Not as dangerous as 50%+ (which is a hard gate), but still signals promoter financial stress.',
  M2: 'Material Related Party Transactions (RPT) — when a company does significant business with entities owned by the promoter or their family. Above 10% of revenue raises self-dealing concerns.',
  M3: 'Audit Qualification or Auditor Change — a qualified audit opinion or sudden auditor change can signal accounting issues the company is trying to hide.',
  M4: 'Consistent Shareholder Returns — has the company paid dividends or done buybacks for 5+ consecutive years? Rewards companies that return cash to shareholders.',

  // === BFSI-SPECIFIC SIGNALS ===
  // These IDs match the standard B2x IDs but show BFSI metrics
  // Adding explicit BFSI signal names as fallback keys
  'NIM': 'Net Interest Margin — the difference between interest earned on loans and interest paid on deposits, divided by earning assets. Higher NIM means better lending profitability.',
  'GNPA': 'Gross Non-Performing Assets — loans where the borrower has stopped paying. A lower GNPA ratio means cleaner loan quality.',
  'NNPA': 'Net NPA — bad loans minus provisions set aside. Shows the actual unprovisioned risk. Lower is better.',
  'PCR': 'Provision Coverage Ratio — what percentage of bad loans the bank has already set aside money for. Above 70% is considered adequate.',
  'CRAR': 'Capital Risk-Weighted Adequacy Ratio — the bank\'s capital cushion against potential losses. RBI requires minimum 9%. Higher means the bank can absorb more shocks.',
  'CASA': 'Current Account Savings Account ratio — the share of low-cost deposits in total deposits. Higher CASA means cheaper funding and better margins.',

  // === PROFITABILITY SIGNALS ===
  'P1a': 'Operating Margin Trend — how much of each rupee of revenue becomes operating profit. An improving trend signals better cost control or pricing power.',
  'P1b': 'Net Margin Trend — the bottom-line profit percentage after all expenses, taxes, and interest. The ultimate profitability metric.',
  'P1c': 'ROCE (Return on Capital Employed) — profit earned per rupee of total capital (equity + debt). The single best measure of capital efficiency.',
  'P2a': 'EBITDA Margin vs Peers — how the company\'s operating margin compares to sector peers. Above median is good; top quartile is excellent.',
  'P2b': 'ROE vs Peers — how the company\'s return on equity compares to sector averages.',
  'P2c': 'Margin Expansion / Compression — are margins widening (positive) or narrowing (negative) relative to sector trends?',
  'P3a': 'Margin Trajectory (5Y) — long-term direction of profitability. Are margins structurally improving or declining?',
  'P3b': 'Revenue Quality — proportion of revenue that is recurring vs one-time. Recurring revenue is more predictable and valuable.',
  'P3c': 'Employee Cost Ratio — labour costs as a percentage of revenue. Important for services companies where people are the primary asset.',

  // === GROWTH SIGNALS ===
  'GR1a': 'Revenue CAGR (3Y) — compound annual growth rate of revenue over 3 years. Shows how fast the company is scaling its topline.',
  'GR1b': 'Profit CAGR (3Y) — compound annual growth rate of net profit over 3 years. Growing profits faster than revenue signals operating leverage.',
  'GR2a': 'Revenue Acceleration — is revenue growth speeding up or slowing down quarter over quarter?',
  'GR2b': 'TAM Runway — Total Addressable Market remaining. How much room is left for the company to grow within its target market.',
  'GR3a': 'Quarterly Revenue Trend — direction of revenue growth in recent quarters. Checks for deceleration or re-acceleration.',
  'GR3b': 'Order Book / Pipeline — forward-looking indicator of future revenue. A growing order book signals sustained demand.',

  // === VALUATION SIGNALS ===
  'V1a': 'P/E vs Sector Median — Price-to-Earnings ratio compared to sector peers. A premium above 1.5× sector median may indicate overvaluation.',
  'V1b': 'EV/EBITDA vs Sector — Enterprise Value to EBITDA compared to peers. Normalises for capital structure differences between companies.',
  'V1c': 'PEG Ratio — P/E ratio divided by earnings growth rate. Below 1 suggests growth is undervalued; above 2 suggests it may be overpriced.',
  'V2a': 'P/E vs Own 5Y Average — is the stock trading above or below its own historical average P/E? Above means it\'s expensive relative to its own history.',
  'V2b': 'P/B vs Own History — Price-to-Book ratio compared to historical average. Useful for asset-heavy businesses.',
  'V3a': 'Earnings Yield vs G-Sec — the stock\'s earnings yield (inverse of P/E) compared to the 10-year government bond yield. If lower, you\'re accepting less return than a risk-free bond.',
  'V3b': 'DCF Intrinsic Value — estimated fair value based on discounted future cash flows. Compares current price to calculated intrinsic value.',

  // === TECHNICAL SIGNALS ===
  'T1a': 'Long-Term Moving Average (200 DMA) — is the stock trading above or below its 200-day moving average? Above signals a bullish long-term trend.',
  'T1b': 'Medium-Term Trend (50 DMA) — the 50-day moving average reflects medium-term momentum. A rising 50 DMA confirms sustained buying interest.',
  'T2a': 'RSI (Relative Strength Index) — measures momentum on a 0-100 scale. Above 70 is overbought (may pull back). Below 30 is oversold (may bounce).',
  'T2b': 'MACD Trend — Moving Average Convergence Divergence. A bullish crossover suggests upward momentum is strengthening.',
  'T3a': 'Volume Trend — is trading volume increasing or decreasing? Rising volume on price increases confirms the trend. Declining volume weakens it.',

  // === PERFORMANCE SIGNALS (CONTEXT) ===
  'PF1a': '1-Month Return — stock price change over the last 30 days. Short-term momentum indicator.',
  'PF1b': '3-Month Return — stock price change over the last 90 days. Captures recent quarter performance.',
  'PF2a': '1-Year Return — annual stock price return. The most commonly referenced return period.',
  'PF2b': '3-Year CAGR — annualised return over 3 years. Smooths out short-term volatility.',
  'PF3a': '52-Week High/Low Position — where the current price sits relative to its 52-week range. Near the high may indicate strength; near the low may indicate weakness.',
  'PF3b': 'Drawdown from Peak — how far the stock has fallen from its all-time or recent high. Deep drawdowns may signal opportunity or risk.',

  // === INSTITUTIONAL SIGNALS (CONTEXT) ===
  'IS1a': 'FII Holding Change — are Foreign Institutional Investors buying or selling? FII flows often signal global sentiment on the stock.',
  'IS1b': 'DII Holding Change — Domestic Institutional Investor activity. Mutual funds and insurance companies represent informed domestic demand.',
  'IS2a': 'Mutual Fund Holding — how many mutual fund schemes hold this stock? Increasing schemes signal growing institutional conviction.',
  'IS2b': 'Analyst Consensus — the average broker recommendation (Buy/Hold/Sell) across major research houses.',
  'IS3a': 'Target Price vs CMP — the average analyst target price compared to current market price. A large upside gap may indicate undervaluation.',
  'IS3b': 'Promoter Holding Trend — is the promoter increasing or decreasing their stake? Increasing signals confidence; decreasing may signal concern.',
}

// Signal name-based fallback (for signals where the name is the key identifier)
export const SIGNAL_NAME_TOOLTIPS: Record<string, string> = {
  'Net Interest Margin (NIM)': 'The difference between interest earned on loans and interest paid on deposits. Higher NIM means better bank profitability.',
  'Gross NPA Ratio': 'Percentage of loans where borrowers have stopped paying. Lower is better — indicates cleaner loan quality.',
  'Net NPA Ratio': 'Bad loans minus provisions already set aside. Shows actual unprovisioned risk to the bank.',
  'Provision Coverage Ratio (PCR)': 'What percentage of bad loans the bank has set aside money for. Above 70% is adequate.',
  'CRAR (Capital Adequacy)': 'Capital cushion against potential losses. RBI requires minimum 9%. Higher means the bank can absorb more shocks.',
  'CASA Ratio': 'Share of low-cost deposits (current + savings accounts) in total deposits. Higher CASA means cheaper funding.',
  'Cost-to-Income Ratio': 'Operating expenses as a percentage of operating income. Lower means the bank is more efficient.',
  'ROA (Risk-Weighted)': 'Return on Assets adjusted for risk weightage of the loan book. Above 1.5% is excellent for a bank.',
  'CFO > Net Income': 'Checks if operating cash flow exceeds reported profit. If not, the company is reporting earnings it hasn\'t received in cash.',
  'FCF / Net Income': 'After paying for capex, how much profit converts to free cash? Higher means better cash quality.',
  'Debt Serviceability': 'Can the company comfortably repay its debt? For banks, this is measured via Capital Adequacy Ratio (CRAR).',
  'OCF/EBITDA': 'How much of operating profit (EBITDA) converts to actual cash (OCF). Below 0.5 means half the profit isn\'t real cash.',
  'Net Debt / EBITDA': 'How many years of earnings it would take to repay all debt. Below 2× is comfortable.',
  'Interest Coverage': 'How easily the company can pay interest on debt from operating profits. Above 3× is safe.',
  'Net Debt Change YoY': 'Is the company taking on more debt or paying it down? Increasing debt needs a good reason.',
  'Current Ratio Trend': 'Can the company pay bills due within 1 year? Above 1.5× is healthy. Declining trend signals tightening liquidity.',
  'ROA': 'Return on Assets — how much profit is earned per rupee of total assets. Higher means more efficient use of resources.',
  'ΔROA YoY': 'Year-over-year change in Return on Assets. An improving trend signals the business is becoming more efficient.',
  'ROCE vs WACC Spread': 'Return on Capital minus cost of capital. Positive means the company creates value. Negative means it destroys value.',
  'DuPont ROE Decomposition': 'Breaks down Return on Equity into margins × turnover × leverage. High ROE from margins is healthy; from debt is risky.',
  'Asset Turnover Trend (3Y)': 'How efficiently the company uses assets to generate revenue. Improving trend means the business is scaling well.',
  'Gross Margin Stability (5Y σ)': 'How consistent are profit margins over 5 years? Low volatility means predictable profitability.',
  'Revenue Consistency': 'Has the company grown revenue every year? Consistent topline growth signals a reliable business model.',
  'Incremental ROCE': 'Return earned on new capital invested. High incremental ROCE means the company is still finding good investment opportunities.',
  'Shares Flat or Declining': 'Is the company diluting shareholders or buying back shares? Declining share count is shareholder-friendly.',
  'FCF CAGR (5Y)': 'Compound annual growth rate of free cash flow over 5 years. Growing FCF means more surplus cash each year.',
  'Dividend Track Record': 'Has the company consistently paid dividends? A long unbroken dividend history signals financial discipline.',

  // === QUAL — Management & Governance signals ===
  'Promoter Skin in the Game': 'How much of their own wealth have the promoters invested in this company? Higher stake = stronger alignment with minority shareholders.',
  'Holding Trend (3Y)': 'Are promoters buying more shares or selling down? A 3-year buying trend signals conviction; selling signals potential concern.',
  'Pledge Status': 'Have promoters pledged (borrowed against) their shares? Pledged shares can be force-sold in a market crash, amplifying the decline.',
  'Insider Transactions': 'Are company insiders (directors, key managers) buying or selling shares? Insider buying is a bullish signal — they know the business best.',
  'Related Party Transactions': 'When a company does business with entities owned by the promoter. High RPTs can be used to siphon value from minority shareholders.',
  'Auditor Quality & Tenure': 'Is the company audited by a reputable firm? Sudden auditor changes or qualified opinions are red flags for accounting quality.',
  'Board Independence': 'What percentage of the board is independent (not related to the promoter)? Higher independence = better checks on management.',
  'Regulatory Compliance': 'Has the company faced any SEBI penalties or regulatory actions? Clean compliance history signals good governance.',
  'Compensation Alignment': 'Is management pay linked to company performance? Excessive pay with poor results signals misaligned incentives.',
  'Disclosure Quality': 'How transparent is the company in its reporting? Timely, detailed disclosures help investors make informed decisions.',
  'Whistleblower / Ethics': 'Does the company have proper ethics policies and whistleblower protection? Their absence increases fraud risk.',
  'Capital Allocation Track Record': 'Has management historically deployed capital into projects that generate good returns? Poor track record = value destruction.',
  'Execution vs Guidance': 'Does management deliver on what they promise? Companies that consistently miss guidance have a credibility problem.',
  'Strategic Clarity': 'Does management have a clear, well-communicated strategy? Vague or frequently changing direction raises execution risk.',
  'Leadership Trajectory': 'Is the leadership team stable and experienced? Frequent CXO changes signal deeper organizational issues.',

  // === QUAL — Business Quality signals ===
  'ROCE Consistency': 'Return on Capital Employed over multiple years. Consistent high ROCE = durable competitive advantage (moat).',
  'Operating Margin Stability': 'How stable are operating margins over time? Low volatility signals pricing power and cost control.',
  'Margin Expansion Trend': 'Are profit margins widening or narrowing over time? Expanding margins signal improving business economics.',
  'Revenue Quality': 'What proportion of revenue is recurring (subscriptions, contracts) vs one-time? Recurring revenue is more predictable and valuable.',
  'Return vs Cost of Capital': 'Is the company earning more on invested capital than it costs to raise that capital? Positive spread = value creation.',
  'Customer Concentration': 'Does the company depend heavily on a few large customers? Losing one major customer could severely impact revenue.',
  'Geographic Concentration': 'Is revenue spread across multiple regions or concentrated in one? Diversification reduces regional risk.',
  'Product/Service Concentration': 'Does the company rely on a single product or service? Diversification protects against disruption in any one area.',
  'Pricing Power Evidence': 'Can the company raise prices without losing customers? Strong pricing power = strong brand or monopoly-like position.',
  'Cash Backing of Earnings': 'Are reported profits backed by actual cash receipts? A gap between profit and cash flow may signal aggressive accounting.',
  'Accrual Ratio': 'Measures how much of reported earnings is "on paper" (accruals) vs actual cash. High accrual ratio = lower earnings quality.',

  // === QUAL — Capital Discipline signals ===
  'Equity Dilution History': 'How often has the company issued new shares? Frequent dilution reduces your ownership percentage over time.',
  'Debt Management': 'Is the company managing its debt responsibly? Conservative borrowing with comfortable interest coverage is ideal.',
  'Funding Mix': 'How does the company fund its growth — internal cash, debt, or equity? Self-funded growth is the strongest signal.',
  'Working Capital Efficiency': 'How efficiently does the company manage inventory, receivables, and payables? Poor management ties up cash unnecessarily.',
  'Capex ROI': 'Does capital expenditure generate good returns? High capex ROI means money is being invested wisely.',
  'R&D Effectiveness': 'Is R&D spending translating into new products and revenue growth? High R&D with no output is a waste of capital.',
  'Growth vs Maintenance Capex': 'Is the company investing for growth or just maintaining existing assets? Growth capex builds future value.',
  'Investment Timing': 'Does management invest counter-cyclically (buying low) or pro-cyclically (buying high)? Counter-cyclical investing creates more value.',
  'Subsidiary Health': 'Are subsidiaries profitable and value-accretive, or are they bleeding cash? Loss-making subsidiaries can drain the parent.',
  'Capital Allocation Consistency': 'Is the company\'s capital allocation strategy predictable and consistent? Erratic allocation makes the business harder to value.',
  'Buyback Discipline': 'Does the company buy back shares at reasonable valuations? Smart buybacks increase your ownership; overpaying destroys value.',
  'Payout Sustainability': 'Can the company sustain its dividend payments from free cash flow? Payouts exceeding FCF may require borrowing.',
  'Total Shareholder Return': 'Combined return from dividends, buybacks, and share price appreciation. The ultimate measure of value delivery to shareholders.',
  'M&A Track Record': 'Has the company\'s past acquisitions created or destroyed value? A history of overpaying is a red flag.',
  'Promoter Pledge Impact': 'The capital structure risk from promoter shares being pledged. High pledge = margin call risk during market stress.',

  // === QUAL — Earnings Quality signals ===
  'OCF to PAT Ratio': 'Operating Cash Flow to Profit After Tax. Ideally above 1.0 — it means every rupee of profit is backed by actual cash.',
  'FCF to Equity': 'Free Cash Flow available to equity shareholders after all reinvestment. This is the real distributable profit.',
  'Accrual Quality': 'How much of earnings growth comes from actual cash vs accounting adjustments? Cash-driven growth is more trustworthy.',
  'Receivables Trend': 'Are receivables growing faster than revenue? If yes, the company may be booking revenue it hasn\'t collected yet.',
  'Inventory Trend': 'Is inventory building up faster than sales? Rising inventory can signal weakening demand or obsolescence risk.',
  'Depreciation Adequacy': 'Is the company depreciating assets at an appropriate rate? Under-depreciation inflates profits artificially.',
  'Tax Rate Consistency': 'Is the effective tax rate stable and close to the statutory rate? Unusually low tax rates may not be sustainable.',
  'Exceptional Items': 'How frequently does the company report "one-time" gains or losses? Frequent exceptionals signal poor core earnings quality.',
  'Operating Leverage': 'How much does profit grow for each unit of revenue growth? High operating leverage means small revenue gains = big profit gains.',
  'Earnings Volatility': 'How stable are earnings from quarter to quarter and year to year? Lower volatility means more predictable business performance.',
  'Deferred Revenue': 'Money received for services not yet delivered. Growing deferred revenue is a positive sign — it\'s future revenue already paid for.',
  'Contingent Liabilities': 'Potential future obligations (lawsuits, guarantees) not yet on the balance sheet. Large contingent liabilities are hidden risks.',
  'Provision Adequacy': 'Has the company set aside enough provisions for bad debts, warranties, and other known risks? Under-provisioning inflates profits.',

  // === QUAL — Execution Quality signals ===
  'Revenue Delivery vs Guidance': 'Did the company hit the revenue targets it guided for? Consistent delivery builds management credibility.',
  'Margin Delivery vs Guidance': 'Did the company achieve the margin targets it guided for? Margin misses often signal cost control problems.',
  'Project Completion Rate': 'For project-based companies: what percentage of projects are completed on time and on budget?',
  'Order Book Execution': 'Is the company converting its order book into actual revenue on schedule? Slow conversion signals execution issues.',
  'Geographic Expansion Success': 'When the company enters new markets, does it successfully scale? Failed expansions waste capital.',
  'New Product Launch Success': 'Do new product launches achieve their target market share and revenue? High success rate = strong innovation engine.',
  'Operational KPIs': 'Key performance indicators specific to the business (e.g., same-store sales, ARPU, utilisation rates). Are these improving or declining?',
  'Management Credibility Score': 'An aggregate view of how consistently management delivers on promises across all dimensions.',
  'Quarterly Consistency': 'How stable are results from quarter to quarter? Consistent quarterly performance signals a well-managed business.',
  'Guidance Quality': 'Does management provide clear, specific guidance? Vague guidance makes it harder to hold management accountable.',
}

// ============================================================
// SIGNAL GROUP NAME TOOLTIPS
// ============================================================

export const GROUP_TOOLTIPS: Record<string, string> = {
  // Quant — Financial Health groups
  'Hard Gates': 'Binary pass/fail checks that must clear before the segment is scored. A single gate failure suppresses the entire segment.',
  'Cash Flow Quality': 'Is the company generating real cash from operations? Measures how well reported profits convert to actual cash receipts.',
  'Balance Sheet Strength': 'How strong is the company\'s financial foundation? Evaluates debt levels, liquidity, and overall financial stability.',
  'Balance Sheet Strength (BFSI)': 'Banking-specific financial strength: capital adequacy (CRAR), asset quality (NPA), and provision coverage.',
  'Earnings Quality': 'Are reported earnings trustworthy? Checks if profits are backed by cash, sustainable, and not artificially inflated.',
  'Operating Efficiency': 'How efficiently does the company run its business? Measures asset utilisation, margin stability, and revenue consistency.',
  'Capital Allocation': 'Is management deploying capital wisely? Evaluates reinvestment returns, share dilution, and free cash flow growth.',
  'India Modifiers': 'India-specific adjustments: promoter pledge risk, related party transactions, audit quality, and shareholder return consistency.',

  // Qual — Management & Governance groups
  'Promoter Alignment': 'How aligned is the promoter with minority shareholders? Checks stake size, pledge status, insider transactions, and RPTs.',
  'Governance Structure': 'Quality of corporate governance: auditor, board independence, regulatory compliance, compensation, and ethics framework.',
  'Management Capability': 'Track record of the management team: capital allocation, execution vs guidance, strategic clarity, and leadership stability.',

  // Qual — Business Quality groups
  'Margin & Return Durability': 'Is the business\'s profitability sustainable? Checks ROCE consistency, margin stability, and return vs cost of capital.',
  'Revenue Fragility': 'How vulnerable is revenue to concentration risk? Checks customer, geographic, and product/service dependence.',
  'Pricing Power Confirmation': 'Can the company raise prices without losing market share? Pricing power is the strongest evidence of a competitive moat.',
  'Earnings Backing': 'Are earnings backed by actual cash and real business activity? Low accrual ratio = higher quality earnings.',

  // Qual — Capital Discipline groups
  'Dilution & Funding': 'How does the company fund itself? Checks equity dilution, debt management, funding mix, and working capital efficiency.',
  'Capital Deployment Quality': 'How smart are the company\'s investment decisions? Evaluates capex ROI, R&D effectiveness, and subsidiary health.',
  'Capital Returns': 'How does the company return value to shareholders? Evaluates dividends, buybacks, payout sustainability, and total return.',
  'Acquisition Track Record': 'Has the company\'s M&A history created or destroyed value? Integration success and deal pricing matter.',

  // Qual — Earnings Quality groups
  'Cash Conversion': 'How effectively does the company convert reported profits into actual cash? The ultimate test of earnings quality.',
  'Accounting Red Flags': 'Are there signs of aggressive accounting? Checks receivables, inventory, depreciation, and tax rate patterns.',
  'Provisions & Off-Balance': 'Hidden risks — contingent liabilities, deferred revenue, and provision adequacy that don\'t show up in headline numbers.',

  // Qual — Execution Quality groups
  'Guidance Track Record': 'Does management deliver what they promise? Measures revenue and margin delivery vs stated guidance.',
  'Operational Execution': 'Is the company executing well on the ground? Project completion, order conversion, and expansion success rates.',
  'Consistency Metrics': 'How predictable and stable is the company\'s quarterly and annual performance? Consistency signals management quality.',

  // Quant — Profitability groups
  'Core Profitability': 'Fundamental margin and return metrics that define the company\'s earning power.',
  'Peer Comparison': 'How does the company\'s profitability compare to sector peers? Identifies relative strength or weakness.',
  'Profitability Trend': 'Is profitability improving or declining over time? The direction matters as much as the current level.',

  // Quant — Growth groups
  'Historical Growth': 'How fast has the company grown revenue and profit? Uses CAGR to smooth out year-to-year fluctuations.',
  'Growth Sustainability': 'Can the current growth rate be maintained? Evaluates acceleration, market runway, and future catalysts.',

  // Quant — Valuation groups
  'Sector-Relative Value': 'Is the stock cheap or expensive compared to sector peers? Uses P/E, EV/EBITDA, and PEG ratios.',
  'Own-History Value': 'Is the stock cheap or expensive relative to its own historical valuation? Compares current ratios to 5-year averages.',
  'Absolute India Value': 'Is the stock attractive on absolute terms? Compares earnings yield to risk-free rates (G-Sec) and DCF intrinsic value.',

  // Quant — Technical groups
  'Trend Signals': 'Is the stock in an uptrend, downtrend, or range-bound? Uses moving averages (50 DMA, 200 DMA) to assess direction.',
  'Momentum Signals': 'How strong is the current price momentum? Uses RSI and MACD to detect overbought/oversold conditions.',
  'Volume Confirmation': 'Is trading volume confirming or contradicting the price trend? Rising volume on up-moves = strong conviction.',

  // Context-only segment groups
  'Price Returns': 'Historical stock returns across multiple timeframes — 1 month to 3 years. Provides performance context.',
  'Market Position': 'Where the stock sits relative to its 52-week range and peak. Helps assess current price in historical context.',
  'Institutional Activity': 'What are FIIs, DIIs, and mutual funds doing with this stock? Smart money flows signal institutional conviction.',
  'Analyst View': 'What do research analysts think? Consensus ratings, target prices, and rating changes from major brokerages.',
  'Promoter Activity': 'What is the promoter doing with their stake? Increasing, decreasing, or holding steady? This is the ultimate insider signal.',
}

/**
 * Get tooltip for a signal — tries ID first, then falls back to name match
 */
export function getSignalTooltip(id: string, name: string): string | undefined {
  return SIGNAL_TOOLTIPS[id] || SIGNAL_NAME_TOOLTIPS[name]
}

// ============================================================
// VERDICT & SCORE BAND TOOLTIPS (for ⓘ icons on Scorecard)
// ============================================================

export const VERDICT_TOOLTIPS: Record<string, string> = {
  'Strong Buy': 'Score 80+. Exceptional across most dimensions. Strong fundamentals, quality management, and limited risk flags.',
  'Buy': 'Score 65-79. More strengths than concerns. Solid fundamentals with some areas to monitor.',
  'Hold': 'Score 50-64. Mixed signals. Notable strengths but meaningful gaps or risks that need watching.',
  'Sell': 'Score 35-49. More concerns than strengths. Significant risks or deteriorating fundamentals.',
  'Strong Sell': 'Score below 35. Major red flags across multiple dimensions. High risk of capital erosion.',
}

export const SCORE_BAND_TOOLTIPS: Record<string, string> = {
  'STRONG': 'Score 70+. This dimension is a clear strength — performing well above average.',
  'GOOD': 'Score 60-69. Solid performance in this dimension with minor areas for improvement.',
  'MODERATE': 'Score 45-59. Average performance. Some positives but notable gaps or inconsistencies.',
  'WEAK': 'Score 30-44. Below average. Significant concerns that weigh on the overall assessment.',
  'POOR': 'Score below 30. Major weakness. This dimension is dragging the overall score down.',
  // Also handle lowercase/mixed variants
  'good': 'Score 60+. This dimension is a clear strength.',
  'mixed': 'Score 45-59. Average performance with gaps.',
  'poor': 'Score below 45. Significant weakness in this dimension.',
}

export const PILLAR_TOOLTIPS: Record<string, string> = {
  quant: 'Quantitative Analysis — measures financial fundamentals: profitability, growth trajectory, valuation attractiveness, financial health, and technical momentum.',
  qual: 'Qualitative Analysis — evaluates management quality, business durability, capital discipline, earnings reliability, and execution track record.',
  risk: 'Risk Assessment — 35-point scanner checking for red flags: debt stress, audit concerns, governance issues, regulatory actions, and insider selling.',
}

export function getOverallScoreTooltip(quantWeight: number, qualWeight: number, riskWeight: number): string {
  return `Your StockFox Score — weighted blend of Quant (${quantWeight}%), Qual (${qualWeight}%), and Risk (${riskWeight}%) based on your profile.`
}

export function getPeerRankTooltip(rank: number, total: number, category: string): string {
  const percentile = Math.round(((total - rank + 1) / total) * 100)
  return `Ranked #${rank} among ${total} ${category} stocks by StockFox score. Top ${percentile}% in this peer group.`
}
