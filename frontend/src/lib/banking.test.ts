import { describe, expect, it } from 'vitest'
import type { Deposit } from '../contracts/types'
import {
  calculateSimpleInterest,
  certificateLineage,
  certificateStatus,
  earlyWithdrawalFee,
  earlyWithdrawalPayout,
  matchesCertificateFilter,
} from './banking'

const deposit = (overrides: Partial<Deposit> = {}): Deposit => ({
  id: 1, planId: 1, principal: 500_000_000n, start: 1, maturity: 2,
  tenor: 180, apr: 300, penalty: 350, status: 0, interest: 7_397_260n,
  renewedFrom: 0, renewedTo: 0, renewalKind: 0, withdrawalKind: 0,
  ...overrides,
})

describe('banking calculations', () => {
  it('calculates simple interest with integer rounding down', () => {
    expect(calculateSimpleInterest(500_000_000n, 300, 180)).toBe(7_397_260n)
  })

  it('calculates the early withdrawal fee and payout', () => {
    const item = deposit()
    expect(earlyWithdrawalFee(item)).toBe(17_500_000n)
    expect(earlyWithdrawalPayout(item)).toBe(482_500_000n)
  })
})

describe('certificate presentation', () => {
  it('shows detailed lifecycle statuses', () => {
    expect(certificateStatus(deposit({ status: 1, withdrawalKind: 1 }))).toBe('Withdrawn early')
    expect(certificateStatus(deposit({ status: 3 }))).toBe('Auto renewed')
    expect(certificateStatus(deposit({ renewalKind: 2 }))).toBe('Active · auto renewal')
  })

  it('shows renewal lineage', () => {
    expect(certificateLineage(deposit({ renewedFrom: 4 }))).toBe('Created from Certificate #4')
    expect(certificateLineage(deposit({ renewedTo: 8 }))).toBe('Created Certificate #8')
  })

  it('filters certificates by lifecycle group', () => {
    expect(matchesCertificateFilter(deposit(), 'active')).toBe(true)
    expect(matchesCertificateFilter(deposit({ status: 1 }), 'withdrawn')).toBe(true)
    expect(matchesCertificateFilter(deposit({ status: 2 }), 'renewed')).toBe(true)
    expect(matchesCertificateFilter(deposit({ status: 3 }), 'renewed')).toBe(true)
    expect(matchesCertificateFilter(deposit({ status: 1 }), 'active')).toBe(false)
  })
})
