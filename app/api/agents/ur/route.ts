import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId, AGENT_PERSONAS } from '@/lib/agents'

const client = new Anthropic()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const holdings = searchParams.get('holdings') || 'ETH: 1.5, MNT: 500, USDT: 200'

    const marketContext = `
User Wallet Holdings on Mantle: ${holdings}

Current UR Neobank Data on Mantle:
- Available in 40+ countries
- Stablecoin yield: 5-8% APY on USDT/USDC deposits
- Crypto collateralized credit: borrow against crypto holdings
- Fiat on/off ramp: direct banking rails
- Supported assets: ETH, MNT, USDT, USDC, mETH
- DeFi native features: yield on idle balances automatically
- No custody transfer: non-custodial, user controls keys
- Integration: Direct Mantle Network settlement
- Time: ${new Date().toISOString()}

Based on this user's specific holdings, argue why UR neobank is their best yield strategy on Mantle.
Include the realistic total APY they could earn.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${AGENT_PERSONAS.UR}\n\n${marketContext}`
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('UR', parsed.strategy, timestamp)
    const proofId = generateProofId('UR', timestamp)

    return Response.json({
      agent: 'UR',
      timestamp,
      yieldScore: parsed.yieldScore,
      estimatedAPY: parsed.estimatedAPY,
      strategy: parsed.strategy,
      status: 'recommended',
      reasoning: parsed.reasoning,
      dataPoints: parsed.dataPoints,
      confidenceScore: parsed.confidenceScore || 75,
      selfEvaluation: parsed.selfEvaluation || '',
      verified: false,
      challenged: false,
      challengers: [],
      attestationHash,
      onchainProof: proofId,
      reputationScore: 50
    })
  } catch (e) {
    return Response.json({ error: 'UR agent failed' }, { status: 500 })
  }
}