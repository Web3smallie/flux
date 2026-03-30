import Anthropic from '@anthropic-ai/sdk'
import { generateAttestationHash, generateProofId } from '@/lib/agents'

const client = new Anthropic()

const MANTLE_CONTRACTS: Record<string, string> = {
  mETH: 'Mantle LSP Staking: 0x38fDF7b489316e03eD8754ad339cB5c4483FDcf9',
  fBTC: 'fBTC Bridge: 0x41a97d2f69A8Ac97B2B3b47e1F62A187b0C9e5F4',
  MI4: 'MI4 Vault (Securitize): 0x7dA17C2b8c3e6b79e3D5D1F09C4e2A8b6D4f1E3',
  DeFi: 'Agni Finance Router: 0xABCD...Agni, FusionX Router: 0xEFGH...FusionX',
  UR: 'UR Neobank Contract: 0x9f23C1d4A8B7e6F2c5D9E1a3B4c7D8f2A1b3C4d5',
  Aave: 'Aave V3 Mantle Pool: 0x79b5a272F7Df2d0Df6A5B9c8e6d2A1b3C4d5E6f7'
}

export async function POST(req: Request) {
  try {
    const { winningAgent, winningStrategy, estimatedAPY, holdings } = await req.json()

    const contractInfo = MANTLE_CONTRACTS[winningAgent] || 'Mantle Native Contract'

    const marketContext = `
You are the Executor Agent for Flux on Mantle.
The 5 specialist agents have reached consensus. Your job is to determine the exact execution route.

Winning Agent: ${winningAgent}
Winning Strategy: ${winningStrategy}
Estimated APY: ${estimatedAPY}%
User Holdings on Mantle: ${holdings}
Relevant Contract: ${contractInfo}

Based on the winning strategy, provide the exact execution route using ONLY real Mantle protocols:
- Mantle LSP for mETH staking
- fBTC Bridge for Bitcoin
- Agni Finance / FusionX for DEX
- Aave V3 on Mantle for lending
- MI4 via Securitize for index
- UR for neobank

Respond ONLY with a JSON object:
{
  executionSteps: string[] (3-5 exact steps using real Mantle protocol names),
  contracts: string[] (real Mantle contract names only),
  estimatedGas: string (estimated gas in MNT, should be between 0.1-2 MNT),
  expectedYield: string (APY breakdown using real protocol yields),
  executionSummary: string (1 sentence summary),
  readyToExecute: boolean
}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: marketContext
        }
      ]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    const timestamp = Date.now()
    const attestationHash = generateAttestationHash('Executor', parsed.executionSummary, timestamp)
    const proofId = generateProofId('Executor', timestamp)

    return Response.json({
      agent: 'Executor',
      timestamp,
      executionSteps: parsed.executionSteps,
      contracts: parsed.contracts,
      estimatedGas: parsed.estimatedGas,
      expectedYield: parsed.expectedYield,
      executionSummary: parsed.executionSummary,
      readyToExecute: parsed.readyToExecute,
      attestationHash,
      onchainProof: proofId
    })
  } catch (e) {
    return Response.json({ error: 'Executor agent failed' }, { status: 500 })
  }
}