export type EthereumProvider = {
  request: (request: {
    method: string
    params?: unknown[] | object
  }) => Promise<unknown>
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export type Plan = {
  id: number
  tenor: number
  apr: number
  min: bigint
  max: bigint
  penalty: number
  enabled: boolean
}

export type Deposit = {
  id: number
  planId: number
  principal: bigint
  start: number
  maturity: number
  tenor: number
  apr: number
  penalty: number
  status: number
  interest: bigint
}

