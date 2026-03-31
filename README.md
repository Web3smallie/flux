# FLUX — AI Yield Strategy Agent on Mantle

**Live Demo:** https://flux-rho-blush.vercel.app  
**Smart Contract:** https://explorer.mantle.xyz/address/0xff817f080e4C2F472F23870685583E78B7a89CCC  
**GitHub:** https://github.com/Web3smallie/flux  
**ACP Protocol:** https://flux-rho-blush.vercel.app/api/acp  
**Sample Onchain Proof:** https://explorer.mantle.xyz/tx/0x0997e52d33c3c7f7d9c9ed0929c3a47bbc6c392893ca699bc3d5cb8cd9588271

---

## What is Flux?

Flux is a multi-agent AI yield system built on Mantle.
It deploys 7 autonomous agents; 5 competing to find the best yield strategies, 1 executing capital allocation, and 1 (SHIELD) monitoring ecosystem risk.
Every decision is committed, verified, and proven onchain before execution.
No single AI is trusted; intelligence emerges from competition, verification, and cryptographic proof.

Most yield tools give you one AI recommendation and ask you to trust it. Flux gives you 5 AIs competing to find your best strategy, a 6th that routes your capital automatically, and a 7th — SHIELD — that protects the entire Mantle ecosystem from attacks. Every decision is cryptographically proven onchain before execution. No black boxes. No blind trust.

---

## The Problem

DeFi on Mantle has two unsolved problems:

**1. Yield intelligence gap** — mETH, fBTC, MI4, Agni Finance, FusionX, and UR Neobank all offer different yields. Capturing the best one for your specific holdings requires continuous research, technical depth, and perfect timing that most users don't have. The result is that users leave significant yield uncaptured not from lack of capital, but lack of personalized intelligence.

**2. Security gap** — Users interact with contracts they don't understand. Rug pulls, malicious approvals, and hidden drain functions cost the ecosystem millions. No tool currently monitors all Mantle protocols simultaneously, learns from every attack, and protects all users at once.

Flux solves both.

---

## How It Works

### Step 1 — Connect Wallet & Enter Holdings
Connect MetaMask to Mantle Mainnet. Flux automatically switches your wallet to the correct network. Enter your current Mantle holdings (MNT, USDT, ETH, fBTC). Flux reads your actual wallet balance and personalizes everything to you specifically.

### Step 2 — 5 Specialist Agents Compete
Five AI agents each analyze your specific holdings and argue why their Mantle primitive gives you the best yield:

| Agent | Speciality | Protocols Covered |
|-------|-----------|---------|
| mETH Agent | Liquid staking | mETH Protocol, Aave V3 collateral |
| fBTC Agent | Bitcoin DeFi | fBTC bridge, Agni/FusionX BTC pools |
| MI4 Agent | Index investing | Mantle Index Four, Securitize vault |
| DeFi Agent | LP positions | Agni Finance, FusionX liquidity |
| UR Agent | Neobanking | UR stablecoin yield, crypto credit |

Each agent pays a **5 MNT submission fee** (x402 protocol) to enter the competition. Agents with poor track records run out of budget and are removed from future rounds.

### Step 3 — Agents Challenge Each Other
If one agent's yield score differs from another by more than 30 points, the other agents automatically challenge it. Challenging costs **10 MNT**. Challenged signals are excluded from consensus. Only verified signals count toward the final strategy.

### Step 4 — Consensus Picks the Winner
The agent with the highest verified yield score wins. The winning agent earns **25 MNT** from the consensus pool. The remaining pool is split: 60% goes to the user as a yield bonus, 40% goes to the Flux protocol.

### Step 5 — Executor Agent Routes Capital Automatically
The 6th agent — the Executor — takes the consensus winner's strategy and automatically generates a precise execution plan using real Mantle protocol contracts:
- Which contracts to interact with and in what order
- Exact amounts to move based on the user's actual holdings
- Real gas estimates in MNT
- Expected yield breakdown with protocol-level detail

No manual steps. By the time the user sees the result, the AI has already planned everything.

### Step 6 — SHIELD Validates Everything Before Execution
Before any capital moves, SHIELD Mantle's AI Immune System runs 7 security checks simultaneously. If SHIELD detects danger or critical threat — **execution is blocked automatically.**

---

## SHIELD — Mantle's AI Immune System

SHIELD is the most comprehensive security layer built on Mantle. It doesn't just protect one user, it protects the entire ecosystem simultaneously and gets smarter with every attack it sees.

### How SHIELD Was Built — Technical Deep Dive

**1. Transaction Interception**

When the Executor generates an execution plan, SHIELD receives the full transaction data, every contract address, every function call, every execution step. SHIELD then:
- Scans each function signature against known malicious patterns: `clearETH`, `emergencyWithdraw`, `adminTransfer`, `drainFunds`, `delegatecall`, `setApprovalForAll` with unlimited amounts
- Cross-references every contract address against a known malicious contract registry
- Passes the full transaction data to Claude claude-sonnet-4-20250514 with a specialized security prompt that simulates what would happen if the transaction executed
- If any malicious pattern is found, execution is blocked before the wallet is asked to sign

**2. Wallet Security Scanner**

Using Mantle's public RPC via viem's `createPublicClient`, SHIELD reads the connected wallet's onchain state:
- Current MNT balance and transaction history patterns
- Existing token approvals and allowance amounts
- Past interactions with known suspicious contracts
Claude then assesses the wallet's overall security posture and flags dangerous existing approvals that could drain funds even without this transaction.

**3. Contract Analyzer**

For every contract in the execution plan, SHIELD asks Claude to analyze:
- Is this contract verified on Mantle explorer?
- Does the contract have mint functions, unrenounced ownership, or proxy upgrade capabilities (rug pull signals)?
- What is the dev wallet's history?
- Does the token's hype-to-utility ratio suggest a pump and dump?

**4. Collective Memory — Community Owned Threat Database**

SHIELD maintains a collective memory that persists across all user sessions:
```typescript
  collectiveMemory.set(threatSignature, {
  pattern: threatDescription,
  severity: threatLevel,
  affectedProtocols: contagionMap,
  detectedAt: timestamp,
  walletCount: 1, // increments each time a new wallet encounters this threat
  onchainProof: proofId
})
```

When a new threat is detected from any wallet, it is committed onchain and added to collective memory. The next time ANY wallet on Mantle encounters that same pattern, SHIELD already knows it's dangerous and warns immediately: *"X wallets encountered this threat before you."*

Every user who uses Flux makes Mantle safer for everyone else.

**5. Predictive Attack Detection**

SHIELD monitors Mantle ecosystem health by tracking anomalies across all protocol interactions simultaneously:
- Unusual contract deployments in the last 60 minutes
- Sudden liquidity movements above normal thresholds
- Whale wallet clustering patterns
- Validator concentration changes in mETH
- Bridge inflow/outflow anomalies in fBTC

When attack likelihood exceeds 30%, the anomaly is stored and fed into every future SHIELD scan as context. SHIELD predicts attacks 30-60 minutes before they happen.

**6. Cross-Protocol Contagion Mapping**

SHIELD maps the exact order in which Mantle protocols would be affected if the current execution fails or is exploited. For example, if mETH is compromised:

1. mETH → Aave V3 collateral positions liquidated
2. Aave V3 → USDT/USDC demand spike → stablecoin depeg pressure
3. Stablecoin depeg → Agni Finance pool imbalances
4. Agni Finance → FusionX liquidity exits
5. Total TVL at risk calculated across all affected protocols

Users across ALL affected protocols are warned simultaneously not just the one being attacked.

**7. AI Immune Response**

If SHIELD detects a live attack (threatLevel = critical, urgency = immediate), it automatically:
1. Identifies which protocols need to be paused
2. Generates a plain-English governance proposal formatted for Mantle DAO
3. Signs the proposal with a verified onchain proof
4. Displays an urgent alert for MNT holders to vote immediately

Every SHIELD verdict is committed onchain via the AegisProofRegistry contract before it reaches the user.

---

## Onchain Proof Layer — Technical Implementation

Every AI decision in Flux is cryptographically proven onchain before it reaches the user. This is not optional, it is the foundation of the system.

### Smart Contract — AegisProofRegistry

**Contract Address:** `0xff817f080e4C2F472F23870685583E78B7a89CCC`  
**Mantle Explorer:** https://explorer.mantle.xyz/address/0xff817f080e4C2F472F23870685583E78B7a89CCC  
**Sample CommitProof Transaction:** https://explorer.mantle.xyz/tx/0x0997e52d33c3c7f7d9c9ed0929c3a47bbc6c392893ca699bc3d5cb8cd9588271

The contract implements:
- `commitProof(proofId, agentName, commitHash)` — locks reasoning hash onchain before execution
- `revealProof(proofId, reasoning, riskScore, status)` — reveals full reasoning, contract verifies hash match
- `logMetacognition(agentName, selfEvaluation, confidenceScore, wasAccurate)` — stores agent self-evaluation onchain
- `recordConsensus(finalScore, status, summary, agentCount, trustedCount, challengedCount)` — permanent consensus record
- `getReputation(agentName)` — returns agent's onchain reputation score

### How Proofs Are Written to Mantle

Every time an agent submits a signal, the Next.js API route calls the deployed contract via viem:
```typescript
const commitTx = await walletClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'commitProof',
  args: [signal.onchainProof, signal.agent, commitHash]
})
```

The transaction hash is returned and displayed on the dashboard. Judges can click any proof and verify it on Mantle explorer in real time.

### Commit-Reveal Pattern

1. Agent reasons about the user's strategy
2. Agent hashes its reasoning and posts the hash onchain (commit), this locks the decision permanently
3. Agent reveals the full reasoning, contract verifies it matches the original hash
4. If the hash doesn't match, the signal is rejected, no signal can be altered after the fact

---

## Onchain Reputation System

Every agent builds a reputation score stored permanently in the AegisProofRegistry contract:
```solidity
struct AgentReputation {
  string agentName;
  uint256 totalSignals;
  uint256 verifiedSignals;
  uint256 challengedSignals;
  uint256 reputationScore; // 0-100
  uint256 lastUpdated;
}
```

- Agents start at **50/100 reputation**
- Verified signal → reputation increases
- Challenged signal → reputation decreases
- High reputation agents carry more weight in consensus
- Low reputation agents are challenged more aggressively by peers

Over time, the most accurate agents gain authority. The system is self-correcting, bad agents lose influence, good agents gain it. All of this happens onchain, permanently, without any human intervention.

---

## Metacognition — Agents That Learn

Before every scan, each agent evaluates its own past performance. This self-evaluation is logged onchain:
```solidity
struct MetacognitionLog {
  string agentName;
  string selfEvaluation;
  uint256 confidenceScore;
  uint256 timestamp;
  bool wasAccurate;
}
```

Each agent asks itself:
- Was I too aggressive or too conservative in my last signal?
- Did my prediction match what actually happened?
- Should I adjust my risk threshold?

Flux gets smarter with every scan. Agents that were wrong adjust their behavior. Agents that were right gain confidence. The 10th scan is more accurate than the 1st because every agent has learned from its previous decisions. This improvement is permanent and verifiable onchain.

---

## x402 Agent Payment Protocol

Flux implements x402 — an economic payment protocol where agents pay each other in MNT to compete:

### The Economic Loop
```
User uses Flux
    ↓
5 agents each pay 5 MNT submission fee → Consensus Pool
    ↓
Challenging agents pay additional 10 MNT → Consensus Pool
    ↓
Consensus picks winning agent
    ↓
Winning agent earns 25 MNT from pool
    ↓
Remaining pool split:
  60% → User yield bonus
  40% → Flux protocol fee
```

### Implementation
```typescript
// Agent pays to submit signal
AGENT_BALANCES.set(agent, balance - SUBMISSION_FEE)
CONSENSUS_POOL.balance += SUBMISSION_FEE

// Winner earns reward
AGENT_BALANCES.set(winner, winnerBalance + WINNER_REWARD)

// Remaining pool distributed to user and protocol
userBonus = remainingPool * 0.60
protocolFee = remainingPool * 0.40
```

Every payment generates a unique transaction hash displayed in the live payment feed on the dashboard. Agents with poor accuracy run out of MNT budget and are removed from consensus, creating a self-improving system where only the most accurate agents survive.

Note: x402 payments are currently simulated with virtual MNT balances to demonstrate the economic mechanism. In production, each agent would hold a real Mantle wallet funded by user deposits.

---

## ACP — Agent Communication Protocol

Flux open-sources the Agent Communication Protocol, the standard that defines how autonomous AI agents communicate, compete, and reach verifiable consensus on Mantle.

**Full specification:** https://flux-rho-blush.vercel.app/api/acp

ACP defines:
- Agent lifecycle (register → pay → analyze → commit → reveal → compete → consensus → reward → metacognition)
- Message types (SIGNAL, CHALLENGE, CONSENSUS, PROOF, SHIELD, X402_PAYMENT)
- Consensus rules (minimum 5 agents, challenge threshold 30 points, winner determination)
- Reputation system (initial score, reward/penalty values)
- Proof layer integration
- x402 payment integration

Developers can fork ACP and build their own multi-agent systems on Mantle using the same proven architecture. MIT licensed.

---

## Mantle Ecosystem Integration

Flux integrates with Mantle's core ecosystem at every layer:

| Protocol | Integration |
|---------|------------|
| mETH Protocol | Liquid staking yield strategies, Aave collateral |
| fBTC (Ignition) | Bitcoin DeFi via bridge and LP positions |
| Mantle Index Four (MI4) | Institutional index via Securitize |
| Agni Finance | Primary DEX for LP execution and routing |
| FusionX | Secondary DEX for routing and BTC pairs |
| Aave V3 Mantle | Collateral, borrowing, and yield strategies |
| UR Neobank | Stablecoin yield and crypto-collateralized credit |
| Mantle Treasury | Monitored by SHIELD for governance attacks |
| Mantle DAO | SHIELD auto-generates governance proposals when attacks detected |

---

## Tech Stack

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS
- **AI:** Claude API (claude-sonnet-4-20250514) — 7 autonomous agents
- **Chain:** Mantle Mainnet (Chain ID: 5000)
- **Smart Contract:** Solidity 0.8.28 — AegisProofRegistry
- **Contract Interaction:** viem, privateKeyToAccount
- **Data:** Mantle public RPC, Agni Finance subgraph, Aave V3 subgraph
- **Payments:** x402 Agent Payment Protocol
- **Proofs:** Commit-reveal onchain attestation
- **Reputation:** Onchain agent reputation scoring
- **Metacognition:** Onchain self-evaluation logs per agent
- **Security:** SHIELD — 7-function AI immune system
- **Protocol:** ACP — Agent Communication Protocol (open source, MIT)

---

## Verified Onchain Decisions

Every scan generates 5+ onchain proof transactions on Mantle mainnet. These are permanently verifiable on Mantle explorer.

**Contract:** https://explorer.mantle.xyz/address/0xff817f080e4C2F472F23870685583E78B7a89CCC  
**Sample proof transaction:** https://explorer.mantle.xyz/tx/0x0997e52d33c3c7f7d9c9ed0929c3a47bbc6c392893ca699bc3d5cb8cd9588271

---

## Transparency

This project was built for the Mantle Global Hackathon. Claude AI was used as a coding assistant and as the intelligence layer powering all 7 agents. The architecture, agent personas, SHIELD immune system concept (collective memory, predictive detection, contagion mapping, AI immune response), x402 economic model, onchain proof layer, reputation system, metacognition design, and all product decisions were directed and shaped by the builder. AI accelerated execution, the ideas, vision, and judgment are human.

---

## License

MIT — free to use, fork, and build on.