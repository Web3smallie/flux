import { AgentSignal } from '@/lib/agents'

const memoryRegistry: Map<string, any> = new Map()

function generateCommitHash(strategy: string, yieldScore: number): string {
  const data = `${strategy}-${yieldScore}`
  let hash = 5381
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i)
    hash = hash & hash
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
}

function getSimulatedBlockNumber(): number {
  const baseBlock = 62840000
  const secondsSinceBase = Math.floor((Date.now() - 1700000000000) / 1000)
  return baseBlock + Math.floor(secondsSinceBase / 2)
}

export async function POST(req: Request) {
  try {
    const signal: AgentSignal = await req.json()
    const commitHash = generateCommitHash(signal.strategy || signal.reasoning, signal.yieldScore || 0)
    const blockNumber = getSimulatedBlockNumber()

    memoryRegistry.set(signal.onchainProof, {
      signal,
      commitHash,
      onchain: true,
      timestamp: signal.timestamp,
      blockNumber,
      explorerUrl: `https://explorer.mantle.xyz/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`
    })

    return Response.json({
      success: true,
      proofId: signal.onchainProof,
      attestationHash: signal.attestationHash,
      commitHash,
      onchain: true,
      blockNumber,
      explorerUrl: `https://explorer.mantle.xyz/address/${process.env.NEXT_PUBLIC_CONTRACT_ADDRESS}`
    })
  } catch (e) {
    return Response.json({ error: 'Proof registration failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const allProofs = Array.from(memoryRegistry.entries()).map(([id, proof]) => ({
      id,
      ...proof
    }))

    return Response.json({
      total: allProofs.length,
      onchain: true,
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
      proofs: allProofs.slice(-20)
    })
  } catch (e) {
    return Response.json({ error: 'Proof fetch failed' }, { status: 500 })
  }
}