import type { InterfaceAbi } from 'ethers'
import mockUsdcArtifact from './MockUSDC.json'
import savingCoreArtifact from './SavingCore.json'
import vaultManagerArtifact from './VaultManager.json'

type ContractArtifact = { abi: InterfaceAbi }

export const mockUsdcAbi = (mockUsdcArtifact as ContractArtifact).abi
export const savingCoreAbi = (savingCoreArtifact as ContractArtifact).abi
export const vaultManagerAbi = (vaultManagerArtifact as ContractArtifact).abi

