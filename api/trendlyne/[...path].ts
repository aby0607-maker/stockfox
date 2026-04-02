/**
 * Vercel Serverless Function — Trendlyne Proxy
 *
 * Proxies requests from /api/trendlyne/* to https://trendlyne.com/*
 * Adds required User-Agent header (Trendlyne returns 403 without it).
 * No API key needed — these are public endpoints.
 *
 * Route: /api/trendlyne/equity/overview-second-part/1127/
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const TRENDLYNE_BASE = 'https://trendlyne.com'

const ALLOWED_ORIGINS = [
  'https://stockfox.vercel.app',
  'https://sf-backtesting.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ALLOWED_PREFIXES = [
  '/equity/overview-second-part/',
  '/member/api/ac_snames/stock/',
  '/equity/swot-buy-or-sell/',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawPath = req.query["...path"] ?? req.query.path; const { ...queryParams } = req.query; const path = rawPath
  const tlPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (!ALLOWED_PREFIXES.some(p => tlPath.startsWith(p))) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === 'string') params.set(key, value)
  }

  const qs = params.toString()
  const targetUrl = `${TRENDLYNE_BASE}${tlPath}${qs ? `?${qs}` : ''}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json, text/html',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://trendlyne.com/',
      },
    })
    const body = await upstream.text()

    const origin = req.headers?.origin ?? ''
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (upstream.ok) {
      // Governance data changes rarely — cache 24 hours
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[Trendlyne Proxy] Failed to fetch ${tlPath}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
