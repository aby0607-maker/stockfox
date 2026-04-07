// Quick test: does the fetch intercept work for CMOTS calls?

const CMOTS_BASE = 'https://deltastockzapis.cmots.com/api'
const CMOTS_TOKEN = process.env.CMOTS_API_TOKEN

const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
  if (url.startsWith('/api/cmots/')) {
    const cmotPath = url.replace('/api/cmots', '')
    const targetUrl = `${CMOTS_BASE}${cmotPath}`
    console.log(`[INTERCEPT] ${url} → ${targetUrl}`)
    return originalFetch(targetUrl, {
      ...init,
      headers: { ...init?.headers as Record<string, string>, 'Authorization': `Bearer ${CMOTS_TOKEN}`, 'Content-Type': 'application/json' },
    })
  }
  return originalFetch(input, init)
}

// Test 1: Direct intercepted call
console.log('\nTest 1: Direct intercepted call')
const res1 = await fetch('/api/cmots/TTMData/476/s')
const data1 = await res1.json()
console.log('Result:', data1.success, data1.data?.length, 'records')

// Test 2: Via imported service
console.log('\nTest 2: Via imported CMOTS service')
const { getTTMData } = await import('@/services/cmots')
const ttm = await getTTMData('RELIANCE')
console.log('TTM for RELIANCE:', ttm ? 'OK' : 'FAILED')
if (ttm) {
  const t = ttm as any
  console.log(`  PE=${t.pe_ttm}, ROE=${t.roe_ttm}`)
}

// Test 3: Via scoring service
console.log('\nTest 3: Via quantScoringService')
try {
  const { computeQuantSegments } = await import('@/services/quantScoringService')
  const segments = await computeQuantSegments('RELIANCE')
  console.log(`Quant segments: ${segments.length}`)
  for (const s of segments) {
    console.log(`  ${s.name}: score=${s.score ?? '—'} (${s.scoringType})`)
  }
} catch (e: any) {
  console.log('Quant scoring FAILED:', e.message)
}

console.log('\n✅ Test complete')
