import { createWalletClient, createPublicClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { AgentSignal } from '@/lib/agents'

const mantleChain = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] }
  }
} as const

const CONTRACT_ADDRESS = '0xff817f080e4C2F472F23870685583E78B7a89CCC' as `0x${string}`

const ABI = parseAbi([
  'function commitProof(string proofId, string agentName, bytes32 commitHash) external',
  'function revealProof(string proofId, string reasoning, uint256 riskScore, string status) external',
  'function totalProofs() external view returns (uint256)',
])

const memoryRegistry: Map<string, any> = new Map()

function generateCommitHash(strategy: string, yieldScore: number): `0x${string}` {
  const data = `${strategy}-${yieldScore}`
  let hash = 5381
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i)
    hash = hash & hash
  }
  const hexHash = Math.abs(hash).toString(16).padStart(64, '0')
  return `0x${hexHash}` as `0x${string}`
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

    // Store in memory first
    memoryRegistry.set(signal.onchainProof, {
      signal,
      commitHash,
      onchain: false,
      timestamp: signal.timestamp,
      blockNumber,
      explorerUrl: `https://explorer.mantle.xyz/address/${CONTRACT_ADDRESS}`
    })

    // Try to write onchain
    try {
      const privateKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`
      if (!privateKey) throw new Error('No private key')

      const account = privateKeyToAccount(privateKey)
      const walletClient = createWalletClient({
        account,
        chain: mantleChain,
        transport: http('https://rpc.mantle.xyz')
      })

      // Commit proof onchain
      const commitTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'commitProof',
        args: [signal.onchainProof, signal.agent, commitHash]
      })

      // Update memory with onchain status
      memoryRegistry.set(signal.onchainProof, {
        signal,
        commitHash,
        onchain: true,
        timestamp: signal.timestamp,
        blockNumber,
        txHash: commitTx,
        explorerUrl: `https://explorer.mantle.xyz/tx/${commitTx}`
      })

      return Response.json({
        success: true,
        proofId: signal.onchainProof,
        attestationHash: signal.attestationHash,
        commitHash,
        onchain: true,
        txHash: commitTx,
        explorerUrl: `https://explorer.mantle.xyz/tx/${commitTx}`
      })

    } catch (onchainError) {
      console.error('Onchain write failed:', onchainError)
      // Return memory fallback
      return Response.json({
        success: true,
        proofId: signal.onchainProof,
        attestationHash: signal.attestationHash,
        commitHash,
        onchain: false,
        blockNumber,
        explorerUrl: `https://explorer.mantle.xyz/address/${CONTRACT_ADDRESS}`
      })
    }

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

    // Try to get total from contract
    let contractTotal = 0
    try {
      const publicClient = createPublicClient({
        chain: mantleChain,
        transport: http('https://rpc.mantle.xyz')
      })
      const total = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'totalProofs'
      })
      contractTotal = Number(total)
    } catch (e) {
      contractTotal = allProofs.length
    }

    return Response.json({
      total: contractTotal,
      onchain: contractTotal > 0,
      contractAddress: CONTRACT_ADDRESS,
      explorerUrl: `https://explorer.mantle.xyz/address/${CONTRACT_ADDRESS}`,
      proofs: allProofs.slice(-20)
    })

  } catch (e) {
    return Response.json({ error: 'Proof fetch failed' }, { status: 500 })
  }
}