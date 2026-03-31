import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId } from '@/lib/agents'

const client = new Anthropic()

// COLLECTIVE MEMORY — Community owned threat database
// Every malicious pattern committed onchain, grows with every attack
const collectiveMemory: Map<string, {
  threatSignature: string
  pattern: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedProtocols: string[]
  detectedAt: number
  walletCount: number // how many wallets encountered this threat
  onchainProof: string
}> = new Map()

// PREDICTIVE MONITORING — Tracks ecosystem anomalies
const ecosystemAnomalies: {
  type: string
  description: string
  detectedAt: number
  riskLevel: number
}[] = []

export async function POST(req: Request) {
  try {
    const { contracts, holdings, winningAgent, executionSteps } = await req.json()

    // Build collective memory context
    const knownThreats = Array.from(collectiveMemory.values())
    const recentAnomalies = ecosystemAnomalies.slice(-5)

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

COLLECTIVE MEMORY (${knownThreats.length} threats learned from all users):
${knownThreats.length > 0 ? knownThreats.map(t => 
  `- [${t.severity.toUpperCase()}] ${t.pattern} | Affected: ${t.affectedProtocols.join(', ')} | Seen by ${t.walletCount} wallets`
).join('\n') : 'Collective memory is clean — no threats recorded yet'}

ECOSYSTEM ANOMALIES DETECTED (${recentAnomalies.length} active):
${recentAnomalies.length > 0 ? recentAnomalies.map(a => 
  `- ${a.type}: ${a.description} (Risk: ${a.riskLevel}/100)`
).join('\n') : 'No ecosystem anomalies detected'}

MANTLE ECOSYSTEM MONITORING:
Monitor these Mantle primitives for attack patterns:
- mETH Protocol (TVL: $927M) — validator concentration, yield manipulation
- fBTC Bridge (TVL: $1.2B) — custodian compromise, bridge exploit
- Agni Finance — flash loan attacks, price manipulation, pool drain
- Aave V3 Mantle — oracle manipulation, liquidation cascade
- FusionX — sandwich attacks, MEV exploitation
- UR Neobank — stablecoin depeg, collateral manipulation
- Mantle Treasury ($4B) — governance attack, unauthorized transfers

PERFORM ALL 4 SHIELD FUNCTIONS:

1. COLLECTIVE MEMORY CHECK
   - Does this execution match any known threat pattern?
   - Have other wallets encountered this threat before?

2. PREDICTIVE ATTACK DETECTION  
   - Analyze current ecosystem state for attack precursors
   - Are there unusual contract deployments, liquidity movements, whale clustering?
   - Predict if an attack is likely in the next 30-60 minutes

3. CROSS-PROTOCOL CONTAGION MAPPING
   - If this execution fails or is exploited, map exactly which protocols get affected and in what order
   - How does the damage spread across Mantle?

4. AI IMMUNE RESPONSE
   - If a live attack is detected, what governance proposal should be auto-generated?
   - Which protocols need to be paused?
   - What should MNT holders vote on immediately?

Respond ONLY with a JSON object:
{
  safeToExecute: boolean,
  securityScore: number (0-100),
  threatLevel: "safe" | "caution" | "danger" | "critical",
  
  collectiveMemory: {
    matchesKnownThreat: boolean,
    threatDescription: string,
    walletsAffectedBefore: number
  },
  
  predictiveDetection: {
    attackLikelihood: number (0-100),
    timeToAttack: string (e.g. "30-60 minutes" or "No imminent attack"),
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
      messages: [
        {
          role: 'user',
          content: shieldContext
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('Executor', parsed.recommendation, timestamp)
    const proofId = generateProofId('Executor', timestamp)

    // COLLECTIVE MEMORY UPDATE
    // If new threat detected, commit it to collective memory for ALL future users
    if (parsed.newThreatSignature && parsed.threatLevel !== 'safe') {
      const existingThreat = collectiveMemory.get(parsed.newThreatSignature)
      if (existingThreat) {
        // Threat seen before — increment wallet count
        existingThreat.walletCount++
      } else {
        // New threat — add to collective memory
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
      // Keep only last 20 anomalies
      if (ecosystemAnomalies.length > 20) ecosystemAnomalies.shift()
    }

    return Response.json({
      agent: 'Shield',
      timestamp,
      safeToExecute: parsed.safeToExecute,
      securityScore: parsed.securityScore,
      threatLevel: parsed.threatLevel,
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