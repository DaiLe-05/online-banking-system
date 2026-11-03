import { formatUnits } from 'ethers'
import type { Deposit } from '../contracts/types'

export const TOKEN_DECIMALS = 6

export type CertificateFilter = 'all' | 'active' | 'withdrawn' | 'renewed'

export function formatUsd(value: bigint, decimals = 2) {
  return Number(formatUnits(value, TOKEN_DECIMALS)).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export function formatDate(timestamp: number, showTime = false) {
  return new Intl.DateTimeFormat(
    'en-US',
    showTime
      ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' },
  ).format(new Date(timestamp * 1000))
}

export function calculateSimpleInterest(principal: bigint, aprBps: number, tenorDays: number) {
  return principal * BigInt(aprBps) * BigInt(tenorDays) / 365n / 10_000n
}

export function earlyWithdrawalFee(deposit: Deposit) {
  return deposit.principal * BigInt(deposit.penalty) / 10_000n
}

export function earlyWithdrawalPayout(deposit: Deposit) {
  return deposit.principal - earlyWithdrawalFee(deposit)
}

export function certificateStatus(deposit: Deposit) {
  if (deposit.status === 0) {
    if (deposit.renewalKind === 1) return 'Active · manual renewal'
    if (deposit.renewalKind === 2) return 'Active · auto renewal'
    return 'Active'
  }
  if (deposit.status === 1) {
    if (deposit.withdrawalKind === 1) return 'Withdrawn early'
    if (deposit.withdrawalKind === 2) return 'Withdrawn at maturity'
    return 'Withdrawn'
  }
  if (deposit.status === 2) return 'Renewed manually'
  if (deposit.status === 3) return 'Auto renewed'
  return 'Unknown'
}

export function certificateLineage(deposit: Deposit) {
  if (deposit.renewedFrom > 0) return `Created from Certificate #${deposit.renewedFrom}`
  if (deposit.renewedTo > 0) return `Created Certificate #${deposit.renewedTo}`
  return ''
}

export function matchesCertificateFilter(deposit: Deposit, filter: CertificateFilter) {
  if (filter === 'active') return deposit.status === 0
  if (filter === 'withdrawn') return deposit.status === 1
  if (filter === 'renewed') return deposit.status === 2 || deposit.status === 3
  return true
}
