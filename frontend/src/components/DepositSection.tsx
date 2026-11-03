import { useMemo, useState } from 'react'
import { Banknote, Coins, Plus, Wallet } from 'lucide-react'
import type { Deposit } from '../contracts/types'
import {
  certificateLineage,
  certificateStatus,
  earlyWithdrawalFee,
  earlyWithdrawalPayout,
  formatDate,
  formatUsd,
  matchesCertificateFilter,
  type CertificateFilter,
} from '../lib/banking'

type Props = {
  account: string
  deposits: Deposit[]
  now: number
  gracePeriod: number
  timeUnit: number
  onConnect: () => void
  onNewDeposit: () => void
  onWithdraw: (deposit: Deposit, early: boolean) => void
  onRenew: (deposit: Deposit) => void
  onTransfer: (deposit: Deposit) => void
}

const filters: Array<{ value: CertificateFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'renewed', label: 'Renewed' },
]

export function DepositSection({ account, deposits, now, gracePeriod, timeUnit, onConnect, onNewDeposit, onWithdraw, onRenew, onTransfer }: Props) {
  const [filter, setFilter] = useState<CertificateFilter>('all')
  const visibleDeposits = useMemo(
    () => deposits.filter((deposit) => matchesCertificateFilter(deposit, filter)),
    [deposits, filter],
  )

  return <section className="section deposits" id="deposits">
    <div className="heading">
      <div><label>Your portfolio</label><h2>Deposit certificates</h2><p>Track maturity, returns and manage every onchain position.</p></div>
      {account && <button className="primary" onClick={onNewDeposit}><Plus />New deposit</button>}
    </div>
    {account && deposits.length > 0 && <div className="certificate-filters" aria-label="Certificate filters">
      {filters.map((item) => <button key={item.value} className={filter === item.value ? 'active' : ''} onClick={() => setFilter(item.value)}>{item.label}</button>)}
      <span>{visibleDeposits.length} of {deposits.length}</span>
    </div>}
    {!account || !deposits.length ? <div className="empty">
      <i>{account ? <Banknote /> : <Wallet />}</i>
      <h3>{account ? 'No deposits yet' : 'Connect your wallet'}</h3>
      <p>{account ? 'Pick a plan and put your mUSDC to work.' : 'Your savings certificates will appear here.'}</p>
      <button className="primary" onClick={account ? onNewDeposit : onConnect}>{account ? 'Open first deposit' : 'Connect MetaMask'}</button>
    </div> : visibleDeposits.length === 0 ? <div className="empty compact-empty"><h3>No certificates in this filter</h3><p>Choose another status to see your certificates.</p></div> : <div className="deposit-list">
      {visibleDeposits.map((deposit) => {
        const mature = now >= deposit.maturity
        const grace = mature && now < deposit.maturity + gracePeriod
        const duration = Math.max(1, deposit.maturity - deposit.start)
        const progress = Math.min(100, Math.max(0, (now - deposit.start) / duration * 100))
        const lineage = certificateLineage(deposit)
        const fee = earlyWithdrawalFee(deposit)
        const payout = earlyWithdrawalPayout(deposit)
        return <article key={deposit.id}>
          <div className="cert"><i><Coins /></i><span><h3>Certificate #{deposit.id} <em>{certificateStatus(deposit)}</em></h3><p>Plan #{deposit.planId} · {deposit.tenor} days · {(deposit.apr / 100).toFixed(2)}% APR</p>{lineage && <p className="lineage">{lineage}</p>}</span></div>
          <div><small>Principal</small><b>${formatUsd(deposit.principal)}</b><em>+ ${formatUsd(deposit.interest)} interest</em>{deposit.status === 0 && !mature && <p className="early-hint">Early exit: {(deposit.penalty / 100).toFixed(1)}% fee (${formatUsd(fee)}) · receive ${formatUsd(payout)}</p>}</div>
          <div className="maturity"><small>{mature ? 'Matured' : 'Maturity'}</small><b>{formatDate(deposit.maturity, timeUnit < 86_400)}</b><span><i style={{ width: `${progress}%` }} /></span></div>
          <div className="actions">{deposit.status === 0 && (mature ? <><button onClick={() => onWithdraw(deposit, false)}>Withdraw all</button>{grace && <button onClick={() => onRenew(deposit)}>Renew</button>}</> : <button onClick={() => onWithdraw(deposit, true)}>Withdraw early</button>)}<button onClick={() => onTransfer(deposit)}>Send NFT</button></div>
        </article>
      })}
    </div>}
  </section>
}
