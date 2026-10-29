export const LOCAL_CHAIN_ID = 31337
export const SEPOLIA_CHAIN_ID = 11155111
export const LOCAL_RPC_URL = 'http://127.0.0.1:8545'
export const SEPOLIA_RPC_URL = 'https://rpc.sepolia.org'

export type ContractAddresses = {
  token: string
  vault: string
  core: string
}

export type ChainConfig = {
  chainId: number
  hexChainId: `0x${string}`
  name: string
  shortName: string
  rpcUrl: string
  explorerUrl?: string
  admin: string
  contracts: ContractAddresses
}

const localContracts: ContractAddresses = {
  token:
    import.meta.env.VITE_LOCAL_MOCK_USDC_ADDRESS ||
    import.meta.env.VITE_MOCK_USDC_ADDRESS ||
    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  vault:
    import.meta.env.VITE_LOCAL_VAULT_MANAGER_ADDRESS ||
    import.meta.env.VITE_VAULT_MANAGER_ADDRESS ||
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  core:
    import.meta.env.VITE_LOCAL_SAVING_CORE_ADDRESS ||
    import.meta.env.VITE_SAVING_CORE_ADDRESS ||
    '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
}

const sepoliaContracts: ContractAddresses = {
  token: import.meta.env.VITE_SEPOLIA_MOCK_USDC_ADDRESS || '',
  vault: import.meta.env.VITE_SEPOLIA_VAULT_MANAGER_ADDRESS || '',
  core: import.meta.env.VITE_SEPOLIA_SAVING_CORE_ADDRESS || '',
}

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [LOCAL_CHAIN_ID]: {
    chainId: LOCAL_CHAIN_ID,
    hexChainId: '0x7a69',
    name: 'Hardhat Local',
    shortName: 'Localhost',
    rpcUrl: LOCAL_RPC_URL,
    admin: (
      import.meta.env.VITE_LOCAL_ADMIN_ADDRESS ||
      import.meta.env.VITE_ADMIN_ADDRESS ||
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
    ).toLowerCase(),
    contracts: localContracts,
  },
  [SEPOLIA_CHAIN_ID]: {
    chainId: SEPOLIA_CHAIN_ID,
    hexChainId: '0xaa36a7',
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    rpcUrl: SEPOLIA_RPC_URL,
    explorerUrl: 'https://sepolia.etherscan.io',
    admin: (import.meta.env.VITE_SEPOLIA_ADMIN_ADDRESS || '').toLowerCase(),
    contracts: sepoliaContracts,
  },
}

export function getChainConfig(chainId: number) {
  return CHAIN_CONFIGS[chainId]
}

export function isConfigured(config?: ChainConfig) {
  return Boolean(
    config?.admin &&
      config.contracts.token &&
      config.contracts.vault &&
      config.contracts.core,
  )
}

