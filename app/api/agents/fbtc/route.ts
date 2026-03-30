import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId, AGENT_PERSONAS } from '@/lib/agents'
import { generateStressScenario } from '@/lib/mantle'

const client = new Anthropic()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const holdings = searchParams.get('holdings') || 'ETH: 1.5, MNT: 500, USDT: 200'

    const stress = generateStressScenario()

    const marketContext = `
User Wallet Holdings on Mantle: ${holdings}

Current fBTC Protocol Data:
- Total TVL: $1.2B
- fBTC/WETH Pool APY on Agni Finance: 18.5%
- fBTC/USDT Pool APY on FusionX: 14.2%
- Bridge Inflows (24h): ${stress.fbtcOutflow ? '$12M' : '$45M (strong demand)'}
- Active Custodians: Cobo, Ceffu, Sinohope (fully backed 1:1 BTC)
- Babylon Integration: Additional 3.2% staking yield on fBTC
- Time: ${new Date().toISOString()}

Based on this user's specific holdings, argue why fBTC is their best yield strategy on Mantle.
Include the realistic total APY they could earn.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${AGENT_PERSONAS.fBTC}\n\n${marketContext}`
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('fBTC', parsed.strategy, timestamp)
    const proofId = generateProofId('fBTC', timestamp)

    return Response.json({
      agent: 'fBTC',
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
    return Response.json({ error: 'fBTC agent failed' }, { status: 500 })
  }
}