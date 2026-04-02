/**
 * Vercel Serverless Function — BSE India API Proxy
 *
 * Proxies requests from /api/bse/* to https://api.bseindia.com/BseIndiaAPI/api/*
 * Adds required headers (Referer, User-Agent) to avoid BSE blocks.
 * No API key needed — BSE endpoints are public.
 *
 * Route: /api/bse/AnnGetData/w?strCat=...&strScrip=...
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const BSE_BASE = 'https://api.bseindia.com/BseIndiaAPI/api'

const ALLOWED_ORIGINS = [
  'https://stockfox.vercel.app',
  'https://sf-backtesting.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ALLOWED_PREFIXES = [
  '/AnnGetData/',
  '/CorporateAction/',
  '/ComHeader/',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { path, ...queryParams } = req.query
  const bsePath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (!ALLOWED_PREFIXES.some(p => bsePath.startsWith(p))) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  // Build query string
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParams)) {
    if (typeof value === 'string') params.set(key, value)
  }

  const qs = params.toString()
  const targetUrl = `${BSE_BASE}${bsePath}${qs ? `?${qs}` : ''}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; StockFox/1.0)',
        'Referer': 'https://www.bseindia.com/',
      },
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
      // Corporate filings change rarely — cache 6 hours
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[BSE Proxy] Failed to fetch ${bsePath}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
