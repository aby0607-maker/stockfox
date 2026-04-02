/**
 * Vercel Serverless Function — Finnhub API Proxy
 *
 * Proxies requests from /api/finnhub/* to https://finnhub.io/api/v1/*
 * Injects API token from environment variable.
 *
 * Route: /api/finnhub/stock/recommendation?symbol=RELIANCE.BSE
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const FINNHUB_BASE = 'https://finnhub.io/api/v1'

const ALLOWED_ORIGINS = [
  'https://stockfox.vercel.app',
  'https://sf-backtesting.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ALLOWED_PREFIXES = [
  '/stock/recommendation',
  '/stock/eps-estimate',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawPath = req.query["...path"] ?? req.query.path; const { ...queryParams } = req.query; const path = rawPath
  const finnhubPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (!ALLOWED_PREFIXES.some(p => finnhubPath.startsWith(p))) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  const token = process.env.FINNHUB_API_KEY
  if (!token) {
    return res.status(500).json({ error: 'Finnhub API key not configured' })
  }

  // Build query string from remaining params
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === 'string') params.set(key, value)
  }
  params.set('token', token)

  const targetUrl = `${FINNHUB_BASE}${finnhubPath}?${params.toString()}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'Accept': 'application/json' },
    })
    const body = await upstream.text()

    const origin = req.headers?.origin ?? ''
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=172800')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[Finnhub Proxy] Failed to fetch ${finnhubPath}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
