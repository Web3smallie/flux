import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId, AGENT_PERSONAS } from '@/lib/agents'

const client = new Anthropic()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const holdings = searchParams.get('holdings') || 'ETH: 1.5, MNT: 500, USDT: 200'

    const marketContext = `
User Wallet Holdings on Mantle: ${holdings}

Current MI4 (Mantle Index Four) Data:
- AUM: $173M
- YTD Return: 28.17%
- Composition: BTC (50%), ETH (28%), SOL (7%), USD (15%)
- Management Fee: 1% annually
- Rebalancing: Quarterly
- Custodian: Securitize (institutional grade)
- Minimum Investment: No minimum for tokenized shares
- Yield Sources: Market appreciation + staking yields on BTC/ETH/SOL
- Time: ${new Date().toISOString()}

Based on this user's specific holdings, argue why MI4 index fund is their best yield strategy on Mantle.
Include the realistic total APY they could earn.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${AGENT_PERSONAS.MI4}\n\n${marketContext}`
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('MI4', parsed.strategy, timestamp)
    const proofId = generateProofId('MI4', timestamp)

    return Response.json({
      agent: 'MI4',
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
    return Response.json({ error: 'MI4 agent failed' }, { status: 500 })
  }
}