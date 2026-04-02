/**
 * Vercel Serverless Function — IndianAPI.in API Proxy
 *
 * Proxies GET requests from /api/indianapi/* to https://stock.indianapi.in/*
 * Adds X-Api-Key header from environment variable.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const INDIANAPI_BASE = 'https://stock.indianapi.in'

const ALLOWED_ORIGINS = [
  'https://stockfox.vercel.app',
  'https://sf-backtesting.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true
  if (/^https:\/\/sf-backtesting[a-z0-9-]*\.vercel\.app$/.test(origin)) return true
  return false
}

const ALLOWED_PREFIXES = [
  '/historical_stats',
  '/historical_data',
  '/stock',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const origin = req.headers?.origin ?? ''
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed — IndianAPI endpoints require GET' })
  }

  const apiKey = process.env.INDIANAPI_KEY
  if (!apiKey) {
    console.error('[IndianAPI Proxy] INDIANAPI_KEY not configured')
    return res.status(500).json({ error: 'IndianAPI not configured' })
  }

  const rawPath = req.query["...path"] ?? req.query.path; const path = rawPath
  const iapiPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (iapiPath.includes('..') || iapiPath.includes('//')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  const isAllowed = ALLOWED_PREFIXES.some(prefix => iapiPath.startsWith(prefix))
  if (!isAllowed) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  // Forward query params (excluding 'path' which is the catch-all route param)
  const queryParams = new URLSearchParams()
  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      queryParams.set(key, value.join(','))
    } else if (value) {
      queryParams.set(key, value)
    }
  }
  const qs = queryParams.toString()
  const targetUrl = `${INDIANAPI_BASE}${iapiPath}${qs ? `?${qs}` : ''}`

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'X-Api-Key': apiKey },
    })

    const contentType = upstream.headers.get('content-type') || 'application/json'
    const body = await upstream.text()

    const origin = req.headers?.origin ?? ''
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', contentType)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[IndianAPI Proxy] Failed to fetch ${iapiPath}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
