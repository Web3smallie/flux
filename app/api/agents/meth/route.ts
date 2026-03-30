import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId, AGENT_PERSONAS } from '@/lib/agents'
import { fetchMethData, generateStressScenario } from '@/lib/mantle'

const client = new Anthropic()

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const holdings = searchParams.get('holdings') || 'ETH: 1.5, MNT: 500, USDT: 200'

    const methData = await fetchMethData()
    const stress = generateStressScenario()

    const marketContext = `
User Wallet Holdings on Mantle: ${holdings}

Current mETH Protocol Data:
- TVL: ${methData.tvl || '$927M'}
- Current APY: ${methData.apy || '4.2%'}
- Total Staked: ${methData.totalStaked || '285,000 ETH'}
- Aave Collateral Opportunity: mETH accepted as collateral, borrow rate 2.1%
- Compound Strategy: Stake ETH → mETH (4.2%) → Aave collateral → borrow USDT → Agni pool (23%) 
- Treasury Movement: ${stress.treasuryMovement}
- Time: ${new Date().toISOString()}

Based on this user's specific holdings, argue why mETH staking is their best yield strategy on Mantle.
Include the realistic total APY they could earn.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${AGENT_PERSONAS.mETH}\n\n${marketContext}`
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('mETH', parsed.strategy, timestamp)
    const proofId = generateProofId('mETH', timestamp)

    return Response.json({
      agent: 'mETH',
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
    return Response.json({ error: 'mETH agent failed' }, { status: 500 })
  }
}