import {SupportedChainId} from './chains'
import {ChainId} from '@sushiswap/sdk'

export type AddressMap = {[chainId: number]: string}

// v1-core contract addresses
export const V1_PERIPHERY_ADDRESS: AddressMap = {
  [ChainId.MAINNET]: '0x477122219aa1F76E190f480a85af97DE0A643320',
  [ChainId.KOVAN]: '0x06C76062730aD18aBdc3C9198b3EB283f7bb3627',
  [ChainId.RINKEBY]: '0x11495884878A38709959e1102Ba0e559BE826F4e',
  [ChainId.GÖRLI]: '0x9d2fbD680e2873A99dFc1dB876e933c7CE05Cf12',
  [SupportedChainId.ARBITRUM]: '0xC3cB99652111e7828f38544E3e94c714D8F9a51a',
  [SupportedChainId.ARBITRUM_GÖRLI]: '0x68eb0F1Fbbb35b98526F53c01B18507f95F02119',
}

export const OVL_TOKEN_ADDRESS: AddressMap = {
  [ChainId.MAINNET]: '0xdc77acc82cce1cc095cba197474cc06824ade6f7',
  [ChainId.KOVAN]: '0x04020e4ff78b629d79ccbd163fc6044af73588dc',
  [ChainId.RINKEBY]: '0x82913654067F94b72AEFB10dBC69Ff4Db3F16176',
  [ChainId.GÖRLI]: '0xdBD4a09ac1962F028390C53F4a4d126F5E13baEe',
  [ChainId.ARBITRUM]: '0x4305C4Bc521B052F17d389c2Fe9d37caBeB70d54',
  [SupportedChainId.ARBITRUM_GÖRLI]: '0x1023b1BC47b9b449eAD9329EE0eFD4fDAcA3D767',
}

//@dev: remove LL Token addresses after bridge testing
export const LL_TOKEN_ADDRESS: AddressMap = {
  [ChainId.MAINNET]: '0xc3fA4890C42066F12d0A1cc44093C1Bf7E5aBB64',
  [ChainId.ARBITRUM]: '0x4D95e223e9C8bD4b06D50fB9A1586e1f227f9765',
}

export const MERKLE_DISTRIBUTOR_ADDRESS: AddressMap = {
  [SupportedChainId.ARBITRUM_GÖRLI]: '0xAEA8CA6e3854E39373C67879aE654bC117c9931D',
}

export const MULTICALL2_ADDRESS: AddressMap = {
  [ChainId.MAINNET]: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
  [ChainId.ROPSTEN]: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
  [ChainId.RINKEBY]: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
  [ChainId.GÖRLI]: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
  [ChainId.KOVAN]: '0x5BA1e12693Dc8F9c48aAD8770482f4739bEeD696',
  [ChainId.ARBITRUM]: '0x842eC2c7D803033Edf55E478F461FC547Bc54EB2',
  [ChainId.ARBITRUM_TESTNET]: '0xa501c031958F579dB7676fF1CE78AD305794d579',
  [SupportedChainId.ARBITRUM_GÖRLI]: '0x108B25170319f38DbED14cA9716C54E5D1FF4623',
  [ChainId.FANTOM]: '0x22D4cF72C45F8198CfbF4B568dBdB5A85e8DC0B5',
  [ChainId.FANTOM_TESTNET]: '',
  [ChainId.MATIC]: '0x02817C1e3543c2d908a590F5dB6bc97f933dB4BD',
  [ChainId.MATIC_TESTNET]: '',
  [ChainId.XDAI]: '0x67dA5f2FfaDDfF067AB9d5F025F8810634d84287',
  [ChainId.BSC]: '0xa9193376D09C7f31283C54e56D013fCF370Cd9D9',
  [ChainId.BSC_TESTNET]: '',
  [ChainId.MOONBEAM_TESTNET]: '',
  [ChainId.AVALANCHE]: '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3',
  [ChainId.AVALANCHE_TESTNET]: '',
  [ChainId.HECO]: '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3',
  [ChainId.HECO_TESTNET]: '',
  [ChainId.HARMONY]: '0xdDCbf776dF3dE60163066A5ddDF2277cB445E0F3',
  [ChainId.HARMONY_TESTNET]: '',
  [ChainId.OKEX]: '0xF4d73326C13a4Fc5FD7A064217e12780e9Bd62c3',
  [ChainId.OKEX_TESTNET]: '',
}
