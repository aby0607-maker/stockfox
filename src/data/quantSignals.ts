/**
 * Quant Layer 4 Signal Architecture — Full signal data for all 7 segments
 *
 * Provides signal groups (gates, clusters, modifiers, anchors, context)
 * for each Quant segment across all 3 demo stocks.
 *
 * Architecture per spec:
 * - Segment 1 (Financial Health): 5 hard gates + 5 scored clusters + 4 India modifiers
 * - Segment 2 (Profitability): 3 anchors + 3 modifiers + 3 context
 * - Segment 3 (Growth): 2 anchors + 2 modifiers + 2 context
 * - Segment 4 (Valuation): 3-layer composite (sector-relative, own-history, absolute)
 * - Segment 5 (Technical): 2 anchors + 2 modifiers + 1 context
 * - Segment 6 (Performance): context-only display signals
 * - Segment 7 (Institutional): context-only with time-decay
 */

import type { SignalGroup, QualSignal, ConfidenceIndicator, SegmentVerdictV2 } from '@/types'
import { getScoreBandEnum } from '@/lib/scoring'

// ============================================================
// HELPERS
// ============================================================

function sig(
  id: string, name: string, group: string,
  tier: QualSignal['escalationTier'],
  score: number | undefined,
  state: QualSignal['state'],
  userText: string,
  extras?: Partial<QualSignal>,
): QualSignal {
  return {
    id, name, group, escalationTier: tier, score, state, userText,
    isTriggered: extras?.isTriggered ?? false,
    version: extras?.version ?? 'v1',
    ...extras,
  }
}

function gate(
  id: string, name: string, group: string,
  passed: boolean, value: string, threshold: string,
  formula: string, userText: string,
): QualSignal {
  return sig(id, name, group, 'hard', passed ? 85 : 10, passed ? 'strong' : 'suppressed', userText, {
    gatePassed: passed,
    gateValue: value,
    gateThreshold: threshold,
    gateFormula: formula,
    isTriggered: !passed,
  })
}

function modifier(
  id: string, name: string, group: string,
  points: number, active: boolean, userText: string,
): QualSignal {
  return sig(id, name, group, active ? 'soft' : 'score_only', undefined, active ? 'monitor' : 'strong', userText, {
    modifierPoints: points,
    modifierActive: active,
  })
}

function confidence(computed: number, total: number, range = 'FY20–FY24', extra?: Partial<ConfidenceIndicator>): ConfidenceIndicator {
  return {
    signalsComputed: computed,
    signalsTotal: total,
    dataRange: range,
    state: computed === total ? 'full' : computed >= total * 0.7 ? 'partial' : 'limited_history',
    tooltip: `Based on ${computed} of ${total} signals | Data: ${range}`,
    ...extra,
  }
}

// ============================================================
// SEGMENT 1 — FINANCIAL HEALTH
// ============================================================

function buildFHSignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[], confidence: ConfidenceIndicator } {
  if (stock === 'zomato') {
    return {
      confidence: confidence(12, 14),
      groups: [
        // Hard Gates
        {
          id: 'gates', name: 'Hard Gates', role: 'gate', signals: [
            gate('G1', 'Altman Z″ Solvency Gate', 'gates', true, '3.42', '> 1.10', 'Z″ = 6.56×(WC/TA) + 3.26×(RE/TA) + 6.72×(EBIT/TA) + 1.05×(BV_Equity/BV_Liab)', 'Solvency check passed — Z″ score of 3.42 is well above distress threshold. No immediate insolvency risk.'),
            gate('G2', 'Beneish M-Score Manipulation Gate', 'gates', true, '-2.95', '< -1.78', 'M = −4.84 + 0.920×DSRI + 0.528×GMI + 0.404×AQI + 0.892×SGI + 0.115×DEPI − 0.172×SGAI + 4.679×TATA − 0.327×LVGI', 'No manipulation detected — M-Score of -2.95 is well below the threshold. Earnings appear genuine.'),
            gate('G3', 'Promoter Pledge Gate', 'gates', true, '0%', '< 50%', 'Pledged shares / Total promoter holding × 100', 'Zero promoter shares pledged — no margin-call spiral risk.'),
            gate('G4', 'Cash Flow Viability Gate', 'gates', false, '1 of 3 years positive', 'CFO > 0 for ≥ 2 of 3 years', 'CFO > 0 for ≥ 2 of last 3 fiscal years', 'Operating cash flow was negative in 2 of the last 3 years — the business has only recently started generating cash from operations. This is a structural concern for a company of this scale.'),
            gate('G5', 'Regulatory Surveillance Gate', 'gates', true, 'Not flagged', 'Not under ASM/GSM', 'SEBI ASM Stage 2+ or GSM live list', 'No SEBI surveillance flags — stock is not under additional surveillance or graded surveillance.'),
          ],
        },
        // Scored Clusters
        {
          id: 'B1', name: 'Cash Flow Quality', role: 'scored', weight: 0.25, score: 32, signals: [
            sig('B1a', 'CFO > Net Income', 'B1', 'score_only', 25, 'flag', 'Operating cash flow has been lower than reported net income — the earnings are not fully backed by cash. This is common for growth companies but warrants monitoring.'),
            sig('B1b', 'FCF / Net Income', 'B1', 'score_only', 20, 'flag', 'Free cash flow is negligible relative to reported profit. Heavy dark store capex absorbs almost all operating cash.'),
            sig('B1c', 'Debt Serviceability', 'B1', 'score_only', 70, 'strong', 'Zero debt — no debt service concerns. Cash-rich balance sheet from IPO proceeds.'),
            sig('B1d', 'OCF/EBITDA', 'B1', 'score_only', 30, 'flag', 'Cash conversion from EBITDA is weak at 0.35 — significant gap between reported profitability and actual cash generation.'),
          ],
        },
        {
          id: 'B2', name: 'Balance Sheet Strength', role: 'scored', weight: 0.25, score: 65, signals: [
            sig('B2a', 'Net Debt / EBITDA', 'B2', 'score_only', 90, 'strong', 'Net cash company — no leverage concerns. Net Debt / EBITDA is negative (net cash position).'),
            sig('B2b', 'Interest Coverage', 'B2', 'score_only', 85, 'strong', 'No meaningful debt means interest coverage is not a concern.'),
            sig('B2c', 'Net Debt Change YoY', 'B2', 'score_only', 55, 'monitor', 'Cash reserves declining as IPO funds are deployed for growth. Net cash is still comfortable.'),
            sig('B2d', 'Current Ratio Trend', 'B2', 'score_only', 45, 'monitor', 'Current ratio has declined from 4.5× to 2.8× over 3 years as cash is deployed — still adequate.'),
          ],
        },
        {
          id: 'B3', name: 'Earnings Quality', role: 'scored', weight: 0.25, score: 40, signals: [
            sig('B3a', 'ROA', 'B3', 'score_only', 25, 'flag', 'Return on assets is very low at 2.1% — expected for a company just turning profitable but well below sector leaders.'),
            sig('B3b', 'ΔROA YoY', 'B3', 'score_only', 72, 'strong', 'ROA is improving rapidly — up from -5% to +2.1% in 18 months. Trajectory is strongly positive.'),
            sig('B3c', 'ROCE vs WACC Spread', 'B3', 'score_only', 22, 'flag', 'ROCE of 4% is below estimated WACC of 12% — the company is currently destroying value on this metric.'),
            sig('B3d', 'DuPont ROE Decomposition', 'B3', 'score_only', 35, 'flag', 'ROE is low at 4%. Decomposition shows thin margins, not leverage, as the driver — healthier quality of low ROE.'),
          ],
        },
        {
          id: 'B4', name: 'Operating Efficiency', role: 'scored', weight: 0.15, score: 48, signals: [
            sig('B4a', 'Asset Turnover Trend (3Y)', 'B4', 'score_only', 55, 'monitor', 'Asset turnover is improving as revenue scales faster than assets deployed — positive direction.'),
            sig('B4b', 'Gross Margin Stability (5Y σ)', 'B4', 'score_only', 35, 'flag', 'Gross margins have been volatile — swinging from negative to positive. Too early for stability assessment.'),
            sig('B4c', 'Revenue Consistency', 'B4', 'score_only', 55, 'monitor', 'Revenue has grown every year since listing — consistent topline growth, though margins have been inconsistent.'),
          ],
        },
        {
          id: 'B5', name: 'Capital Allocation', role: 'scored', weight: 0.10, score: 45, signals: [
            sig('B5a', 'Incremental ROCE', 'B5', 'score_only', 35, 'flag', 'Incremental returns on new capital deployed are low — Blinkit dark stores are capital-intensive with long payback periods.'),
            sig('B5b', 'Shares Flat or Declining', 'B5', 'score_only', 25, 'flag', 'Share count has increased ~8% since IPO due to ESOP dilution — not returning capital to shareholders.'),
            sig('B5c', 'FCF CAGR (5Y)', 'B5', 'score_only', 30, 'flag', 'FCF has been negative for most of the listing period. Just turned marginally positive.'),
          ],
        },
        // India Modifiers
        {
          id: 'modifiers', name: 'India Modifiers', role: 'modifier', signals: [
            modifier('M1', 'Promoter Pledge 20–50%', 'modifiers', -5, false, 'No elevated pledge — promoter shares are not pledged. Modifier does not apply.'),
            modifier('M2', 'Material RPT', 'modifiers', -5, false, 'Related party transactions are below 10% of consolidated revenue — SEBI materiality threshold not breached.'),
            modifier('M3', 'Audit Qualification / Auditor Change', 'modifiers', -5, false, 'Clean audit opinion from Deloitte. No auditor change or qualification.'),
            modifier('M4', 'Consistent Shareholder Returns', 'modifiers', 5, false, 'No dividends or buybacks in the last 5 years — modifier does not activate (growth stage company).'),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      confidence: confidence(12, 14, 'FY20–FY24', { tooltip: 'Based on 12 of 14 signals (BFSI) | Data: FY20–FY24' }),
      groups: [
        {
          id: 'gates', name: 'Hard Gates', role: 'gate', signals: [
            gate('G1', 'Altman Z″ Solvency Gate', 'gates', true, 'N/A — BFSI', 'Not applicable for banks', 'Z″ not computed for BFSI sector', 'Altman Z″ is not applicable for banks — capital adequacy (CRAR) is the BFSI equivalent. Gate treated as passed.'),
            gate('G2', 'Beneish M-Score Manipulation Gate', 'gates', true, '-3.12', '< -1.78', 'M-Score formula', 'No manipulation signals detected — M-Score of -3.12 is well below the threshold.'),
            gate('G3', 'Promoter Pledge Gate', 'gates', true, '0%', '< 50%', 'Pledged shares / Total promoter holding', 'No promoter — professionally managed bank. Gate passed by default.'),
            gate('G4', 'Cash Flow Viability Gate', 'gates', true, '3 of 3 years', 'CFO > 0 for ≥ 2 of 3 years', 'CFO > 0 for ≥ 2 of last 3 fiscal years', 'Operating cash flow has been positive in all 3 recent fiscal years — the bank generates cash consistently.'),
            gate('G5', 'Regulatory Surveillance Gate', 'gates', true, 'Not flagged', 'Not under ASM/GSM', 'SEBI ASM/GSM live list', 'No SEBI surveillance flags. No RBI-specific regulatory concerns at this time.'),
          ],
        },
        // BFSI Template — replaces standard B2 metrics
        {
          id: 'B1', name: 'Cash Flow Quality', role: 'scored', weight: 0.25, score: 72, signals: [
            sig('B1a', 'CFO > Net Income', 'B1', 'score_only', 75, 'strong', 'Operating cash flow exceeds net income — bank earnings are well-backed by actual cash generation.'),
            sig('B1b', 'FCF / Net Income', 'B1', 'score_only', 70, 'strong', 'Healthy free cash flow relative to profit. Banking model requires limited fixed capital.'),
            sig('B1c', 'Debt Serviceability', 'B1', 'score_only', 72, 'strong', 'CRAR at 17.5% — well above RBI minimum of 9%. Strong capital cushion.', { isBfsiSubstitute: true, bfsiOriginal: 'Net Debt/EBITDA' }),
            sig('B1d', 'OCF/EBITDA', 'B1', 'score_only', 68, 'strong', 'Cash conversion from pre-provision operating profit is healthy at 0.82.'),
          ],
        },
        {
          id: 'B2', name: 'Balance Sheet Strength (BFSI)', role: 'scored', weight: 0.25, score: 78, signals: [
            sig('B2a', 'Net Interest Margin (NIM)', 'B2', 'score_only', 80, 'strong', 'NIM of 4.1% — strong for a private bank. Indicates good pricing power on both lending and deposit side.', { isBfsiSubstitute: true, bfsiOriginal: 'Interest Coverage' }),
            sig('B2b', 'Gross NPA Ratio', 'B2', 'score_only', 75, 'strong', 'GNPA at 1.8% — clean asset quality. Well below the private banking sector average of 2.5%.', { isBfsiSubstitute: true, bfsiOriginal: 'Net Debt/EBITDA' }),
            sig('B2c', 'Net NPA Ratio', 'B2', 'score_only', 78, 'strong', 'NNPA at 0.4% — excellent. Indicates strong provisioning and healthy loan recovery.', { isBfsiSubstitute: true, bfsiOriginal: 'Net Debt Change' }),
            sig('B2d', 'Provision Coverage Ratio (PCR)', 'B2', 'score_only', 80, 'strong', 'PCR at 78% — above RBI\'s minimum expectation of 70%. Adequate buffer against asset quality shocks.', { isBfsiSubstitute: true, bfsiOriginal: 'Current Ratio' }),
          ],
        },
        {
          id: 'B3', name: 'Earnings Quality', role: 'scored', weight: 0.25, score: 70, signals: [
            sig('B3a', 'ROA (Risk-Weighted)', 'B3', 'score_only', 72, 'strong', 'ROA on risk-weighted basis of 1.3% — good for a large private bank. Approaching the 1.5%+ benchmark.', { isBfsiSubstitute: true, bfsiOriginal: 'ROA' }),
            sig('B3b', 'ΔROA YoY', 'B3', 'score_only', 68, 'strong', 'ROA improving steadily — up 0.15% from previous year, reflecting improved asset quality and operating leverage.'),
            sig('B3c', 'ROCE vs WACC Spread', 'B3', 'score_only', 65, 'strong', 'ROE of 16% vs estimated cost of equity of 13% — positive spread, creating value for shareholders.'),
            sig('B3d', 'DuPont ROE Decomposition', 'B3', 'score_only', 70, 'strong', 'ROE driven by improving margins and stable leverage — healthy decomposition for a bank.'),
          ],
        },
        {
          id: 'B4', name: 'Operating Efficiency', role: 'scored', weight: 0.15, score: 68, signals: [
            sig('B4a', 'Cost-to-Income Ratio', 'B4', 'score_only', 65, 'strong', 'Cost-to-income at 52% — improving but still above best-in-class private banks (HDFC Bank at 40%).'),
            sig('B4b', 'CASA Ratio', 'B4', 'score_only', 72, 'strong', 'CASA at 44% — healthy mix of low-cost deposits. Provides funding cost advantage.', { isBfsiSubstitute: true, bfsiOriginal: 'Gross Margin Stability' }),
            sig('B4c', 'Revenue Consistency', 'B4', 'score_only', 68, 'strong', 'NII has grown consistently for 5 consecutive years — stable revenue trajectory.'),
          ],
        },
        {
          id: 'B5', name: 'Capital Allocation', role: 'scored', weight: 0.10, score: 70, signals: [
            sig('B5a', 'CRAR (Capital Adequacy)', 'B5', 'score_only', 80, 'strong', 'CRAR at 17.5% — well above RBI\'s 9% minimum. Ample room for growth without capital raise.', { isBfsiSubstitute: true, bfsiOriginal: 'Incremental ROCE' }),
            sig('B5b', 'Shares Flat or Declining', 'B5', 'score_only', 60, 'monitor', 'Minor dilution from Citibank portfolio acquisition QIP. Share count largely stable otherwise.'),
            sig('B5c', 'Dividend Track Record', 'B5', 'score_only', 65, 'strong', 'Resumed dividends after COVID pause. Payout ratio improving gradually.'),
          ],
        },
        {
          id: 'modifiers', name: 'India Modifiers', role: 'modifier', signals: [
            modifier('M1', 'Promoter Pledge 20–50%', 'modifiers', -5, false, 'No promoter — professionally managed. Pledge modifier not applicable.'),
            modifier('M2', 'Material RPT', 'modifiers', -5, false, 'All related party transactions within standard banking norms.'),
            modifier('M3', 'Audit Qualification / Auditor Change', 'modifiers', -5, false, 'Clean audit opinion from S.R. Batliboi (EY). No auditor change.'),
            modifier('M4', 'Consistent Shareholder Returns', 'modifiers', 5, false, 'Dividends resumed but not yet 5 consecutive years. Modifier does not activate.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    confidence: confidence(14, 14),
    groups: [
      {
        id: 'gates', name: 'Hard Gates', role: 'gate', signals: [
          gate('G1', 'Altman Z″ Solvency Gate', 'gates', true, '8.90', '> 1.10', 'Z″ = 6.56×(WC/TA) + 3.26×(RE/TA) + 6.72×(EBIT/TA) + 1.05×(BV_Equity/BV_Liab)', 'Z″ of 8.90 — extremely strong. Zero risk of financial distress. One of the safest companies in India.'),
          gate('G2', 'Beneish M-Score Manipulation Gate', 'gates', true, '-3.45', '< -1.78', 'M-Score formula', 'No manipulation signals — M-Score of -3.45. Tata group governance and Deloitte audit provide additional assurance.'),
          gate('G3', 'Promoter Pledge Gate', 'gates', true, '0%', '< 50%', 'Pledged / Total promoter holding', 'Tata Sons holds 72% with zero pledge — gold standard promoter commitment.'),
          gate('G4', 'Cash Flow Viability Gate', 'gates', true, '3 of 3 years', 'CFO > 0 for ≥ 2 of 3 years', 'CFO > 0 for ≥ 2 of last 3 years', 'Operating cash flow strongly positive in every year for the past decade — not just 3 years.'),
          gate('G5', 'Regulatory Surveillance Gate', 'gates', true, 'Not flagged', 'Not under ASM/GSM', 'SEBI ASM/GSM list', 'Zero regulatory concerns — spotless compliance record.'),
        ],
      },
      {
        id: 'B1', name: 'Cash Flow Quality', role: 'scored', weight: 0.25, score: 92, signals: [
          sig('B1a', 'CFO > Net Income', 'B1', 'score_only', 95, 'strong', 'Operating cash flow consistently exceeds net income — every rupee of reported profit is backed by real cash. Textbook quality.'),
          sig('B1b', 'FCF / Net Income', 'B1', 'score_only', 90, 'strong', 'Free cash flow is 85%+ of net income — the business generates enormous surplus cash after all reinvestment.'),
          sig('B1c', 'Debt Serviceability', 'B1', 'score_only', 95, 'strong', 'Zero debt company. ₹45,000 Cr in cash and investments — no solvency risk whatsoever.'),
          sig('B1d', 'OCF/EBITDA', 'B1', 'score_only', 88, 'strong', 'Cash conversion from EBITDA is excellent at 0.92 — among the best in the market.'),
        ],
      },
      {
        id: 'B2', name: 'Balance Sheet Strength', role: 'scored', weight: 0.25, score: 95, signals: [
          sig('B2a', 'Net Debt / EBITDA', 'B2', 'score_only', 98, 'strong', 'Net cash company — negative Net Debt / EBITDA. Fortress balance sheet.'),
          sig('B2b', 'Interest Coverage', 'B2', 'score_only', 95, 'strong', 'Interest coverage is essentially infinite — zero meaningful debt.'),
          sig('B2c', 'Net Debt Change YoY', 'B2', 'score_only', 90, 'strong', 'Net cash position has grown — the company generates more cash than it deploys.'),
          sig('B2d', 'Current Ratio Trend', 'B2', 'score_only', 85, 'strong', 'Current ratio stable at 2.5× — comfortable liquidity position.'),
        ],
      },
      {
        id: 'B3', name: 'Earnings Quality', role: 'scored', weight: 0.25, score: 90, signals: [
          sig('B3a', 'ROA', 'B3', 'score_only', 88, 'strong', 'Return on assets of 28% — extraordinary for any sector. Asset-light IT services model.'),
          sig('B3b', 'ΔROA YoY', 'B3', 'score_only', 72, 'strong', 'ROA stable — already at peak levels. Minor fluctuations within a tight band.'),
          sig('B3c', 'ROCE vs WACC Spread', 'B3', 'score_only', 95, 'strong', 'ROCE of 55%+ vs WACC of ~12% — massive value creation. Among the widest spreads in India.'),
          sig('B3d', 'DuPont ROE Decomposition', 'B3', 'score_only', 90, 'strong', 'ROE of 45% driven entirely by high margins and asset turnover — zero leverage contribution. Highest quality ROE.'),
        ],
      },
      {
        id: 'B4', name: 'Operating Efficiency', role: 'scored', weight: 0.15, score: 85, signals: [
          sig('B4a', 'Asset Turnover Trend (3Y)', 'B4', 'score_only', 82, 'strong', 'Stable asset turnover — IT services is inherently efficient with minimal physical assets.'),
          sig('B4b', 'Gross Margin Stability (5Y σ)', 'B4', 'score_only', 88, 'strong', 'Gross margins remarkably stable at 50-52% over 5 years — σ of 0.8%. Exceptional consistency.'),
          sig('B4c', 'Revenue Consistency', 'B4', 'score_only', 85, 'strong', 'Revenue has grown in every single year for the past 20+ years. The most consistent topline in Indian IT.'),
        ],
      },
      {
        id: 'B5', name: 'Capital Allocation', role: 'scored', weight: 0.10, score: 88, signals: [
          sig('B5a', 'Incremental ROCE', 'B5', 'score_only', 85, 'strong', 'Incremental returns on new capital deployed remain above 40% — the company continues to find high-return opportunities.'),
          sig('B5b', 'Shares Flat or Declining', 'B5', 'score_only', 90, 'strong', 'Active buyback program has reduced share count — shareholder-friendly capital allocation.'),
          sig('B5c', 'FCF CAGR (5Y)', 'B5', 'score_only', 82, 'strong', 'Free cash flow growing at 10% CAGR — strong and sustainable cash generation trajectory.'),
        ],
      },
      {
        id: 'modifiers', name: 'India Modifiers', role: 'modifier', signals: [
          modifier('M1', 'Promoter Pledge 20–50%', 'modifiers', -5, false, 'Tata Sons has never pledged TCS shares — zero pledge.'),
          modifier('M2', 'Material RPT', 'modifiers', -5, false, 'RPTs with Tata group companies are well below 10% of revenue and fully disclosed.'),
          modifier('M3', 'Audit Qualification / Auditor Change', 'modifiers', -5, false, 'Clean Deloitte audit. No qualifications or auditor changes.'),
          modifier('M4', 'Consistent Shareholder Returns', 'modifiers', 5, true, 'Uninterrupted dividends + regular buybacks for 10+ consecutive years — exemplary capital return track record.'),
        ],
      },
    ],
  }
}

// ============================================================
// SEGMENT 2 — PROFITABILITY
// ============================================================

function buildProfitabilitySignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[], confidence: ConfidenceIndicator } {
  if (stock === 'zomato') {
    return {
      confidence: confidence(8, 9, 'FY22–FY24', { state: 'limited_history' }),
      groups: [
        {
          id: 'anchors', name: 'Core Profitability', role: 'anchor', score: 28, signals: [
            sig('A1', 'Cash Profitability Quality', 'anchors', 'score_only', 18, 'flag', 'Cash-based operating profitability is extremely low relative to assets. The company generates minimal real cash profit per rupee of assets deployed — expected for a recently profitable company but structurally weak.'),
            sig('A2', 'Capital Return Quality', 'anchors', 'score_only', 15, 'flag', 'Returns on invested capital are far below the cost of capital. Every rupee reinvested is currently destroying value on this metric — growth stage justification, but the spread must close.'),
            sig('A3', 'Compounding Durability', 'anchors', 'score_only', 10, 'flag', 'ROCE has exceeded cost of equity in 0 of the last 5 years (listed only 3 years, all loss-making until recently). No compounding track record yet.'),
          ],
        },
        {
          id: 'modifiers', name: 'Quality Modifiers', role: 'scored', weight: 0.35, score: 52, signals: [
            sig('B1', 'Pricing Power Signal', 'modifiers', 'score_only', 62, 'monitor', 'Gross margins have improved from 38% to 52% — platform take rates are increasing, suggesting emerging pricing power. But margins are still volatile.'),
            sig('B2', 'Earnings Reality Check', 'modifiers', 'score_only', 30, 'flag', 'Cash conversion from operations is weak — OCF/EBITDA at 0.35. Reported profitability is not yet translating to real cash at a reliable rate.'),
            sig('B3', 'Efficiency Trajectory', 'modifiers', 'score_only', 55, 'monitor', 'Asset turnover is improving as revenue scales — positive trajectory but still below industry benchmarks.'),
          ],
        },
        {
          id: 'context', name: 'Risk-Adjustment', role: 'context', weight: 0.15, score: 38, signals: [
            sig('C1', 'Earnings Stability', 'context', 'score_only', 15, 'flag', 'Earnings have been highly variable — from large losses to first-time profit. Standard deviation of EPS growth is extreme.'),
            sig('C2', 'Value Creation Signal', 'context', 'score_only', 12, 'flag', 'ROIC is below WACC — the company is currently in value-destruction territory. Negative ROIC-WACC spread of ~8%.'),
            sig('C3', 'Growth Sustainability', 'context', 'score_only', 55, 'monitor', 'Reinvestment rate is high at ROIC below WACC — concerning pattern. However, the nature of the investment (building a network) could justify this if unit economics improve.'),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      confidence: confidence(9, 9, 'FY20–FY24', { tooltip: 'Based on 9 of 9 signals (BFSI) | Data: FY20–FY24' }),
      groups: [
        {
          id: 'anchors', name: 'Core Profitability', role: 'anchor', score: 72, signals: [
            sig('A1', 'Cash Profitability Quality', 'anchors', 'score_only', 70, 'strong', 'Cash-based profitability is solid — NIM of 4.1% and pre-provision operating profit growth are healthy for a large private bank.', { isBfsiSubstitute: true, bfsiOriginal: 'Cash-based OP / Assets' }),
            sig('A2', 'Capital Return Quality', 'anchors', 'score_only', 72, 'strong', 'ROE of 16% vs cost of equity of ~13% — positive value creation spread. Improving from the 2019-20 lows.'),
            sig('A3', 'Compounding Durability', 'anchors', 'score_only', 60, 'monitor', 'ROCE has exceeded cost of equity in 6 of the last 10 years — the 4 weak years were during the NPA crisis (2017-2020). Recovering trajectory.'),
          ],
        },
        {
          id: 'modifiers', name: 'Quality Modifiers', role: 'scored', weight: 0.35, score: 68, signals: [
            sig('B1', 'Pricing Power Signal', 'modifiers', 'score_only', 72, 'strong', 'NIM has been stable at 4.0-4.2% — evidence of pricing discipline on both lending and deposit rates.', { isBfsiSubstitute: true, bfsiOriginal: 'Gross Profit Margin' }),
            sig('B2', 'Earnings Reality Check', 'modifiers', 'score_only', 70, 'strong', 'Earnings are well-backed by operating cash flow. Banking earnings are inherently cash-based.'),
            sig('B3', 'Efficiency Trajectory', 'modifiers', 'score_only', 62, 'monitor', 'Cost-to-income ratio improving from 58% to 52% — positive direction but still behind HDFC Bank\'s 40%.'),
          ],
        },
        {
          id: 'context', name: 'Risk-Adjustment', role: 'context', weight: 0.15, score: 65, signals: [
            sig('C1', 'Earnings Stability', 'context', 'score_only', 55, 'monitor', 'Earnings were volatile during the NPA cycle (2017-2020) but have stabilized in the last 3 years.'),
            sig('C2', 'Value Creation Signal', 'context', 'score_only', 68, 'strong', 'ROE of 16% comfortably exceeds cost of equity — the bank is creating value for shareholders.'),
            sig('C3', 'Growth Sustainability', 'context', 'score_only', 70, 'strong', 'Reinvestment rate is healthy — loan book growth of 18% is sustainable at current ROE levels without capital raise.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    confidence: confidence(9, 9),
    groups: [
      {
        id: 'anchors', name: 'Core Profitability', role: 'anchor', score: 90, signals: [
          sig('A1', 'Cash Profitability Quality', 'anchors', 'score_only', 92, 'strong', 'This company generates strong cash profitability from its assets — a robust signal of genuine economic value creation. Cash-based OP is in the top decile of Indian companies.'),
          sig('A2', 'Capital Return Quality', 'anchors', 'score_only', 90, 'strong', 'Returns on invested capital are strong and cover the cost of capital comfortably. Every rupee reinvested is growing value — ROIC of 55%+ is extraordinary.'),
          sig('A3', 'Compounding Durability', 'anchors', 'score_only', 100, 'strong', 'The company has earned returns above its cost of capital in 10 of the last 10 years — a signal of a genuine, durable competitive advantage. Textbook compounder.'),
        ],
      },
      {
        id: 'modifiers', name: 'Quality Modifiers', role: 'scored', weight: 0.35, score: 82, signals: [
          sig('B1', 'Pricing Power Signal', 'modifiers', 'score_only', 85, 'strong', 'Gross margins have been high and stable at 50-52% — the company can price its services without sacrificing margin. A core moat indicator.'),
          sig('B2', 'Earnings Reality Check', 'modifiers', 'score_only', 88, 'strong', 'Operating earnings are converting to actual cash at a high rate — these profits are real, not accounting constructs. OCF/EBITDA of 0.92.'),
          sig('B3', 'Efficiency Trajectory', 'modifiers', 'score_only', 72, 'strong', 'Asset turnover is stable at industry-leading levels — IT services model is inherently efficient.'),
        ],
      },
      {
        id: 'context', name: 'Risk-Adjustment', role: 'context', weight: 0.15, score: 85, signals: [
          sig('C1', 'Earnings Stability', 'context', 'score_only', 88, 'strong', 'Earnings have been remarkably stable — σ of annual EPS growth is very low. A defensive quality holding.'),
          sig('C2', 'Value Creation Signal', 'context', 'score_only', 90, 'strong', 'ROIC of 55%+ vs WACC of ~12% — massive, persistent value creation. The spread has been positive for 20+ years.'),
          sig('C3', 'Growth Sustainability', 'context', 'score_only', 72, 'strong', 'Reinvestment rate is moderate at strong ROIC — sustainable growth funded from internal accruals.'),
        ],
      },
    ],
  }
}

// ============================================================
// SEGMENT 3 — GROWTH
// ============================================================

function buildGrowthSignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[], confidence: ConfidenceIndicator } {
  if (stock === 'zomato') {
    return {
      confidence: confidence(5, 6, 'FY22–FY24', { state: 'limited_history' }),
      groups: [
        {
          id: 'anchors', name: 'Growth Drivers', role: 'anchor', score: 92, signals: [
            sig('A1', 'Revenue Growth Track Record', 'anchors', 'score_only', 95, 'strong', 'Revenue CAGR of 70%+ over 3 years — exceptional. Driven by both food delivery and Blinkit quick commerce. Note: base rate discount of 0.75× applied (>30% CAGR historically mean-reverts).'),
            sig('A2', 'Earnings Momentum', 'anchors', 'score_only', 82, 'strong', 'EBITDA has swung from deeply negative to positive — enormous earnings momentum. PAT growth is explosive but from a near-zero base.'),
          ],
        },
        {
          id: 'modifiers', name: 'Growth Quality', role: 'scored', weight: 0.30, score: 65, signals: [
            sig('B1', 'Real Growth Quality', 'modifiers', 'score_only', 45, 'monitor', 'FCF growth is negative — revenue growth is not yet translating to free cash flow. High capex on dark stores absorbs the upside.'),
            sig('B2', 'Compounding Consistency', 'modifiers', 'score_only', 80, 'strong', 'Revenue has grown positively in all 3 listed years — 100% consistency on a short track record.'),
          ],
        },
        {
          id: 'context', name: 'Sustainability & Runway', role: 'context', weight: 0.10, score: 60, signals: [
            sig('C1', 'Growth Sustainability Check', 'context', 'soft', 50, 'monitor', 'Actual growth rate far exceeds sustainable growth rate (ROE × retention ratio) — growth is funded by IPO cash and equity, not organic operations.', { isTriggered: true }),
            sig('C2', 'Market Opportunity Signal', 'context', 'score_only', 85, 'strong', 'Company CAGR significantly exceeds sector CAGR. TAM for quick commerce is estimated at $55B by 2030 — massive runway.'),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      confidence: confidence(6, 6, 'FY20–FY24'),
      groups: [
        {
          id: 'anchors', name: 'Growth Drivers', role: 'anchor', score: 68, signals: [
            sig('A1', 'Revenue Growth Track Record', 'anchors', 'score_only', 70, 'strong', 'NII CAGR of 16% over 3 years — above the banking sector average of 12%. Driven by retail lending mix shift and improved NIM.'),
            sig('A2', 'Earnings Momentum', 'anchors', 'score_only', 72, 'strong', 'PAT CAGR of 30%+ driven by the NPA resolution cycle. Operating profit growth of 18% is more indicative of sustainable momentum.'),
          ],
        },
        {
          id: 'modifiers', name: 'Growth Quality', role: 'scored', weight: 0.30, score: 65, signals: [
            sig('B1', 'Real Growth Quality', 'modifiers', 'score_only', 62, 'monitor', 'Cash-backed growth — banking model generates cash from operations. But Citibank portfolio acquisition inflated inorganic growth.'),
            sig('B2', 'Compounding Consistency', 'modifiers', 'score_only', 70, 'strong', 'NII growth positive in 8 of last 10 years. The 2 negative years were during the NPA cycle.'),
          ],
        },
        {
          id: 'context', name: 'Sustainability & Runway', role: 'context', weight: 0.10, score: 60, signals: [
            sig('C1', 'Growth Sustainability Check', 'context', 'score_only', 65, 'strong', 'Loan book growth of 18% is sustainable at current ROE of 16% without needing capital raise.'),
            sig('C2', 'Market Opportunity Signal', 'context', 'score_only', 55, 'monitor', 'Growing roughly in line with private banking sector — market share stable rather than gaining.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    confidence: confidence(6, 6),
    groups: [
      {
        id: 'anchors', name: 'Growth Drivers', role: 'anchor', score: 52, signals: [
          sig('A1', 'Revenue Growth Track Record', 'anchors', 'score_only', 50, 'monitor', 'Revenue CAGR of 9% (USD constant currency) over 3 years — steady but below India nominal GDP growth. IT services is a mature sector with structural 8-12% growth ceiling.'),
          sig('A2', 'Earnings Momentum', 'anchors', 'score_only', 55, 'monitor', 'EBITDA CAGR of 10% — in line with revenue. No operating leverage expansion. PAT growing at a similar pace.'),
        ],
      },
      {
        id: 'modifiers', name: 'Growth Quality', role: 'scored', weight: 0.30, score: 72, signals: [
          sig('B1', 'Real Growth Quality', 'modifiers', 'score_only', 80, 'strong', 'Growth is entirely cash-backed — FCF CAGR of 10% matches revenue growth. Among the highest-quality growth in the market.'),
          sig('B2', 'Compounding Consistency', 'modifiers', 'score_only', 100, 'strong', 'Revenue has grown positively in 10 of 10 years — 100% consistency. The most reliable topline in Indian IT.'),
        ],
      },
      {
        id: 'context', name: 'Sustainability & Runway', role: 'context', weight: 0.10, score: 60, signals: [
          sig('C1', 'Growth Sustainability Check', 'context', 'score_only', 72, 'strong', 'Growth rate is sustainable and well within the bounds of ROE × retention ratio. Organic, self-funded growth.'),
          sig('C2', 'Market Opportunity Signal', 'context', 'score_only', 50, 'monitor', 'Growing roughly in line with sector — market share stable. Cloud and GenAI are potential inflection points.'),
        ],
      },
    ],
  }
}

// ============================================================
// SEGMENT 4 — VALUATION
// ============================================================

function buildValuationSignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[], confidence: ConfidenceIndicator } {
  if (stock === 'zomato') {
    return {
      confidence: confidence(4, 6, 'FY22–FY24', { state: 'limited_history', tooltip: 'Based on 4 of 6 signals. Own-history comparison limited — listed <3 years at time of analysis.' }),
      groups: [
        {
          id: 'L1', name: 'Sector Comparison', role: 'scored', weight: 0.40, score: 25, signals: [
            sig('L1a', 'Earnings Yield (E/P)', 'L1', 'score_only', 15, 'flag', 'This stock trades at a steep premium to its sector peers — P/E of 250x+ vs sector average of 35x. Investors are paying dramatically more for this company.'),
            sig('L1b', 'EV/EBITDA vs Peers', 'L1', 'score_only', 20, 'flag', 'EV/EBITDA of 95x vs sector average of 25x — among the most expensive stocks in the market on this metric.'),
            sig('L1c', 'Cash Flow Yield (OCF/EV)', 'L1', 'score_only', 18, 'flag', 'Cash flow yield is negligible — the market cap is enormous relative to the cash the business generates.'),
          ],
        },
        {
          id: 'L2', name: 'Historical Range', role: 'scored', weight: 0.35, score: 40, signals: [
            sig('L2a', 'P/E vs Own History', 'L2', 'score_only', 35, 'flag', 'Current P/E is at the expensive end of its short listed history — near all-time high multiples.'),
            sig('L2b', 'EV/EBITDA vs Own History', 'L2', 'score_only', 42, 'monitor', 'EV/EBITDA has actually improved as EBITDA turned positive — but still at premium levels.'),
            sig('L2c', 'P/B vs Own History', 'L2', 'score_only', 45, 'monitor', 'P/B is near the middle of its listing range — not as stretched as earnings-based multiples.'),
          ],
        },
        {
          id: 'L3', name: 'Value Benchmark', role: 'scored', weight: 0.25, score: 15, signals: [
            sig('L3a', 'EV/EBITDA vs Absolute Band', 'L3', 'score_only', 10, 'flag', 'EV/EBITDA of 95x far exceeds any reasonable absolute band for any sector in India.'),
            sig('L3b', 'Earnings Yield vs G-Sec', 'L3', 'soft', 8, 'flag', 'Earnings yield of 0.4% is dramatically below the 10Y G-Sec yield of 7.1% + 3% premium. Investors accept near-zero current yield betting entirely on future growth.', { isTriggered: true }),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      confidence: confidence(6, 6),
      groups: [
        {
          id: 'L1', name: 'Sector Comparison', role: 'scored', weight: 0.40, score: 72, signals: [
            sig('L1a', 'Earnings Yield (E/P)', 'L1', 'score_only', 70, 'strong', 'P/E of 14x vs private banking sector average of 16x — this stock is priced at a modest discount to peers.'),
            sig('L1b', 'Book Value (P/B)', 'L1', 'score_only', 72, 'strong', 'P/B of 2.1x vs sector average of 2.5x — reasonably priced on adjusted book value. Below HDFC Bank\'s 3.0x.', { isBfsiSubstitute: true, bfsiOriginal: 'EV/EBITDA' }),
            sig('L1c', 'Cash Flow Yield (OCF/EV)', 'L1', 'score_only', 68, 'strong', 'Cash yield is healthy — banking operations generate predictable cash relative to market cap.'),
          ],
        },
        {
          id: 'L2', name: 'Historical Range', role: 'scored', weight: 0.35, score: 65, signals: [
            sig('L2a', 'P/E vs Own History', 'L2', 'score_only', 62, 'monitor', 'Current P/E of 14x is near the mid-point of its 3-5 year range (10-18x). Not unusually cheap or expensive.'),
            sig('L2b', 'P/B vs Own History', 'L2', 'score_only', 68, 'strong', 'P/B of 2.1x is below the 3-year average of 2.3x — slightly cheaper than its recent history.'),
            sig('L2c', 'Adj Book Value', 'L2', 'score_only', 72, 'strong', 'Adjusted book value (BV minus net NPAs) shows a cleaner P/ABV of 2.2x — reasonable for asset quality.', { isBfsiSubstitute: true }),
          ],
        },
        {
          id: 'L3', name: 'Value Benchmark', role: 'scored', weight: 0.25, score: 70, signals: [
            sig('L3a', 'P/B vs Absolute Band', 'L3', 'score_only', 65, 'strong', 'P/B of 2.1x — above the "attractive" threshold of 1.5x for private banks, but reasonable for quality.', { isBfsiSubstitute: true, bfsiOriginal: 'EV/EBITDA Absolute' }),
            sig('L3b', 'Earnings Yield vs G-Sec', 'L3', 'score_only', 75, 'strong', 'Earnings yield of 7.1% matches the 10Y G-Sec yield — reasonable at current rate environment. Modest premium over risk-free.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    confidence: confidence(6, 6),
    groups: [
      {
        id: 'L1', name: 'Sector Comparison', role: 'scored', weight: 0.40, score: 45, signals: [
          sig('L1a', 'Earnings Yield (E/P)', 'L1', 'score_only', 42, 'monitor', 'P/E of 30x vs IT sector average of 25x — this stock trades at a premium to peers, reflecting its quality positioning.'),
          sig('L1b', 'EV/EBITDA vs Peers', 'L1', 'score_only', 45, 'monitor', 'EV/EBITDA of 22x vs sector average of 18x — premium justified by margins but limits upside.'),
          sig('L1c', 'Cash Flow Yield (OCF/EV)', 'L1', 'score_only', 48, 'monitor', 'Cash yield of 3.8% — reasonable for a quality compounder but not cheap.'),
        ],
      },
      {
        id: 'L2', name: 'Historical Range', role: 'scored', weight: 0.35, score: 55, signals: [
          sig('L2a', 'P/E vs Own History', 'L2', 'score_only', 52, 'monitor', 'Current P/E of 30x is near the top of its 3-5 year range (22-32x). Priced above the 5-year average of 27x.'),
          sig('L2b', 'EV/EBITDA vs Own History', 'L2', 'score_only', 55, 'monitor', 'EV/EBITDA is at the mid-to-high end of its own range — slightly expensive by its own standards.'),
          sig('L2c', 'P/B vs Own History', 'L2', 'score_only', 58, 'monitor', 'P/B of 14x — high in absolute terms but typical for an asset-light IT company with 45% ROE.'),
        ],
      },
      {
        id: 'L3', name: 'Value Benchmark', role: 'scored', weight: 0.25, score: 50, signals: [
          sig('L3a', 'EV/EBITDA vs Absolute Band', 'L3', 'score_only', 40, 'monitor', 'EV/EBITDA of 22x exceeds the IT sector attractive band of <15x. Fair but not compelling on absolute terms.'),
          sig('L3b', 'Earnings Yield vs G-Sec', 'L3', 'soft', 55, 'monitor', 'Earnings yield of 3.3% is below G-Sec yield of 7.1% — stock offers no premium over government bonds on current earnings. Growth premium pricing.'),
        ],
      },
    ],
  }
}

// ============================================================
// SEGMENT 5 — TECHNICAL INDICATORS
// ============================================================

function buildTechnicalSignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[], confidence: ConfidenceIndicator } {
  if (stock === 'zomato') {
    return {
      confidence: confidence(5, 5),
      groups: [
        {
          id: 'anchors', name: 'Momentum & Trend', role: 'anchor', score: 78, signals: [
            sig('A1', 'Price Momentum Strength', 'anchors', 'score_only', 85, 'strong', '12-minus-1 momentum is strongly positive. Stock has gained 120%+ in the last year with the last month excluded — exceptional risk-adjusted momentum.'),
            sig('A2', 'Trend Direction', 'anchors', 'score_only', 82, 'strong', 'Price is well above the 200-day EMA — firmly in an uptrend regime. No signs of trend reversal.'),
          ],
        },
        {
          id: 'modifiers', name: 'Relative Strength & Confirmation', role: 'scored', weight: 0.30, score: 72, signals: [
            sig('B1', 'Market Leadership', 'modifiers', 'score_only', 78, 'strong', 'Stock has outperformed the Nifty 500 TRI by 85%+ over 6 months — among the strongest relative performers in the market.'),
            sig('B2', 'Momentum Health', 'modifiers', 'score_only', 62, 'monitor', 'RSI(14) at 62 — in the bullish zone above 60 but not extreme. Momentum is healthy without being stretched.'),
          ],
        },
        {
          id: 'context', name: 'Volume Confirmation', role: 'context', weight: 0.10, score: 70, signals: [
            sig('C1', 'Volume Backing', 'context', 'score_only', 70, 'strong', '20-day average volume is rising alongside price — institutional buying is confirming the trend. Volume-price alignment is positive.'),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      confidence: confidence(5, 5),
      groups: [
        {
          id: 'anchors', name: 'Momentum & Trend', role: 'anchor', score: 55, signals: [
            sig('A1', 'Price Momentum Strength', 'anchors', 'score_only', 52, 'monitor', '12-minus-1 momentum is mildly positive. Stock has gained ~15% — roughly in line with Nifty Bank. No strong directional signal.'),
            sig('A2', 'Trend Direction', 'anchors', 'score_only', 50, 'monitor', 'Price is near the 200-day EMA (within 2%) — neutral trend regime. Could break either way.'),
          ],
        },
        {
          id: 'modifiers', name: 'Relative Strength & Confirmation', role: 'scored', weight: 0.30, score: 55, signals: [
            sig('B1', 'Market Leadership', 'modifiers', 'score_only', 48, 'monitor', 'Stock has slightly underperformed Nifty 500 TRI over 6 months — not a market leader at this point.'),
            sig('B2', 'Momentum Health', 'modifiers', 'score_only', 52, 'monitor', 'RSI(14) at 52 — dead neutral. No directional bias from momentum indicator.'),
          ],
        },
        {
          id: 'context', name: 'Volume Confirmation', role: 'context', weight: 0.10, score: 50, signals: [
            sig('C1', 'Volume Backing', 'context', 'score_only', 50, 'monitor', 'Volume is flat — neither confirming nor denying direction. Consolidation pattern in both price and volume.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    confidence: confidence(5, 5),
    groups: [
      {
        id: 'anchors', name: 'Momentum & Trend', role: 'anchor', score: 45, signals: [
          sig('A1', 'Price Momentum Strength', 'anchors', 'score_only', 40, 'monitor', '12-minus-1 momentum is weak. Stock has underperformed the market — IT sector headwinds from macro uncertainty are weighing on price.'),
          sig('A2', 'Trend Direction', 'anchors', 'score_only', 42, 'monitor', 'Price is slightly below the 200-day EMA — mild downtrend regime. Not a sharp decline but not positive.'),
        ],
      },
      {
        id: 'modifiers', name: 'Relative Strength & Confirmation', role: 'scored', weight: 0.30, score: 48, signals: [
          sig('B1', 'Market Leadership', 'modifiers', 'score_only', 42, 'monitor', 'Stock has underperformed Nifty 500 TRI by 10% over 6 months — relative weakness from sector rotation.'),
          sig('B2', 'Momentum Health', 'modifiers', 'score_only', 48, 'monitor', 'RSI(14) at 48 — neutral with a slight bearish lean. No extreme readings.'),
        ],
      },
      {
        id: 'context', name: 'Volume Confirmation', role: 'context', weight: 0.10, score: 55, signals: [
          sig('C1', 'Volume Backing', 'context', 'score_only', 55, 'monitor', 'Volume is stable — range-bound trading with no volume catalyst. Waiting for a trigger (earnings, macro, deals).'),
        ],
      },
    ],
  }
}

// ============================================================
// SEGMENT 6 — PERFORMANCE (Context Only)
// ============================================================

function buildPerformanceSignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[] } {
  if (stock === 'zomato') {
    return {
      groups: [
        {
          id: 'returns', name: 'Price Returns', role: 'context', signals: [
            sig('P1', 'Price Return Track Record', 'returns', 'score_only', undefined, 'strong', '1Y: +120% vs Nifty 500 TRI +18%. 3Y: +85% CAGR. One of the top-performing large-caps. Significantly above all benchmarks.'),
            sig('P2', 'Risk-Adjusted Return', 'returns', 'score_only', undefined, 'strong', 'Sortino Ratio (3Y) of 1.8 — strong risk-adjusted returns. High returns with moderate downside volatility.'),
          ],
        },
        {
          id: 'risk', name: 'Risk Metrics', role: 'context', signals: [
            sig('P3', 'Worst Historical Loss', 'risk', 'score_only', undefined, 'monitor', 'Max drawdown of -52% (FY22–FY23) during the tech selloff — severe but recovered fully. High-beta stock.'),
            sig('P4', 'Market Sensitivity', 'risk', 'score_only', undefined, 'monitor', 'Beta of 1.6 vs Nifty 500 — high sensitivity. Amplifies market moves in both directions.'),
          ],
        },
        {
          id: 'liquidity', name: 'Liquidity Score', role: 'context', signals: [
            sig('P5', 'Liquidity Tier', 'liquidity', 'score_only', undefined, 'strong', 'Tier 5 — Nifty 50 constituent. ADTV > ₹1,500 Cr. F&O eligible. Impact cost < 0.10%. Maximum liquidity.'),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      groups: [
        {
          id: 'returns', name: 'Price Returns', role: 'context', signals: [
            sig('P1', 'Price Return Track Record', 'returns', 'score_only', undefined, 'monitor', '1Y: +15% vs Nifty 500 TRI +18%. 3Y: +12% CAGR. In-line with banking peers — not a standout performer.'),
            sig('P2', 'Risk-Adjusted Return', 'returns', 'score_only', undefined, 'monitor', 'Sortino Ratio (3Y) of 0.9 — moderate. Decent returns with manageable downside.'),
          ],
        },
        {
          id: 'risk', name: 'Risk Metrics', role: 'context', signals: [
            sig('P3', 'Worst Historical Loss', 'risk', 'score_only', undefined, 'monitor', 'Max drawdown of -38% (FY20 COVID crash). Recovered within 12 months. Typical for a large-cap bank.'),
            sig('P4', 'Market Sensitivity', 'risk', 'score_only', undefined, 'monitor', 'Beta of 1.15 vs Nifty 500 — slightly above market. Typical for a private sector bank.'),
          ],
        },
        {
          id: 'liquidity', name: 'Liquidity Score', role: 'context', signals: [
            sig('P5', 'Liquidity Tier', 'liquidity', 'score_only', undefined, 'strong', 'Tier 5 — Nifty 50 constituent. ADTV > ₹2,000 Cr. F&O eligible. Impact cost < 0.05%. Maximum liquidity.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    groups: [
      {
        id: 'returns', name: 'Price Returns', role: 'context', signals: [
          sig('P1', 'Price Return Track Record', 'returns', 'score_only', undefined, 'monitor', '1Y: +8% vs Nifty 500 TRI +18%. 5Y: +12% CAGR. Underperforming market — IT sector in a cautious phase.'),
          sig('P2', 'Risk-Adjusted Return', 'returns', 'score_only', undefined, 'strong', 'Sortino Ratio (3Y) of 0.7 — moderate. Lower returns but also lower downside volatility — defensive quality.'),
        ],
      },
      {
        id: 'risk', name: 'Risk Metrics', role: 'context', signals: [
          sig('P3', 'Worst Historical Loss', 'risk', 'score_only', undefined, 'strong', 'Max drawdown of -22% (FY20 COVID crash). Modest drawdown — defensive profile.'),
          sig('P4', 'Market Sensitivity', 'risk', 'score_only', undefined, 'strong', 'Beta of 0.72 vs Nifty 500 — defensive. Stock tends to fall less than the market during corrections.'),
        ],
      },
      {
        id: 'liquidity', name: 'Liquidity Score', role: 'context', signals: [
          sig('P5', 'Liquidity Tier', 'liquidity', 'score_only', undefined, 'strong', 'Tier 5 — Nifty 50 constituent. ADTV > ₹800 Cr. F&O eligible. Impact cost < 0.08%. Maximum liquidity.'),
        ],
      },
    ],
  }
}

// ============================================================
// SEGMENT 7 — INSTITUTIONAL & MARKET SIGNALS (Context Only)
// ============================================================

function buildInstitutionalSignals(stock: 'zomato' | 'axisbank' | 'tcs'): { groups: SignalGroup[] } {
  if (stock === 'zomato') {
    return {
      groups: [
        {
          id: 'analyst', name: 'Analyst Signals', role: 'context', signals: [
            sig('IS1', 'Analyst View Shift', 'analyst', 'score_only', undefined, 'strong', 'Consensus EPS estimates have been revised up by 35% over the last 3 months — strong positive momentum in analyst expectations.'),
            sig('IS4', 'Analyst Recommendation Shift', 'analyst', 'score_only', undefined, 'strong', '3 upgrades vs 0 downgrades in the last quarter. Analysts are becoming more bullish as profitability proves sustainable.'),
            sig('IS7', 'Analyst Target Gap', 'analyst', 'score_only', undefined, 'monitor', 'Consensus target price implies 12% upside — modest after the 120% rally. Some targets are stale.'),
          ],
        },
        {
          id: 'institutional', name: 'Institutional Flow', role: 'context', signals: [
            sig('IS2', 'Institutional Flow', 'institutional', 'score_only', undefined, 'strong', 'FII holding increased from 35% to 42% over last 4 quarters — sustained buying by foreign institutions.'),
            sig('IS5', 'Domestic Fund Flow', 'institutional', 'score_only', undefined, 'strong', 'MF holding increased from 6% to 9% — domestic funds are adding Zomato across large-cap and flexi-cap schemes.'),
            sig('IS6', 'Foreign Investor Flow', 'institutional', 'score_only', undefined, 'strong', 'FII buying has been consistent and large-scale — this is a core holding for most India-focused EM funds.'),
          ],
        },
        {
          id: 'promoter', name: 'Promoter Conviction', role: 'context', signals: [
            sig('IS3', 'Promoter Conviction Signal', 'promoter', 'score_only', undefined, 'strong', 'Deepinder Goyal has been increasing stake through open market purchases — strongest single positive signal for a founder-led company.'),
          ],
        },
      ],
    }
  }

  if (stock === 'axisbank') {
    return {
      groups: [
        {
          id: 'analyst', name: 'Analyst Signals', role: 'context', signals: [
            sig('IS1', 'Analyst View Shift', 'analyst', 'score_only', undefined, 'strong', 'EPS estimates revised up 8% over 3 months — moderate positive drift reflecting improving asset quality.'),
            sig('IS4', 'Analyst Recommendation Shift', 'analyst', 'score_only', undefined, 'strong', '2 upgrades vs 1 downgrade. Net positive but no dramatic shift — consensus has been broadly positive.'),
            sig('IS7', 'Analyst Target Gap', 'analyst', 'score_only', undefined, 'strong', 'Consensus target implies 15% upside — reasonable gap suggesting room for appreciation.'),
          ],
        },
        {
          id: 'institutional', name: 'Institutional Flow', role: 'context', signals: [
            sig('IS2', 'Institutional Flow', 'institutional', 'score_only', undefined, 'strong', 'FII holding at 48% — one of the highest in Indian banking. Stable over 4 quarters.'),
            sig('IS5', 'Domestic Fund Flow', 'institutional', 'score_only', undefined, 'monitor', 'MF holding at 12% — stable. No significant accumulation or distribution recently.'),
            sig('IS6', 'Foreign Investor Flow', 'institutional', 'score_only', undefined, 'monitor', 'FII stake flat QoQ — no new buying but also no selling. Holding pattern.'),
          ],
        },
        {
          id: 'promoter', name: 'Promoter Conviction', role: 'context', signals: [
            sig('IS3', 'Promoter Conviction Signal', 'promoter', 'score_only', undefined, 'monitor', 'No promoter — professionally managed bank. Board members have exercised and retained ESOPs.'),
          ],
        },
        {
          id: 'credit', name: 'Credit & Market', role: 'context', signals: [
            sig('IS10', 'Credit Signal', 'credit', 'score_only', undefined, 'strong', 'CRISIL AA+ rating — stable outlook. No recent rating action. Credit profile is solid.'),
          ],
        },
      ],
    }
  }

  // TCS
  return {
    groups: [
      {
        id: 'analyst', name: 'Analyst Signals', role: 'context', signals: [
          sig('IS1', 'Analyst View Shift', 'analyst', 'score_only', undefined, 'monitor', 'EPS estimates flat over 3 months — no positive revisions. IT sector guidance is cautious.'),
          sig('IS4', 'Analyst Recommendation Shift', 'analyst', 'score_only', undefined, 'monitor', '0 upgrades, 1 downgrade. Consensus is cautiously positive but not enthusiastic at current valuations.'),
          sig('IS7', 'Analyst Target Gap', 'analyst', 'score_only', undefined, 'monitor', 'Consensus target implies 8% upside — limited upside at current prices.'),
        ],
      },
      {
        id: 'institutional', name: 'Institutional Flow', role: 'context', signals: [
          sig('IS2', 'Institutional Flow', 'institutional', 'score_only', undefined, 'monitor', 'FII holding at 12% — stable. Tata Sons holds 72%, leaving limited free float for institutional activity.'),
          sig('IS5', 'Domestic Fund Flow', 'institutional', 'score_only', undefined, 'monitor', 'MF holding at 5% — small and stable. TCS is primarily a Tata group holding, not a fund favorite by weight.'),
          sig('IS6', 'Foreign Investor Flow', 'institutional', 'score_only', undefined, 'monitor', 'FII holding flat — limited free float constrains institutional activity.'),
        ],
      },
      {
        id: 'promoter', name: 'Promoter Conviction', role: 'context', signals: [
          sig('IS3', 'Promoter Conviction Signal', 'promoter', 'score_only', undefined, 'strong', 'Tata Sons holding stable at 72% with zero pledge — maximum promoter conviction. No selling in over 20 years.'),
        ],
      },
      {
        id: 'credit', name: 'Credit & Market', role: 'context', signals: [
          sig('IS10', 'Credit Signal', 'credit', 'score_only', undefined, 'strong', 'CRISIL AAA rating — highest possible. Reflects zero debt and Tata group backing.'),
        ],
      },
    ],
  }
}

// ============================================================
// EXPORTED: Build complete Quant segments with Layer 4 data
// ============================================================

export function buildQuantSegmentsV2(stock: 'zomato' | 'axisbank' | 'tcs'): SegmentVerdictV2[] {
  const fh = buildFHSignals(stock)
  const pr = buildProfitabilitySignals(stock)
  const gr = buildGrowthSignals(stock)
  const va = buildValuationSignals(stock)
  const ti = buildTechnicalSignals(stock)
  const perf = buildPerformanceSignals(stock)
  const inst = buildInstitutionalSignals(stock)

  // Stock-specific scores (preserved from existing mock data)
  const scores: Record<string, Record<string, { score: number; interpretation: string; quickInsight: string }>> = {
    zomato: {
      profitability: { score: 42, interpretation: 'First profitable quarter achieved but margins still thin. ROE is low at 4% vs sector avg 12%.', quickInsight: 'Just turned profitable — early innings' },
      growth: { score: 92, interpretation: 'Revenue CAGR of 70%+ driven by Blinkit quick commerce. TAM runway remains massive.', quickInsight: 'Hypergrowth — 70%+ revenue CAGR' },
      valuation: { score: 35, interpretation: 'P/S ratio of 12x vs sector average 6x. Premium pricing assumes sustained hypergrowth.', quickInsight: 'Expensive — priced for perfection' },
      financial_health: { score: 58, interpretation: 'Cash-rich balance sheet from IPO proceeds. But operating cash flow just turned positive.', quickInsight: 'Strong cash position, weak operating cash flow' },
      technical: { score: 75, interpretation: 'Strong uptrend with price above 50 & 200 DMA. RSI at 62 — bullish but not overbought.', quickInsight: 'Bullish trend intact' },
      performance: { score: 0, interpretation: '1Y return of 120%+, significantly outperforming Nifty. High trading volumes confirm institutional interest.', quickInsight: '120% return in 1 year' },
      institutional: { score: 0, interpretation: 'FII holding increased from 35% to 42% in last 4 quarters. 18 of 22 analysts rate BUY.', quickInsight: 'Strong FII buying + analyst consensus BUY' },
    },
    axisbank: {
      profitability: { score: 72, interpretation: 'ROE of 16% is above sector average. NIM stable at 4.1%. Cost-to-income ratio improving.', quickInsight: 'Solid profitability — 16% ROE' },
      growth: { score: 65, interpretation: 'Loan book growing at 18% CAGR. Retail lending mix improving. Fee income growing 20%+.', quickInsight: 'Steady 18% loan growth' },
      valuation: { score: 68, interpretation: 'P/B of 2.1x vs sector average 2.5x — reasonably priced for the quality. P/E of 14x is fair.', quickInsight: 'Fair value — P/B 2.1x' },
      financial_health: { score: 75, interpretation: 'CAR at 17.5% (well above regulatory 11.5%). GNPA at 1.8% — clean book. PCR at 78%.', quickInsight: 'Strong capital adequacy & clean asset quality' },
      technical: { score: 60, interpretation: 'Trading near 200 DMA. RSI at 52 — neutral. Consolidation phase after recent rally.', quickInsight: 'Neutral — consolidating' },
      performance: { score: 0, interpretation: '1Y return of 15%, roughly in line with Nifty Bank. Underperforming ICICI Bank but outperforming SBI.', quickInsight: 'In-line with banking peers' },
      institutional: { score: 0, interpretation: 'FII holding at 48% — one of the highest in banking. 15 of 20 analysts rate BUY with avg target 15% upside.', quickInsight: 'High FII confidence + analyst BUY consensus' },
    },
    tcs: {
      profitability: { score: 88, interpretation: 'Industry-leading margins at 26%+ operating margin. ROE consistently above 40%. Cash-rich business.', quickInsight: 'Best-in-class margins — 26%+ OPM' },
      growth: { score: 55, interpretation: 'Revenue growth of 8-10% in constant currency — steady but not exciting. Order book remains strong.', quickInsight: 'Steady but not exciting — 8-10% CC growth' },
      valuation: { score: 50, interpretation: 'P/E of 30x on FY25E — premium for quality but leaves limited upside. Trading above historical average.', quickInsight: 'Fair to expensive — P/E 30x' },
      financial_health: { score: 92, interpretation: 'Zero debt, ₹45K Cr cash. Strong FCF generation. One of the most financially sound companies in India.', quickInsight: 'Fort Knox balance sheet — zero debt, ₹45K Cr cash' },
      technical: { score: 52, interpretation: 'Range-bound between ₹3,800-4,200. RSI at 48 — neutral. Waiting for directional trigger.', quickInsight: 'Range-bound — waiting for trigger' },
      performance: { score: 0, interpretation: '1Y return of 8%, underperforming Nifty. IT sector in a cautious phase due to macro uncertainty.', quickInsight: 'Underperforming market — sector headwinds' },
      institutional: { score: 0, interpretation: 'FII holding at 12% — stable. MF holding at 5%. 12 of 18 analysts rate BUY/HOLD. Seen as defensive quality play.', quickInsight: 'Defensive favorite — stable institutional interest' },
    },
  }

  const s = scores[stock]

  // Check if any FH gate failed
  const fhGateFailed = fh.groups[0]?.signals.some(g => g.gatePassed === false)

  return [
    // Segment 1 — Financial Health
    {
      id: 'financial_health', name: 'Financial Health', pillar: 'quant', scoringType: 'scored',
      score: fhGateFailed ? 10 : s.financial_health.score,
      scoreBand: fhGateFailed ? 'suppressed' : getScoreBandEnum(s.financial_health.score),
      weight: 20,
      status: fhGateFailed ? 'negative' : (s.financial_health.score >= 60 ? 'positive' : s.financial_health.score >= 40 ? 'neutral' : 'negative'),
      interpretation: s.financial_health.interpretation,
      quickInsight: s.financial_health.quickInsight,
      scoreJustification: fhGateFailed
        ? 'Score suppressed — a hard gate has failed. See Red Flag above for details.'
        : `Scored ${s.financial_health.score}/100: ${s.financial_health.interpretation}`,
      isSuppressed: fhGateFailed,
      suppressionReason: fhGateFailed ? 'Hard gate failure — Cash Flow Viability (G4) triggered' : undefined,
      confidenceIndicator: fh.confidence,
      signalGroups: fh.groups,
      metrics: [],
    },
    // Segment 2 — Profitability
    {
      id: 'profitability', name: 'Profitability', pillar: 'quant', scoringType: 'scored',
      score: s.profitability.score, scoreBand: getScoreBandEnum(s.profitability.score), weight: 20,
      status: s.profitability.score >= 60 ? 'positive' : s.profitability.score >= 40 ? 'neutral' : 'negative',
      interpretation: s.profitability.interpretation,
      quickInsight: s.profitability.quickInsight,
      scoreJustification: `Scored ${s.profitability.score}/100: ${s.profitability.interpretation}`,
      confidenceIndicator: pr.confidence,
      signalGroups: pr.groups,
      metrics: [],
    },
    // Segment 3 — Growth
    {
      id: 'growth', name: 'Growth', pillar: 'quant', scoringType: 'scored',
      score: s.growth.score, scoreBand: getScoreBandEnum(s.growth.score), weight: 20,
      status: s.growth.score >= 60 ? 'positive' : s.growth.score >= 40 ? 'neutral' : 'negative',
      interpretation: s.growth.interpretation,
      quickInsight: s.growth.quickInsight,
      scoreJustification: `Scored ${s.growth.score}/100: ${s.growth.interpretation}`,
      confidenceIndicator: gr.confidence,
      signalGroups: gr.groups,
      metrics: [],
    },
    // Segment 4 — Valuation
    {
      id: 'valuation', name: 'Valuation', pillar: 'quant', scoringType: 'scored',
      score: s.valuation.score, scoreBand: getScoreBandEnum(s.valuation.score), weight: 20,
      status: s.valuation.score >= 60 ? 'positive' : s.valuation.score >= 40 ? 'neutral' : 'negative',
      interpretation: s.valuation.interpretation,
      quickInsight: s.valuation.quickInsight,
      scoreJustification: `Scored ${s.valuation.score}/100: ${s.valuation.interpretation}`,
      confidenceIndicator: va.confidence,
      signalGroups: va.groups,
      metrics: [],
    },
    // Segment 5 — Technical Indicators
    {
      id: 'technical', name: 'Technical Indicators', pillar: 'quant', scoringType: 'scored',
      score: s.technical.score, scoreBand: getScoreBandEnum(s.technical.score), weight: 20,
      status: s.technical.score >= 60 ? 'positive' : s.technical.score >= 40 ? 'neutral' : 'negative',
      interpretation: s.technical.interpretation,
      quickInsight: s.technical.quickInsight,
      scoreJustification: `Scored ${s.technical.score}/100: ${s.technical.interpretation}`,
      confidenceIndicator: ti.confidence,
      signalGroups: ti.groups,
      metrics: [],
    },
    // Segment 6 — Performance (Context Only)
    {
      id: 'performance', name: 'Performance', pillar: 'quant', scoringType: 'context',
      status: s.performance.score === 0 ? (stock === 'zomato' ? 'positive' : 'neutral') : 'neutral',
      interpretation: s.performance.interpretation,
      quickInsight: s.performance.quickInsight,
      signalGroups: perf.groups,
      metrics: [],
    },
    // Segment 7 — Institutional & Market Signals (Context Only)
    {
      id: 'institutional_signals', name: 'Institutional / Market Signals', pillar: 'quant', scoringType: 'context',
      status: s.institutional.score === 0 ? 'positive' : 'neutral',
      interpretation: s.institutional.interpretation,
      quickInsight: s.institutional.quickInsight,
      signalGroups: inst.groups,
      metrics: [],
    },
  ]
}
