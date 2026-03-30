import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId, AGENT_PERSONAS } from '@/lib/agents'
import { fetchAgniPools } from '@/lib/mantle'

const client = new Anthropic()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const holdings = searchParams.get('holdings') || 'ETH: 1.5, MNT: 500, USDT: 200'

    const agniPools = await fetchAgniPools()

    const marketContext = `
User Wallet Holdings on Mantle: ${holdings}

Current DeFi Data on Mantle:

Agni Finance (Top Pools):
${agniPools.length > 0 ? JSON.stringify(agniPools.slice(0, 3)) : `
- mETH/USDT: TVL $4.2M, APY 23.4%, Volume 24h $1.1M
- WETH/USDT: TVL $3.8M, APY 18.2%, Volume 24h $2.3M
- fBTC/WETH: TVL $2.1M, APY 18.5%, Volume 24h $890K
- MNT/USDT: TVL $8.9M, APY 12.3%, Volume 24h $3.2M
`}

FusionX:
- MNT/USDT: TVL $8.9M, APY 15.1%
- fBTC/USDT: TVL $3.1M, APY 14.2%

Based on this user's specific holdings, argue why DeFi LP positions on Agni Finance or FusionX are their best yield strategy on Mantle.
Include the realistic total APY they could earn.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${AGENT_PERSONAS.DeFi}\n\n${marketContext}`
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('DeFi', parsed.strategy, timestamp)
    const proofId = generateProofId('DeFi', timestamp)

    return Response.json({
      agent: 'DeFi',
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
    return Response.json({ error: 'DeFi agent failed' }, { status: 500 })
  }
}