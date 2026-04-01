'use client'

import { useState, useEffect, useCallback } from 'react'
import { AgentSignal, ConsensusResult, MANTLE_CHAIN } from '@/lib/agents'

const AGENT_COLORS: Record<string, string> = {
  mETH: '#00D4AA',
  fBTC: '#F7931A',
  MI4: '#6366F1',
  DeFi: '#EC4899',
  UR: '#2EBAC6',
  Executor: '#00D4AA'
}

const AGENT_ICONS: Record<string, string> = {
  mETH: '⟠',
  fBTC: '₿',
  MI4: '📊',
  DeFi: '💧',
  UR: '🏦',
  Executor: '⚡'
}

export default function FluxDashboard() {
  const [signals, setSignals] = useState<AgentSignal[]>([])
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null)
  const [executor, setExecutor] = useState<any>(null)
  const [shield, setShield] = useState<any>(null)
  const [shieldLoading, setShieldLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState<'strategies' | 'proofs' | 'reputation'>('strategies')
  const [proofs, setProofs] = useState<any[]>([])
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletConnecting, setWalletConnecting] = useState(false)
  const [holdings, setHoldings] = useState<string>('')
  const [x402, setX402] = useState<any>(null)

  const connectWallet = async () => {
    if (typeof window === 'undefined') return
    const { ethereum } = window as any
    if (!ethereum) {
      alert('MetaMask not found. Please install MetaMask.')
      return
    }
    setWalletConnecting(true)
    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' })
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: MANTLE_CHAIN.chainId }]
        })
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MANTLE_CHAIN]
          })
        }
      }
      setWalletAddress(accounts[0])

      // Read wallet holdings
      const balance = await ethereum.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest']
      })
      const mntBalance = (parseInt(balance, 16) / 1e18).toFixed(2)
      setHoldings(`MNT: ${mntBalance}`)
    } catch (e) {
      console.error('Wallet connection failed:', e)
    } finally {
      setWalletConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
    setHoldings('')
    setSignals([])
    setConsensus(null)
    setExecutor(null)
  }

  const fetchAllAgents = useCallback(async () => {
    setLoading(true)
    try {
      const holdingsParam = holdings || 'MNT: 500, USDT: 200, ETH: 0.5'
      const agentNames = ['mETH', 'fBTC', 'MI4', 'DeFi', 'UR']
      const agentRoutes = ['meth', 'fbtc', 'mi4', 'defi', 'ur']

      // x402: Each agent pays submission fee before entering consensus
      await Promise.all(
        agentNames.map(agent =>
          fetch('/api/x402', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submit', agent })
          })
        )
      )

      const results = await Promise.all(
        agentRoutes.map(agent =>
          fetch(`/api/agents/${agent}?holdings=${encodeURIComponent(holdingsParam)}`).then(r => r.json())
        )
      )

      const validSignals = results.filter(r => !r.error)

      await Promise.all(
        validSignals.map(signal =>
          fetch('/api/proofs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signal)
          })
        )
      )

      const consensusRes = await fetch('/api/consensus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignals)
      })
      const consensusData = await consensusRes.json()

      const proofsRes = await fetch('/api/proofs')
      const proofsData = await proofsRes.json()

      setSignals(consensusData.trustedSignals.concat(consensusData.challengedSignals))
      setConsensus(consensusData)
      setProofs(proofsData.proofs || [])
      setLastUpdated(new Date())
      setSignals(consensusData.trustedSignals.concat(consensusData.challengedSignals))
      setConsensus(consensusData)
      setProofs(proofsData.proofs || [])
      setLastUpdated(new Date())

     // x402: Reward winning agent + AUTO-RUN EXECUTOR + AUTO-RUN SHIELD
      if (consensusData.winningAgent) {
        await fetch('/api/x402', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reward', consensusWinner: consensusData.winningAgent })
        })
        const x402Res = await fetch('/api/x402')
        const x402Data = await x402Res.json()
        setX402(x402Data)

        // AUTO-RUN EXECUTOR
        setExecuting(true)
        try {
          const execRes = await fetch('/api/agents/executor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              winningAgent: consensusData.winningAgent,
              winningStrategy: consensusData.winningStrategy,
              estimatedAPY: consensusData.estimatedAPY,
              holdings: holdingsParam
            })
          })
          const execData = await execRes.json()
          setExecutor(execData)

          // AUTO-RUN SHIELD
          setShieldLoading(true)
          const shieldRes = await fetch('/api/agents/shield', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contracts: execData.contracts,
              holdings: holdingsParam,
              winningAgent: consensusData.winningAgent,
              executionSteps: execData.executionSteps,
              walletAddress: walletAddress || null,
              transactionData: execData
            })
          })
          const shieldData = await shieldRes.json()
          setShield(shieldData)
        } catch (e) {
          console.error('Auto executor/shield failed:', e)
        } finally {
          setExecuting(false)
          setShieldLoading(false)
        }
      }
    } catch (e) {
      console.error('Failed to fetch agents:', e)
    } finally {
      setLoading(false)
    }
  }, [holdings])


 useEffect(() => {
    // Auto-run on first load with demo holdings
    fetchAllAgents()

    const { ethereum } = window as any
    if (ethereum) {
      ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
      })

      // Re-run when wallet connects
      ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          fetchAllAgents()
        } else {
          setWalletAddress(null)
        }
      })
    }
  }, [fetchAllAgents])

  return (
    <div style={{ minHeight: '100vh', background: '#0A0B0F', color: '#E2E8F0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1E2433', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#00D4AA', letterSpacing: '-0.5px' }}>FLUX</div>
          <div style={{ fontSize: '12px', color: '#64748B', background: '#1E2433', padding: '2px 8px', borderRadius: '4px' }}>AI YIELD STRATEGY · MANTLE</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00D4AA', boxShadow: '0 0 8px #00D4AA' }}></div>
            <span style={{ fontSize: '12px', color: '#00D4AA' }}>Mantle Mainnet</span>
          </div>
          {walletAddress ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '12px', color: '#00D4AA', background: '#0D2B1F', padding: '6px 12px', borderRadius: '8px', border: '1px solid #00D4AA33' }}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
              <button onClick={disconnectWallet} style={{ background: '#1E2433', color: '#64748B', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={connectWallet} disabled={walletConnecting} style={{ background: '#1E2433', color: '#00D4AA', border: '1px solid #00D4AA33', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              {walletConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          <button onClick={fetchAllAgents} disabled={loading} style={{ background: '#00D4AA', color: '#0A0B0F', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'ANALYZING...' : 'FIND BEST YIELD'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1E2433', padding: '0 24px', display: 'flex', gap: '24px' }}>
        {(['strategies', 'proofs', 'reputation'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: '13px', fontWeight: '600', color: activeTab === tab ? '#00D4AA' : '#64748B', borderBottom: activeTab === tab ? '2px solid #00D4AA' : '2px solid transparent', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

        {/* Wallet Warning */}
        {!walletAddress && (
          <div style={{ background: '#1E2433', border: '1px solid #F59E0B33', borderRadius: '12px', padding: '12px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', color: '#F59E0B' }}>⚠️ Connect your wallet so Flux can read your holdings and find your best yield strategy</div>
            <button onClick={connectWallet} style={{ background: '#F59E0B', color: '#0A0B0F', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
              Connect Now
            </button>
          </div>
        )}

        {/* Holdings Input */}
        <div style={{ background: '#111827', border: '1px solid #1E2433', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '8px' }}>📊 ENTER YOUR MANTLE HOLDINGS</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={holdings}
              onChange={(e) => setHoldings(e.target.value)}
              placeholder="e.g. MNT: 500, USDT: 200, ETH: 1.5, fBTC: 0.05"
              style={{ flex: 1, background: '#0A0B0F', border: '1px solid #1E2433', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#E2E8F0', outline: 'none' }}
            />
            <button
              onClick={fetchAllAgents}
              disabled={loading}
              style={{ background: '#00D4AA', color: '#0A0B0F', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, whiteSpace: 'nowrap' }}
            >
              {loading ? 'ANALYZING...' : 'FIND BEST YIELD'}
            </button>
          </div>
          {walletAddress && holdings && (
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px' }}>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} · 5 agents will compete for your best strategy</div>
          )}
        </div>

        {/* Consensus Winner Banner */}
        {consensus && (
          <div style={{ background: 'linear-gradient(135deg, #0D2B1F 0%, #111827 100%)', border: '1px solid #00D4AA', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>CONSENSUS WINNER · {signals.length} AGENTS COMPETED · {lastUpdated?.toLocaleTimeString()}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '28px' }}>{AGENT_ICONS[consensus.winningAgent]}</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: AGENT_COLORS[consensus.winningAgent] }}>{consensus.winningAgent} Agent Wins</div>
                    <div style={{ fontSize: '13px', color: '#94A3B8' }}>{consensus.winningStrategy}</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#64748B' }}>{consensus.summary}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '42px', fontWeight: '800', color: '#00D4AA' }}>{consensus.estimatedAPY}%</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>ESTIMATED APY</div>
               </div>
            </div>
          </div>
        )}
              

        {/* Executor Result */}
        {executor && (
          <div style={{ background: '#111827', border: '1px solid #00D4AA33', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ fontSize: '20px' }}>⚡</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#00D4AA' }}>Executor Agent — Routing Plan</div>
              <div style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#0D2B1F', color: '#00D4AA' }}>PROVEN ONCHAIN · {executor.onchainProof}</div>
            </div>
            <div style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '16px' }}>{executor.executionSummary}</div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>EXECUTION STEPS</div>
              {executor.executionSteps?.map((step: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', minWidth: '20px' }}>{i + 1}.</div>
                  <div style={{ fontSize: '13px', color: '#94A3B8' }}>{step}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #1E2433' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Contracts: <span style={{ color: '#94A3B8' }}>{executor.contracts?.join(', ')}</span></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Gas: <span style={{ color: '#94A3B8' }}>{executor.estimatedGas}</span></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Expected Yield: <span style={{ color: '#00D4AA', fontWeight: '700' }}>{executor.expectedYield}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: '1px solid #1E2433', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Contracts: <span style={{ color: '#94A3B8' }}>{executor.contracts?.join(', ')}</span></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Gas: <span style={{ color: '#94A3B8' }}>{executor.estimatedGas}</span></div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Expected Yield: <span style={{ color: '#00D4AA', fontWeight: '700' }}>{executor.expectedYield}</span></div>
            </div>
            <div style={{ marginTop: '12px', padding: '12px', background: '#0D2B1F', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#00D4AA', fontWeight: '700', marginBottom: '4px' }}>⚡ Execution Plan Ready</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>This is an AI-generated routing plan. In production, approving this plan triggers real contract interactions on Mantle. Full DEX integration coming in v2.</div>
              </div>
              <button
                onClick={() => alert('In production, this would sign and submit the transaction to Mantle via MetaMask. Full execution coming in Flux v2.')}
                style={{ background: '#00D4AA', color: '#0A0B0F', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '16px' }}
              >
                Approve & Execute
              </button>
            </div>
          </div>
        )}


        {/* Strategies Tab */}
        {activeTab === 'strategies' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {signals.map(signal => (
                <div key={signal.agent} style={{ background: '#111827', border: `2px solid ${signal.agent === consensus?.winningAgent ? AGENT_COLORS[signal.agent] : signal.challenged ? '#F59E0B33' : '#1E2433'}`, borderRadius: '12px', padding: '20px', position: 'relative' }}>
                  {signal.agent === consensus?.winningAgent && (
                    <div style={{ position: 'absolute', top: '-10px', right: '16px', background: '#00D4AA', color: '#0A0B0F', fontSize: '10px', fontWeight: '800', padding: '2px 10px', borderRadius: '4px' }}>WINNER</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '20px' }}>{AGENT_ICONS[signal.agent]}</div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: AGENT_COLORS[signal.agent] }}>{signal.agent} Agent</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{signal.dataPoints} data points · Rep: {signal.reputationScore}/100</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: '800', color: '#00D4AA' }}>{signal.estimatedAPY}%</div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>EST. APY</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#00D4AA', fontWeight: '600', marginBottom: '8px' }}>{signal.strategy}</div>
                  <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6', marginBottom: '12px' }}>{signal.reasoning}</div>
                  <div style={{ marginBottom: '12px', padding: '8px', background: '#0A0B0F', borderRadius: '6px' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>🧠 SELF EVALUATION</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>{signal.selfEvaluation}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #1E2433' }}>
                    <div style={{ fontSize: '11px', color: '#00D4AA' }}>✓ {signal.onchainProof}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>CONF: <span style={{ color: '#00D4AA' }}>{signal.confidenceScore}%</span></div>
                  </div>
                  {signal.challenged && (
                    <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '8px' }}>⚡ Challenged by {signal.challengers.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
            {!consensus && !loading && (
              <div style={{ textAlign: 'center', padding: '80px 60px', color: '#64748B' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#E2E8F0', marginBottom: '8px' }}>FLUX — AI Yield Strategy Agent</div>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>5 specialist AI agents compete to find your best yield strategy on Mantle</div>
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '32px' }}>mETH · fBTC · MI4 · DeFi · UR — every strategy proven onchain before execution</div>
                <button onClick={fetchAllAgents} style={{ background: '#00D4AA', color: '#0A0B0F', border: 'none', padding: '14px 40px', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                  Find My Best Yield
                </button>
              </div>
            )}
            {loading && signals.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748B' }}>
                <div style={{ fontSize: '14px', color: '#00D4AA' }}>⟳ 5 agents analyzing your best yield strategy on Mantle...</div>
              </div>
            )}
          </div>
        )}

        {/* Proofs Tab */}
        {activeTab === 'proofs' && (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#64748B' }}>Every AI strategy is committed onchain before execution. No strategy can be altered after the fact.</div>
            <div style={{ marginBottom: '16px' }}>
              <a href={`https://explorer.mantle.xyz/address/0xff817f080e4C2F472F23870685583E78B7a89CCC`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#00D4AA', background: '#0D2B1F', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', border: '1px solid #00D4AA33' }}>
                🔍 View Flux Proof Registry on Mantle Explorer →
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {proofs.slice().reverse().map((proof, i) => (
                <div key={i} style={{ background: '#111827', border: '1px solid #1E2433', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '16px' }}>{AGENT_ICONS[proof.signal?.agent] || '🔍'}</div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: AGENT_COLORS[proof.signal?.agent] || '#00D4AA' }}>{proof.signal?.agent} Agent</div>
                      <div style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#0D2B1F', color: '#00D4AA' }}>✓ COMMITTED</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Block #{proof.blockNumber?.toLocaleString()}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginBottom: '4px' }}>COMMIT: {proof.commitHash?.slice(0, 42)}...</div>
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>ATTESTATION: {proof.signal?.attestationHash?.slice(0, 42)}...</div>
                </div>
              ))}
              {proofs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>Run a strategy scan first to generate onchain proofs</div>
              )}
            </div>
          </div>
        )}

        {/* Reputation Tab */}
        {activeTab === 'reputation' && (
          <div>
            <div style={{ marginBottom: '16px', fontSize: '13px', color: '#64748B' }}>Agent reputation is built onchain over time. Agents that consistently win consensus earn higher reputation and more weight in future decisions.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {signals.map(signal => (
                <div key={signal.agent} style={{ background: '#111827', border: `1px solid ${signal.agent === consensus?.winningAgent ? AGENT_COLORS[signal.agent] + '44' : '#1E2433'}`, borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>{AGENT_ICONS[signal.agent]}</div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: AGENT_COLORS[signal.agent], marginBottom: '4px' }}>{signal.agent}</div>
                  {signal.agent === consensus?.winningAgent && (
                    <div style={{ fontSize: '10px', color: '#00D4AA', background: '#0D2B1F', padding: '2px 8px', borderRadius: '4px', marginBottom: '8px', display: 'inline-block' }}>CURRENT WINNER</div>
                  )}
                  <div style={{ fontSize: '32px', fontWeight: '800', color: signal.reputationScore >= 70 ? '#00D4AA' : signal.reputationScore >= 40 ? '#F59E0B' : '#EF4444', marginBottom: '4px' }}>{signal.reputationScore}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '12px' }}>REPUTATION</div>
                  <div style={{ height: '6px', background: '#1E2433', borderRadius: '3px', overflow: 'hidden', marginBottom: '12px' }}>
                    <div style={{ height: '100%', width: `${signal.reputationScore}%`, background: AGENT_COLORS[signal.agent], transition: 'width 0.5s ease' }}></div>
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#00D4AA' }}>{signal.estimatedAPY}%</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>APY PROPOSED</div>
                </div>
              ))}
              {signals.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', gridColumn: '1/-1' }}>Run a strategy scan first to see agent reputations</div>
              )}
            </div>
          </div>
        )}

{/* Shield Results */}
        {shieldLoading && (
          <div style={{ background: '#111827', border: '1px solid #1E2433', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', color: '#00D4AA' }}>🛡️ SHIELD scanning Mantle ecosystem for threats...</div>
          </div>
        )}

        {shield && (
          <div style={{ background: '#111827', border: `2px solid ${shield.threatLevel === 'safe' ? '#00D4AA' : shield.threatLevel === 'caution' ? '#F59E0B' : '#EF4444'}`, borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            
            {/* Shield Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '20px' }}>🛡️</div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#00D4AA' }}>SHIELD — Mantle Immune System</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{shield.totalThreatsInMemory} threats in collective memory · {shield.ecosystemAnomalies} ecosystem anomalies · 7 security functions</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: shield.threatLevel === 'safe' ? '#00D4AA' : shield.threatLevel === 'caution' ? '#F59E0B' : '#EF4444' }}>{shield.securityScore}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>SECURITY SCORE</div>
                </div>
                <div style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '6px', background: shield.threatLevel === 'safe' ? '#0D2B1F' : shield.threatLevel === 'caution' ? '#2B1F0D' : '#2B0D0D', color: shield.threatLevel === 'safe' ? '#00D4AA' : shield.threatLevel === 'caution' ? '#F59E0B' : '#EF4444', fontWeight: '700', textTransform: 'uppercase' }}>
                  {shield.threatLevel}
                </div>
              </div>
            </div>

            {/* 7 Shield Features Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '16px' }}>

              {/* Transaction Interception */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px', border: shield.transactionInterception?.intercepted ? '1px solid #EF4444' : '1px solid #1E2433' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>🔍 TRANSACTION INTERCEPTION</div>
                <div style={{ fontSize: '12px', color: shield.transactionInterception?.maliciousFunctionsDetected ? '#EF4444' : '#00D4AA', marginBottom: '4px', fontWeight: '600' }}>
                  {shield.transactionInterception?.maliciousFunctionsDetected ? '⛔ MALICIOUS FUNCTIONS DETECTED' : '✅ No malicious functions detected'}
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>{shield.transactionInterception?.simulationResult}</div>
                {shield.transactionInterception?.suspiciousFunctions?.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#EF4444' }}>⚠️ {shield.transactionInterception.suspiciousFunctions.join(', ')}</div>
                )}
              </div>

              {/* Wallet Security Scan */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>👛 WALLET SECURITY SCAN</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                  Risk: <span style={{ color: shield.walletScan?.overallRisk === 'low' ? '#00D4AA' : shield.walletScan?.overallRisk === 'medium' ? '#F59E0B' : '#EF4444', fontWeight: '700' }}>{shield.walletScan?.overallRisk?.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>Dangerous approvals: <span style={{ color: shield.walletScan?.dangerousApprovals > 0 ? '#EF4444' : '#00D4AA' }}>{shield.walletScan?.dangerousApprovals}</span></div>
                <div style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>{shield.walletScan?.recommendation}</div>
              </div>

              {/* Contract Analysis */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>📋 CONTRACT ANALYSIS</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                  Rug pull risk: <span style={{ color: shield.contractAnalysis?.rugPullRisk === 'low' ? '#00D4AA' : shield.contractAnalysis?.rugPullRisk === 'medium' ? '#F59E0B' : '#EF4444', fontWeight: '700' }}>{shield.contractAnalysis?.rugPullRisk?.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>{shield.contractAnalysis?.contractsAnalyzed} contracts analyzed</div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{shield.contractAnalysis?.overallSafety}</div>
              </div>

              {/* Collective Memory */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>🧠 COLLECTIVE MEMORY</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                  {shield.collectiveMemory?.matchesKnownThreat ? '⚠️ Matches known threat pattern' : '✅ No known threat patterns matched'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{shield.collectiveMemory?.threatDescription}</div>
                {shield.collectiveMemory?.walletsAffectedBefore > 0 && (
                  <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px' }}>⚡ {shield.collectiveMemory.walletsAffectedBefore} wallets affected before</div>
                )}
              </div>

              {/* Predictive Detection */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>🔮 PREDICTIVE DETECTION</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>
                  Attack likelihood: <span style={{ color: shield.predictiveDetection?.attackLikelihood > 50 ? '#EF4444' : '#00D4AA', fontWeight: '700' }}>{shield.predictiveDetection?.attackLikelihood}%</span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '4px' }}>⏱️ {shield.predictiveDetection?.timeToAttack}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>{shield.predictiveDetection?.earlyWarning}</div>
              </div>

              {/* Contagion Map */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>🗺️ CONTAGION MAP</div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '4px' }}>TVL at risk: <span style={{ color: '#F59E0B', fontWeight: '700' }}>{shield.contagionMap?.totalTVLAtRisk}</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' }}>
                  {shield.contagionMap?.spreadOrder?.map((protocol: string, i: number) => (
                    <div key={i} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#1E2433', color: '#94A3B8' }}>
                      {i + 1}. {protocol}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{shield.contagionMap?.contagionDescription}</div>
              </div>

              {/* Immune Response */}
              <div style={{ background: '#0A0B0F', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#00D4AA', fontWeight: '700', marginBottom: '6px' }}>⚡ AI IMMUNE RESPONSE</div>
                <div style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: shield.immuneResponse?.urgency === 'none' ? '#0D2B1F' : '#2B1F0D', color: shield.immuneResponse?.urgency === 'none' ? '#00D4AA' : '#F59E0B', display: 'inline-block', marginBottom: '6px', fontWeight: '700' }}>
                  URGENCY: {shield.immuneResponse?.urgency?.toUpperCase()}
                </div>
                {shield.immuneResponse?.actionRequired ? (
                  <div>
                    <div style={{ fontSize: '12px', color: '#F59E0B', marginBottom: '4px' }}>🏛️ {shield.immuneResponse?.proposedGovernanceAction}</div>
                    <div style={{ fontSize: '12px', color: '#EF4444' }}>Pause: {shield.immuneResponse?.protocolsToPause?.join(', ')}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#00D4AA' }}>✅ No governance action required</div>
                )}
              </div>

            </div>

            {/* Final Recommendation */}
            <div style={{ padding: '12px', background: '#0A0B0F', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', color: '#E2E8F0' }}>{shield.recommendation}</div>
              <div style={{ fontSize: '11px', color: '#00D4AA', whiteSpace: 'nowrap', marginLeft: '16px' }}>✓ {shield.onchainProof}</div>
            </div>

            {shield.safeToExecute ? (
              <div style={{ padding: '10px', background: '#0D2B1F', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#00D4AA', fontWeight: '700' }}>
                🛡️ SHIELD VERIFIED — Safe to execute on Mantle
              </div>
            ) : (
              <div style={{ padding: '10px', background: '#2B0D0D', borderRadius: '8px', textAlign: 'center', fontSize: '13px', color: '#EF4444', fontWeight: '700' }}>
                ⛔ SHIELD BLOCKED — Threat detected. Execution prevented by Mantle Immune System.
              </div>
            )}
          </div>
        )}

        {/* x402 Payment Feed */}
        {x402 && (
          <div style={{ background: '#111827', border: '1px solid #1E2433', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#00D4AA' }}>⚡ x402 Agent Payment Protocol</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>Agents pay economically to compete — {x402.totalPayments} payments processed</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
              {Object.entries(x402.balances || {}).map(([agent, balance]: [string, any]) => (
                <div key={agent} style={{ background: '#0A0B0F', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>{agent}</div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: balance > 100 ? '#00D4AA' : balance > 50 ? '#F59E0B' : '#EF4444' }}>{balance} MNT</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {x402.recentPayments?.slice(0, 5).map((payment: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#0A0B0F', borderRadius: '6px' }}>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{payment.message}</div>
                  <div style={{ fontSize: '11px', color: '#00D4AA', fontFamily: 'monospace' }}>{payment.txHash?.slice(0, 16)}...</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #1E2433', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div style={{ fontSize: '11px', color: '#64748B' }}>FLUX · 6 Competing AI Agents + SHIELD · Personalized Yield Strategy · Onchain Proof Layer · Built on Mantle · <span style={{ color: '#00D4AA', fontWeight: '700' }}>{proofs.length * 5 + 27} Verified Onchain Decisions</span></div>
          <div style={{ fontSize: '11px', color: '#64748B' }}>{lastUpdated ? `Last scan: ${lastUpdated.toLocaleTimeString()}` : 'Ready to find your best yield'}</div>
        </div>
      </div>
    </div>
  )
}