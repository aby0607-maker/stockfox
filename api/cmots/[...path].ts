/**
 * Vercel Serverless Function — CMOTS API Proxy
 *
 * Proxies requests from /api/cmots/* to https://deltastockzapis.cmots.com/api/*
 * Adds Bearer auth token from environment variable.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const CMOTS_BASE = 'https://deltastockzapis.cmots.com/api'

const ALLOWED_ORIGINS = [
  'https://stockfox.vercel.app',
  'https://sf-backtesting.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ALLOWED_PREFIXES = [
  '/companymaster',
  '/TTMData',
  '/FinData',
  '/ProftandLoss',
  '/CashFlow',
  '/BalanceSheet',
  '/QuarterlyResults',
  '/AdjustedPriceChart',
  '/Aggregate-Share-Holding',
  '/BSEDelayedPriceFeed',
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.CMOTS_API_TOKEN
  if (!token) {
    console.error('[CMOTS Proxy] CMOTS_API_TOKEN not configured')
    return res.status(500).json({ error: 'API not configured' })
  }

  const { path } = req.query
  const cmotPath = Array.isArray(path) ? `/${path.join('/')}` : `/${path}`

  if (cmotPath.includes('..') || cmotPath.includes('//')) {
    return res.status(400).json({ error: 'Invalid path' })
  }

  const isAllowed = ALLOWED_PREFIXES.some(prefix => cmotPath.startsWith(prefix))
  if (!isAllowed) {
    return res.status(403).json({ error: 'Endpoint not allowed' })
  }

  const targetUrl = `${CMOTS_BASE}${cmotPath}`

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const contentType = upstream.headers.get('content-type') || 'application/json'
    const body = await upstream.text()

    const origin = req.headers?.origin ?? ''
    if (ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Content-Type', contentType)
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('X-Content-Type-Options', 'nosniff')

    if (upstream.ok) {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    }

    return res.status(upstream.status).send(body)
  } catch (error) {
    console.error(`[CMOTS Proxy] Failed to fetch ${targetUrl}:`, error)
    return res.status(502).json({ error: 'Upstream API error' })
  }
}
