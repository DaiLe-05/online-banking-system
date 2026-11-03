export type AutoRenewCandidate = {
  status: bigint
  maturityAt: bigint
}

export function deploymentFileForChain(chainId: number) {
  if (chainId === 31337) return 'deployments/localhost.json'
  if (chainId === 11155111) return 'deployments/sepolia.json'
  return `deployments/chain-${chainId}.json`
}

export function isAutoRenewEligible(candidate: AutoRenewCandidate, now: bigint, gracePeriod: bigint) {
  const ACTIVE_STATUS = 0n
  return candidate.status === ACTIVE_STATUS && now >= candidate.maturityAt + gracePeriod
}
