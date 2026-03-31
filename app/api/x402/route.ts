// x402 Payment Protocol — Full Economic Loop
// Users deposit MNT → distributed to agents as budget
// Agents pay to compete → winner earns from pool → user gets yield bonus

const AGENT_BALANCES: Map<string, number> = new Map([
  ['mETH', 100],
  ['fBTC', 100],
  ['MI4', 100],
  ['DeFi', 100],
  ['UR', 100],
  ['Executor', 50],
  ['Shield', 150]
])

const CONSENSUS_POOL = { balance: 0 }
const USER_EARNINGS: Map<string, number> = new Map()
const PROTOCOL_FEE_POOL = { balance: 0 }

const PAYMENT_HISTORY: {
  from: string
  to: string
  amount: number
  reason: string
  timestamp: number
  txHash: string
  type: 'submission' | 'challenge' | 'reward' | 'user_bonus' | 'protocol_fee'
}[] = []

const SUBMISSION_FEE = 5
const CHALLENGE_FEE = 10
const WINNER_REWARD = 25
const USER_BONUS_PERCENT = 0.6 // 60% of remaining pool to user
const PROTOCOL_FEE_PERCENT = 0.4 // 40% to protocol

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
    const { action, agent, targetAgent, consensusWinner, userAddress } = await req.json()

    // Agent pays submission fee to enter consensus
    if (action === 'submit') {
      const balance = AGENT_BALANCES.get(agent) || 0
      if (balance < SUBMISSION_FEE) {
        return Response.json({
          success: false,
          error: `${agent} has insufficient balance (${balance} MNT). Required: ${SUBMISSION_FEE} MNT`
        })
      }

      AGENT_BALANCES.set(agent, balance - SUBMISSION_FEE)
      CONSENSUS_POOL.balance += SUBMISSION_FEE
      const txHash = generateTxHash(agent, 'ConsensusPool', SUBMISSION_FEE)

      PAYMENT_HISTORY.push({
        from: agent,
        to: 'ConsensusPool',
        amount: SUBMISSION_FEE,
        reason: `Signal submission fee`,
        timestamp: Date.now(),
        txHash,
        type: 'submission'
      })

      return Response.json({
        success: true,
        action: 'submit',
        agent,
        fee: SUBMISSION_FEE,
        newBalance: AGENT_BALANCES.get(agent),
        consensusPool: CONSENSUS_POOL.balance,
        txHash,
        message: `${agent} paid ${SUBMISSION_FEE} MNT to submit signal`
      })
    }

    // Agent pays to challenge another agent
    if (action === 'challenge') {
      const balance = AGENT_BALANCES.get(agent) || 0
      if (balance < CHALLENGE_FEE) {
        return Response.json({
          success: false,
          error: `${agent} has insufficient balance to challenge`
        })
      }

      AGENT_BALANCES.set(agent, balance - CHALLENGE_FEE)
      CONSENSUS_POOL.balance += CHALLENGE_FEE
      const txHash = generateTxHash(agent, targetAgent || 'Unknown', CHALLENGE_FEE)

      PAYMENT_HISTORY.push({
        from: agent,
        to: 'ConsensusPool',
        amount: CHALLENGE_FEE,
        reason: `Challenge fee against ${targetAgent}`,
        timestamp: Date.now(),
        txHash,
        type: 'challenge'
      })

      return Response.json({
        success: true,
        action: 'challenge',
        agent,
        targetAgent,
        fee: CHALLENGE_FEE,
        newBalance: AGENT_BALANCES.get(agent),
        consensusPool: CONSENSUS_POOL.balance,
        txHash,
        message: `${agent} paid ${CHALLENGE_FEE} MNT to challenge ${targetAgent}`
      })
    }

    // Winner earns reward, remaining pool split between user and protocol
    if (action === 'reward') {
      const winnerBalance = AGENT_BALANCES.get(consensusWinner) || 0
      AGENT_BALANCES.set(consensusWinner, winnerBalance + WINNER_REWARD)
      CONSENSUS_POOL.balance -= WINNER_REWARD
      const winnerTxHash = generateTxHash('ConsensusPool', consensusWinner, WINNER_REWARD)

      PAYMENT_HISTORY.push({
        from: 'ConsensusPool',
        to: consensusWinner,
        amount: WINNER_REWARD,
        reason: `Consensus winner reward`,
        timestamp: Date.now(),
        txHash: winnerTxHash,
        type: 'reward'
      })

      // Split remaining pool
      const remainingPool = CONSENSUS_POOL.balance
      if (remainingPool > 0) {
        const userBonus = Math.floor(remainingPool * USER_BONUS_PERCENT)
        const protocolFee = Math.floor(remainingPool * PROTOCOL_FEE_PERCENT)

        // User bonus
        if (userAddress) {
          const currentEarnings = USER_EARNINGS.get(userAddress) || 0
          USER_EARNINGS.set(userAddress, currentEarnings + userBonus)
          const userTxHash = generateTxHash('ConsensusPool', userAddress, userBonus)
          PAYMENT_HISTORY.push({
            from: 'ConsensusPool',
            to: userAddress,
            amount: userBonus,
            reason: `User yield bonus from consensus pool`,
            timestamp: Date.now(),
            txHash: userTxHash,
            type: 'user_bonus'
          })
        }

        // Protocol fee
        PROTOCOL_FEE_POOL.balance += protocolFee
        const protocolTxHash = generateTxHash('ConsensusPool', 'FluxProtocol', protocolFee)
        PAYMENT_HISTORY.push({
          from: 'ConsensusPool',
          to: 'FluxProtocol',
          amount: protocolFee,
          reason: `Protocol fee`,
          timestamp: Date.now(),
          txHash: protocolTxHash,
          type: 'protocol_fee'
        })

        CONSENSUS_POOL.balance = 0
      }

      return Response.json({
        success: true,
        action: 'reward',
        winner: consensusWinner,
        winnerReward: WINNER_REWARD,
        newWinnerBalance: AGENT_BALANCES.get(consensusWinner),
        userBonus: userAddress ? USER_EARNINGS.get(userAddress) : 0,
        protocolFee: PROTOCOL_FEE_POOL.balance,
        txHash: winnerTxHash,
        message: `${consensusWinner} earned ${WINNER_REWARD} MNT. Pool distributed to user and protocol.`
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
      consensusPool: CONSENSUS_POOL.balance,
      protocolFees: PROTOCOL_FEE_POOL.balance,
      totalPayments: PAYMENT_HISTORY.length,
      recentPayments: PAYMENT_HISTORY.slice(-10).reverse(),
      fees: {
        submission: SUBMISSION_FEE,
        challenge: CHALLENGE_FEE,
        winnerReward: WINNER_REWARD,
        userBonusPercent: `${USER_BONUS_PERCENT * 100}%`,
        protocolFeePercent: `${PROTOCOL_FEE_PERCENT * 100}%`
      },
      description: 'x402 Agent Payment Protocol — agents pay to compete, winners earn, users get yield bonus, protocol takes fee'
    })
  } catch (e) {
    return Response.json({ error: 'x402 fetch failed' }, { status: 500 })
  }
}