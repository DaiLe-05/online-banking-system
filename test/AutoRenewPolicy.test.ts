import { expect } from 'chai'
import { deploymentFileForChain, isAutoRenewEligible } from '../scripts/auto-renew-policy.js'

describe('Auto-renew watcher policy', function () {
  it('waits until the grace period has ended', function () {
    const candidate = { status: 0n, maturityAt: 1_000n }
    expect(isAutoRenewEligible(candidate, 1_179n, 180n)).to.equal(false)
    expect(isAutoRenewEligible(candidate, 1_180n, 180n)).to.equal(true)
  })

  it('never renews a completed certificate', function () {
    expect(isAutoRenewEligible({ status: 1n, maturityAt: 1_000n }, 2_000n, 180n)).to.equal(false)
    expect(isAutoRenewEligible({ status: 3n, maturityAt: 1_000n }, 2_000n, 180n)).to.equal(false)
  })

  it('selects the correct deployment file', function () {
    expect(deploymentFileForChain(31337)).to.equal('deployments/localhost.json')
    expect(deploymentFileForChain(11155111)).to.equal('deployments/sepolia.json')
    expect(deploymentFileForChain(10)).to.equal('deployments/chain-10.json')
  })
})
