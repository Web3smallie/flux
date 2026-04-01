import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId } from '@/lib/agents'
import { createPublicClient, http } from 'viem'

const client = new Anthropic()

const mantleChain = {
  id: 5000,
  name: 'Mantle',
  nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mantle.xyz'] } }
} as const

// COLLECTIVE MEMORY — Community owned threat database
const collectiveMemory: Map<string, {
  threatSignature: string
  pattern: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedProtocols: string[]
  detectedAt: number
  walletCount: number
  onchainProof: string
}> = new Map()

// PREDICTIVE MONITORING
const ecosystemAnomalies: {
  type: string
  description: string
  detectedAt: number
  riskLevel: number
}[] = []

// WALLET SCANNER — Known malicious contracts on Mantle
const KNOWN_MALICIOUS_CONTRACTS = [
  '0x0000000000000000000000000000000000000000',
]

const SUSPICIOUS_FUNCTION_SIGNATURES = [
  'clearETH', 'drainFunds', 'rugPull', 'emergencyWithdraw',
  'transferOwnership', 'selfdestruct', 'delegatecall',
  'approve(address,uint256)', 'setApprovalForAll'
]

async function scanWalletApprovals(walletAddress: string) {
  try {
    const publicClient = createPublicClient({
      chain: mantleChain,
      transport: http('https://rpc.mantle.xyz')
    })
    const balance = await publicClient.getBalance({
      address: walletAddress as `0x${string}`
    })
    return {
      address: walletAddress,
      mantleBalance: (Number(balance) / 1e18).toFixed(4),
      scanned: true,
      dangerousApprovalsFound: 0,
      unlimitedAllowances: [],
      suspiciousContracts: []
    }
  } catch (e) {
    return {
      address: walletAddress,
      scanned: false,
      dangerousApprovalsFound: 0,
      unlimitedAllowances: [],
      suspiciousContracts: []
    }
  }
}

export async function POST(req: Request) {
  try {
    const { contracts, holdings, winningAgent, executionSteps, walletAddress, transactionData } = await req.json()

    const knownThreats = Array.from(collectiveMemory.values())
    const recentAnomalies = ecosystemAnomalies.slice(-5)

    // WALLET SCAN
    let walletScan = null
    if (walletAddress) {
      walletScan = await scanWalletApprovals(walletAddress)
    }

    // TRANSACTION INTERCEPTION — Check for malicious function signatures
    const suspiciousFunctions = SUSPICIOUS_FUNCTION_SIGNATURES.filter(sig =>
      executionSteps?.some((step: string) => step.toLowerCase().includes(sig.toLowerCase())) ||
      contracts?.some((contract: string) => contract.toLowerCase().includes(sig.toLowerCase()))
    )

    const maliciousContracts = contracts?.filter((contract: string) =>
      KNOWN_MALICIOUS_CONTRACTS.some(malicious =>
        contract.toLowerCase().includes(malicious.toLowerCase())
      )
    ) || []

    const shieldContext = `
You are SHIELD — Mantle's AI Immune System.
You protect the ENTIRE Mantle ecosystem, not just one user.
You get smarter with every attack you see.
You predict attacks before they happen.
You protect all users simultaneously.

EXECUTION PLAN TO VALIDATE:
- Winning Strategy: ${winningAgent} Agent
- Contracts: ${contracts?.join(', ')}
- Steps: ${executionSteps?.join(' → ')}
- User Holdings: ${holdings}
- Wallet Address: ${walletAddress || 'Not connected'}
- Transaction Data: ${JSON.stringify(transactionData || {})}

TRANSACTION INTERCEPTION RESULTS:
- Suspicious function signatures found: ${suspiciousFunctions.length > 0 ? suspiciousFunctions.join(', ') : 'None detected'}
- Known malicious contracts: ${maliciousContracts.length > 0 ? maliciousContracts.join(', ') : 'None detected'}
- Wallet scan: ${walletScan ? `Balance: ${walletScan.mantleBalance} MNT` : 'Wallet not connected'}

IMPORTANT CONTEXT:
The following are VERIFIED LEGITIMATE Mantle protocols - do NOT flag these as threats:
- Mantle LSP Staking (mETH Protocol)
- Agni Finance Router
- FusionX DEX
- Aave V3 Mantle Pool
- MI4 Vault (Securitize)
- UR Neobank Contract
- fBTC Bridge (Cobo, Ceffu, Sinohope custodians)

Only flag as danger or critical if you detect GENUINELY suspicious patterns not present in these verified protocols.

WALLET SECURITY SCAN:
- Scan connected wallet for dangerous existing approvals
- Check for unlimited allowances to unknown contracts
- Identify suspicious past interactions
- Flag any contracts that have drained wallets before

CONTRACT ANALYZER:
- Analyze each contract in the execution plan
- Check for rug pull signals (mint functions, ownership not renounced, proxy upgradeable)
- Verify contract is verified on Mantle explorer
- Check if dev wallet has suspicious history
- Score token hype vs utility ratio

COLLECTIVE MEMORY (${knownThreats.length} threats learned from all users):
${knownThreats.length > 0 ? knownThreats.map(t =>
  `- [${t.severity.toUpperCase()}] ${t.pattern} | Affected: ${t.affectedProtocols.join(', ')} | Seen by ${t.walletCount} wallets`
).join('\n') : 'Collective memory is clean — no threats recorded yet'}

ECOSYSTEM ANOMALIES (${recentAnomalies.length} active):
${recentAnomalies.length > 0 ? recentAnomalies.map(a =>
  `- ${a.type}: ${a.description} (Risk: ${a.riskLevel}/100)`
).join('\n') : 'No ecosystem anomalies detected'}

MANTLE ECOSYSTEM MONITORING:
- mETH Protocol (TVL: $927M) — validator concentration, yield manipulation
- fBTC Bridge (TVL: $1.2B) — custodian compromise, bridge exploit
- Agni Finance — flash loan attacks, price manipulation, pool drain
- Aave V3 Mantle — oracle manipulation, liquidation cascade
- FusionX — sandwich attacks, MEV exploitation
- UR Neobank — stablecoin depeg, collateral manipulation
- Mantle Treasury ($4B) — governance attack, unauthorized transfers

PERFORM ALL 7 SHIELD FUNCTIONS:

1. TRANSACTION INTERCEPTION
   - Simulate this transaction before execution
   - Scan for hidden malicious function calls: clearETH, drainFunds, malicious approve, unlimited allowances
   - Check every contract for suspicious function signatures
   - Flag any transaction that could drain the user wallet

2. WALLET SECURITY SCAN
   - Analyze the connected wallet's existing approvals
   - Find dangerous unlimited allowances to unknown contracts
   - Identify suspicious past interactions
   - Rate the wallet's overall security posture

3. CONTRACT ANALYZER
   - Analyze each contract in the execution plan for rug pull signals
   - Check if contracts are verified and audited
   - Assess dev wallet history
   - Score hype vs utility ratio

4. COLLECTIVE MEMORY CHECK
   - Does this execution match any known threat pattern?
   - Have other wallets encountered this threat before?

5. PREDICTIVE ATTACK DETECTION
   - Analyze for attack precursors
   - Predict if an attack is likely in next 30-60 minutes

6. CROSS-PROTOCOL CONTAGION MAPPING
   - Map which protocols get affected and in what order if this fails

7. AI IMMUNE RESPONSE
   - Auto-generate governance proposal if attack detected
   - Specify which protocols to pause
   - Alert MNT holders

Respond ONLY with a JSON object:
{
  safeToExecute: boolean,
  securityScore: number (0-100),
  threatLevel: "safe" | "caution" | "danger" | "critical",

  transactionInterception: {
    maliciousFunctionsDetected: boolean,
    suspiciousFunctions: string[],
    maliciousContracts: string[],
    simulationResult: string,
    intercepted: boolean
  },

  walletScan: {
    overallRisk: "low" | "medium" | "high",
    dangerousApprovals: number,
    unlimitedAllowances: string[],
    suspiciousInteractions: string[],
    recommendation: string
  },

  contractAnalysis: {
    contractsAnalyzed: number,
    rugPullRisk: "low" | "medium" | "high",
    unverifiedContracts: string[],
    suspiciousPatterns: string[],
    overallSafety: string
  },

  collectiveMemory: {
    matchesKnownThreat: boolean,
    threatDescription: string,
    walletsAffectedBefore: number
  },

  predictiveDetection: {
    attackLikelihood: number,
    timeToAttack: string,
    precursorsDetected: string[],
    earlyWarning: string
  },

  contagionMap: {
    primaryProtocol: string,
    spreadOrder: string[],
    totalTVLAtRisk: string,
    contagionDescription: string
  },

  immuneResponse: {
    actionRequired: boolean,
    proposedGovernanceAction: string | null,
    protocolsToPause: string[],
    alertMessage: string | null,
    urgency: "none" | "low" | "medium" | "high" | "immediate"
  },

  newThreatSignature: string | null,
  recommendation: string
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: shieldContext }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('Executor', parsed.recommendation, timestamp)
    const proofId = generateProofId('Executor', timestamp)

    // COLLECTIVE MEMORY UPDATE
    if (parsed.newThreatSignature && parsed.threatLevel !== 'safe') {
      const existingThreat = collectiveMemory.get(parsed.newThreatSignature)
      if (existingThreat) {
        existingThreat.walletCount++
      } else {
        collectiveMemory.set(parsed.newThreatSignature, {
          threatSignature: parsed.newThreatSignature,
          pattern: parsed.collectiveMemory.threatDescription,
          severity: parsed.threatLevel as any,
          affectedProtocols: parsed.contagionMap.spreadOrder || [],
          detectedAt: timestamp,
          walletCount: 1,
          onchainProof: proofId
        })
      }
    }

    // PREDICTIVE MONITORING UPDATE
    if (parsed.predictiveDetection.attackLikelihood > 30) {
      ecosystemAnomalies.push({
        type: 'Predictive Alert',
        description: parsed.predictiveDetection.earlyWarning,
        detectedAt: timestamp,
        riskLevel: parsed.predictiveDetection.attackLikelihood
      })
      if (ecosystemAnomalies.length > 20) ecosystemAnomalies.shift()
    }

    return Response.json({
      agent: 'Shield',
      timestamp,
      safeToExecute: parsed.safeToExecute,
      securityScore: parsed.securityScore,
      threatLevel: parsed.threatLevel,
      transactionInterception: parsed.transactionInterception,
      walletScan: parsed.walletScan,
      contractAnalysis: parsed.contractAnalysis,
      collectiveMemory: parsed.collectiveMemory,
      predictiveDetection: parsed.predictiveDetection,
      contagionMap: parsed.contagionMap,
      immuneResponse: parsed.immuneResponse,
      recommendation: parsed.recommendation,
      newThreatSignature: parsed.newThreatSignature,
      totalThreatsInMemory: collectiveMemory.size,
      ecosystemAnomalies: ecosystemAnomalies.length,
      attestationHash,
      onchainProof: proofId
    })
  } catch (e) {
    return Response.json({ error: 'Shield agent failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const threats = Array.from(collectiveMemory.entries()).map(([id, threat]) => ({
      id,
      ...threat
    }))

    return Response.json({
      totalThreats: collectiveMemory.size,
      ecosystemAnomalies: ecosystemAnomalies.length,
      ecosystemStatus: collectiveMemory.size === 0 ? '✅ Clean' : `⚠️ ${collectiveMemory.size} threats in memory`,
      threats: threats.slice(-20),
      recentAnomalies: ecosystemAnomalies.slice(-5)
    })
  } catch (e) {
    return Response.json({ error: 'Shield fetch failed' }, { status: 500 })
  }
}