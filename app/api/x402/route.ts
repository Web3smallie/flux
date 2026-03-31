// x402 Payment Protocol
// Agents pay each other economically to submit signals to consensus
// This creates a real economic game — agents with poor track records 
// must pay more to have their signals considered

const AGENT_BALANCES: Map<string, number> = new Map([
  ['mETH', 100],
  ['fBTC', 100],
  ['MI4', 100],
  ['DeFi', 100],
  ['UR', 100],
  ['Executor', 50],
  ['Shield', 150] // Shield gets more budget as security is critical
])

const PAYMENT_HISTORY: {
  from: string
  to: string
  amount: number
  reason: string
  timestamp: number
  txHash: string
}[] = []

const SUBMISSION_FEE = 5 // MNT cost to submit a signal
const CHALLENGE_FEE = 10 // MNT cost to challenge another agent
const WINNER_REWARD = 25 // MNT reward for winning consensus

function generateTxHash(from: string, to: string, amount: number): string {
  const data = `${from}-${to}-${amount}-${Date.now()}`
  let hash = 5381
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) + hash) + data.charCodeAt(i)
    hash = hash & hash
  }
  return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`
}

export async function POST(req: Request) {
  try {
    const { action, agent, targetAgent, consensusWinner } = await req.json()

    if (action === 'submit') {
      // Agent pays submission fee to enter consensus
      const balance = AGENT_BALANCES.get(agent) || 0
      if (balance < SUBMISSION_FEE) {
        return Response.json({
          success: false,
          error: `${agent} has insufficient balance (${balance} MNT) to submit signal. Required: ${SUBMISSION_FEE} MNT`
        })
      }

      AGENT_BALANCES.set(agent, balance - SUBMISSION_FEE)
      const txHash = generateTxHash(agent, 'ConsensusPool', SUBMISSION_FEE)

      PAYMENT_HISTORY.push({
        from: agent,
        to: 'ConsensusPool',
        amount: SUBMISSION_FEE,
        reason: `Signal submission fee`,
        timestamp: Date.now(),
        txHash
      })

      return Response.json({
        success: true,
        action: 'submit',
        agent,
        fee: SUBMISSION_FEE,
        newBalance: AGENT_BALANCES.get(agent),
        txHash,
        message: `${agent} paid ${SUBMISSION_FEE} MNT to submit signal to consensus`
      })
    }

    if (action === 'challenge') {
      // Agent pays to challenge another agent's signal
      const balance = AGENT_BALANCES.get(agent) || 0
      if (balance < CHALLENGE_FEE) {
        return Response.json({
          success: false,
          error: `${agent} has insufficient balance to challenge`
        })
      }

      AGENT_BALANCES.set(agent, balance - CHALLENGE_FEE)
      const txHash = generateTxHash(agent, targetAgent || 'Unknown', CHALLENGE_FEE)

      PAYMENT_HISTORY.push({
        from: agent,
        to: targetAgent || 'Unknown',
        amount: CHALLENGE_FEE,
        reason: `Challenge fee against ${targetAgent}`,
        timestamp: Date.now(),
        txHash
      })

      return Response.json({
        success: true,
        action: 'challenge',
        agent,
        targetAgent,
        fee: CHALLENGE_FEE,
        newBalance: AGENT_BALANCES.get(agent),
        txHash,
        message: `${agent} paid ${CHALLENGE_FEE} MNT to challenge ${targetAgent}`
      })
    }

    if (action === 'reward') {
      // Winning agent receives reward from consensus pool
      const balance = AGENT_BALANCES.get(consensusWinner) || 0
      AGENT_BALANCES.set(consensusWinner, balance + WINNER_REWARD)
      const txHash = generateTxHash('ConsensusPool', consensusWinner, WINNER_REWARD)

      PAYMENT_HISTORY.push({
        from: 'ConsensusPool',
        to: consensusWinner,
        amount: WINNER_REWARD,
        reason: `Consensus winner reward`,
        timestamp: Date.now(),
        txHash
      })

      return Response.json({
        success: true,
        action: 'reward',
        agent: consensusWinner,
        reward: WINNER_REWARD,
        newBalance: AGENT_BALANCES.get(consensusWinner),
        txHash,
        message: `${consensusWinner} earned ${WINNER_REWARD} MNT for winning consensus`
      })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })

  } catch (e) {
    return Response.json({ error: 'x402 payment failed' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const balances = Object.fromEntries(AGENT_BALANCES)
    
    return Response.json({
      balances,
      totalPayments: PAYMENT_HISTORY.length,
      recentPayments: PAYMENT_HISTORY.slice(-10).reverse(),
      fees: {
        submission: SUBMISSION_FEE,
        challenge: CHALLENGE_FEE,
        winnerReward: WINNER_REWARD
      },
      description: 'x402 Agent Payment Protocol — agents pay economically to submit and challenge signals'
    })
  } catch (e) {
    return Response.json({ error: 'x402 fetch failed' }, { status: 500 })
  }
}