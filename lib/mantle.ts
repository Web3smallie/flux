import { createPublicClient, http } from 'viem'

export const mantleClient = createPublicClient({
  chain: {
    id: 5000,
    name: 'Mantle',
    nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
    rpcUrls: {
      default: { http: [process.env.NEXT_PUBLIC_MANTLE_RPC || 'https://rpc.mantle.xyz'] }
    }
  },
  transport: http()
})

// Agni Finance subgraph
const AGNI_SUBGRAPH = 'https://api.studio.thegraph.com/query/61136/agni-finance/version/latest'

// Fetch live pool data from Agni Finance
export async function fetchAgniPools() {
  try {
    const query = `{
      pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
        id
        token0 { symbol }
        token1 { symbol }
        totalValueLockedUSD
        volumeUSD
        feesUSD
        token0Price
        token1Price
      }
    }`

    const res = await fetch(AGNI_SUBGRAPH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })

    const data = await res.json()
    return data?.data?.pools || []
  } catch (e) {
    return []
  }
}

// Fetch mETH protocol data
export async function fetchMethData() {
  try {
    const res = await fetch('https://meth.mantle.xyz/api/v1/protocol-stats')
    const data = await res.json()
    return data
  } catch (e) {
    return { tvl: 0, apy: 0, totalStaked: 0 }
  }
}

// Fetch Aave v3 Mantle data
export async function fetchAaveData() {
  try {
    const query = `{
      reserves(first: 10) {
        symbol
        liquidityRate
        variableBorrowRate
        totalATokenSupply
        totalCurrentVariableDebt
        utilizationRate
      }
    }`

    const res = await fetch('https://api.studio.thegraph.com/query/61136/aave-v3-mantle/version/latest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })

    const data = await res.json()
    return data?.data?.reserves || []
  } catch (e) {
    return []
  }
}

// Generate simulated stress data for demo
export function generateStressScenario() {
  return {
    methYieldDrop: Math.random() > 0.7,
    fbtcOutflow: Math.random() > 0.6,
    aaveLiquidationRisk: Math.random() > 0.8,
    stablecoinDepeg: Math.random() > 0.9,
    liquidityImbalance: Math.random() > 0.7,
    treasuryMovement: Math.random() > 0.85
  }
}

// Risk score calculator
export function calculateRiskScore(signals: Record<string, boolean>): number {
  const weights: Record<string, number> = {
    methYieldDrop: 20,
    fbtcOutflow: 20,
    aaveLiquidationRisk: 25,
    stablecoinDepeg: 25,
    liquidityImbalance: 15,
    treasuryMovement: 10
  }

  let score = 0
  for (const [key, triggered] of Object.entries(signals)) {
    if (triggered) score += weights[key] || 0
  }

  return Math.min(score, 100)
}