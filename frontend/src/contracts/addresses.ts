export const LOCAL_CHAIN_ID = 31337
export const LOCAL_RPC_URL = 'http://127.0.0.1:8545'

export const CONTRACT_ADDRESSES = {
  token:
    import.meta.env.VITE_MOCK_USDC_ADDRESS ||
    '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  vault:
    import.meta.env.VITE_VAULT_MANAGER_ADDRESS ||
    '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  core:
    import.meta.env.VITE_SAVING_CORE_ADDRESS ||
    '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
} as const

export const ADMIN_ADDRESS = (
  import.meta.env.VITE_ADMIN_ADDRESS ||
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
).toLowerCase()

