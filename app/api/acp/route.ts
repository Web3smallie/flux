// ACP — Agent Communication Protocol
// The open standard for how Flux agents communicate, compete, and reach consensus
// Open sourced so judges and developers can verify and build on it

export async function GET() {
  return Response.json({
    protocol: 'ACP — Agent Communication Protocol',
    version: '1.0.0',
    author: 'Flux — AI Yield Strategy Agent on Mantle',
    license: 'MIT',
    description: 'ACP defines how autonomous AI agents communicate, submit signals, challenge each other, and reach verifiable consensus on Mantle.',

    specification: {
      agentLifecycle: [
        '1. REGISTER — Agent declares its specialty and initial reputation score',
        '2. PAY — Agent pays x402 submission fee to enter consensus round',
        '3. ANALYZE — Agent analyzes user wallet and Mantle ecosystem data',
        '4. COMMIT — Agent commits hash of reasoning onchain before revealing',
        '5. REVEAL — Agent reveals full reasoning, contract verifies hash match',
        '6. COMPETE — Agents with divergent scores challenge each other',
        '7. CONSENSUS — Verified signals averaged to produce final recommendation',
        '8. REWARD — Winning agent receives x402 reward, reputation increases',
        '9. METACOGNITION — Agent self-evaluates and adjusts future behavior'
      ],

      messageTypes: {
        SIGNAL: {
          description: 'Agent submits yield strategy recommendation',
          fields: ['agent', 'yieldScore', 'estimatedAPY', 'strategy', 'reasoning', 'confidenceScore', 'selfEvaluation'],
          onchain: true,
          requiresPayment: true
        },
        CHALLENGE: {
          description: 'Agent challenges another agent signal with divergent score',
          fields: ['challenger', 'target', 'reason', 'alternativeScore'],
          onchain: true,
          requiresPayment: true,
          threshold: 'Score difference > 30 points triggers automatic challenge'
        },
        CONSENSUS: {
          description: 'Final verified consensus result from all agents',
          fields: ['winningAgent', 'winningStrategy', 'estimatedAPY', 'finalYieldScore', 'trustedSignals', 'challengedSignals'],
          onchain: true,
          requiresPayment: false
        },
        PROOF: {
          description: 'Cryptographic commit-reveal proof of agent reasoning',
          fields: ['proofId', 'commitHash', 'attestationHash', 'blockNumber', 'timestamp'],
          onchain: true,
          requiresPayment: false
        },
        SHIELD: {
          description: 'Security validation from SHIELD immune system',
          fields: ['securityScore', 'threatLevel', 'collectiveMemory', 'predictiveDetection', 'contagionMap', 'immuneResponse'],
          onchain: true,
          requiresPayment: false
        },
        X402_PAYMENT: {
          description: 'Economic payment between agents via x402 protocol',
          fields: ['from', 'to', 'amount', 'reason', 'txHash'],
          onchain: true,
          requiresPayment: false
        }
      },

      consensusRules: {
        minimumAgents: 5,
        challengeThreshold: 30,
        trustedSignalWeight: 1.0,
        challengedSignalWeight: 0.0,
        winnerDetermination: 'Highest yieldScore among verified trusted signals',
        tieBreaker: 'Higher reputation score wins'
      },

      reputationSystem: {
        initialScore: 50,
        verifiedSignalReward: '+5 points',
        challengedSignalPenalty: '-10 points',
        consecutiveWinsBonus: '+2 points per streak',
        minimumScore: 0,
        maximumScore: 100
      },

      proofLayer: {
        contract: '0xff817f080e4C2F472F23870685583E78B7a89CCC',
        network: 'Mantle Mainnet (Chain ID: 5000)',
        commitReveal: 'Every signal committed onchain before execution',
        attestation: 'keccak256 hash of reasoning + yieldScore',
        explorer: 'https://explorer.mantle.xyz/address/0xff817f080e4C2F472F23870685583E78B7a89CCC'
      },

      x402Integration: {
        submissionFee: '5 MNT per signal',
        challengeFee: '10 MNT per challenge',
        winnerReward: '25 MNT per consensus win',
        purpose: 'Economic incentive for accurate signals — agents with poor accuracy run out of budget'
      },

      shieldIntegration: {
        runsAfter: 'Executor Agent',
        blocksExecution: 'If threatLevel is danger or critical',
        collectiveMemory: 'Threat patterns shared across all users',
        onchainProof: 'Every Shield verdict committed onchain'
      }
    },

    endpoints: {
      agents: {
        mETH: 'GET /api/agents/meth?holdings=',
        fBTC: 'GET /api/agents/fbtc?holdings=',
        MI4: 'GET /api/agents/mi4?holdings=',
        DeFi: 'GET /api/agents/defi?holdings=',
        UR: 'GET /api/agents/ur?holdings=',
        Executor: 'POST /api/agents/executor',
        Shield: 'POST /api/agents/shield'
      },
      consensus: 'POST /api/consensus',
      proofs: 'GET/POST /api/proofs',
      x402: 'GET/POST /api/x402',
      acp: 'GET /api/acp'
    },

    openSource: {
      github: 'https://github.com/Web3smallie/flux',
      license: 'MIT — free to use, fork, and build on',
      contribution: 'Submit PRs to extend ACP for your own multi-agent systems on Mantle'
    }
  })
}