/**
 * Vercel Serverless Function — DhanHQ API Proxy
 *
 * Proxies POST requests from /api/dhan/* to https://api.dhan.co/v2/*
 * Adds access-token header from environment variable.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const DHAN_BASE = 'https://api.dhan.co/v2'

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
  '/charts/historical',
  '/charts/intraday',
  '/marketfeed/ltp',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed — DhanHQ endpoints require POST' })
  }

  const token = process.env.DHAN_ACCESS_TOKEN
  if (!token) {
    console.error('[DhanHQ Proxy] DHAN_ACCESS_TOKEN not configured')
    return res.status(500).json({ error: 'DhanHQ API not configured' })
  }

  const rawPath = req.query["...path"] ?? req.query.path; const path = rawPath
  const dhanPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (dhanPath.includes('..') || dhanPath.includes('//')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  const isAllowed = ALLOWED_PREFIXES.some(prefix => dhanPath.startsWith(prefix))
  if (!isAllowed) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  const targetUrl = `${DHAN_BASE}${dhanPath}`

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'access-token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    })

    const contentType = upstream.headers.get('content-type') || 'application/json'
    const body = await upstream.text()

    const origin = req.headers?.origin ?? ''
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', contentType)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[DhanHQ Proxy] Failed to fetch ${dhanPath}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
