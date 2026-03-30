import { AgentSignal, ConsensusResult } from '@/lib/agents'

export async function POST(req: Request) {
  try {
    const signals: AgentSignal[] = await req.json()

    // Step 1: Challenge agents whose yieldScore differs by more than 30 points
    const processedSignals = signals.map(signal => {
      const challengers = signals
        .filter(other => {
          if (other.agent === signal.agent) return false
          return Math.abs(other.yieldScore - signal.yieldScore) > 30
        })
        .map(other => other.agent)

      return {
        ...signal,
        challenged: challengers.length > 0,
        challengers,
        verified: challengers.length === 0
      }
    })

    // Step 2: Separate trusted vs challenged
    const trustedSignals = processedSignals.filter(s => s.verified)
    const challengedSignals = processedSignals.filter(s => s.challenged)

    // Step 3: Find winning agent — highest yieldScore among trusted
    const scoredSignals = trustedSignals.length > 0 ? trustedSignals : processedSignals
    const winningSignal = scoredSignals.reduce((best, current) =>
      current.yieldScore > best.yieldScore ? current : best
    )

    // Step 4: Calculate final yield score
    const finalYieldScore = Math.round(
      scoredSignals.reduce((sum, s) => sum + s.yieldScore, 0) / scoredSignals.length
    )

    // Step 5: Generate summary
    const summary = `${winningSignal.agent} Agent wins consensus with ${winningSignal.estimatedAPY}% APY. Strategy: ${winningSignal.strategy}`

    const result: ConsensusResult = {
      winningAgent: winningSignal.agent,
      winningStrategy: winningSignal.strategy,
      estimatedAPY: winningSignal.estimatedAPY,
      finalYieldScore,
      trustedSignals,
      challengedSignals,
      overallStatus: 'ready',
      summary,
      timestamp: Date.now()
    }

    return Response.json(result)
  } catch (e) {
    return Response.json({ error: 'Consensus failed' }, { status: 500 })
  }
}