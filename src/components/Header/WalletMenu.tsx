import {useState, useRef, useEffect} from 'react'
import styled from 'styled-components/macro'
import {FlexRow} from '../Container/Container'
import {TEXT, colors} from '../../theme/theme'
import ArbitrumLogo from '../../assets/images/arbitrum-logo.png'
import EthereumLogo from '../../assets/images/ethereum-logo.png'
import ArbitrumTestnetLogo from '../../assets/images/arbitrum-testnet-logo.png'
import {ChevronLeft, ChevronRight, Settings} from 'react-feather'
import HeaderHamburger from '../HeaderHamburger/HeaderHamburger'
import {LINKS} from '../../constants/links'
import {useBuildState} from '../../state/build/hooks'
import {useActiveWeb3React} from '../../hooks/web3'
import {SupportedChainId} from '../../constants/chains'
import {useSetSlippageModalToggle, useWalletModalToggle} from '../../state/application/hooks'

const PlatformLogo = styled.div<{src: string; open?: boolean}>`
  background: no-repeat center/contain url(${({src}) => src});
  background-size: contain;
  background-repeat: no-repeat;
  height: 17px;
  width: 17px;
  opacity: ${({open}) => (open ? '0' : '1')};
  transition: all 0.2s linear;
`

const RelativeContainer = styled.div`
  position: relative;
  display: none;

  ${({theme}) => theme.mediaWidth.minSmall`
    display: block;
  `};
`

const WalletMenuButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  gap: 8px;
  background: ${({theme}) => theme.dark.grey4};
  position: relative;
  outline: none;
  border: 0;
  cursor: pointer;
`

const MenuContent = styled.div<{open?: boolean}>`
  position: absolute;
  top: 0;
  right: 0;
  border-radius: 8px;
  background: ${({theme}) => theme.dark.grey4};
  overflow: hidden;
  transition: all 0.2s linear;
  padding-bottom: 16px;

  width: ${({open}) => (open ? '240px' : '0px')};
  max-height: ${({open}) => (open ? '500px' : '0px')};
  opacity: ${({open}) => (open ? '1' : '0')};
`

const MenuTitle = styled.div<{open?: boolean}>`
  opacity: ${({open}) => (open ? '1' : '0')};
  cursor: ${({open}) => (open ? 'pointer' : 'default')};
  font-family: Inter;
  font-style: normal;
  font-weight: 400;
  font-size: 14px;
  padding: 8px 8px 16px 8px;
  display: flex;
  align-items: center;
`

const MenuItem = styled.div<{background?: string; clickable?: boolean}>`
  padding: 8px 20px;
  cursor: ${({clickable}) => (clickable ? 'pointer' : '')};
  background: ${({background}) => background};

  :hover {
    background: ${({theme, clickable, background}) => (clickable ? theme.dark.grey3 : background)};
  }
`

const SlippageItem = styled.div`
  display: flex;
  padding: 8px 20px;
`
const SlippageContainer = styled.div`
  cursor: pointer;
  display: flex;
  padding: 8px;
  border-radius: 8px;
  gap: 8px;
  align-items: center;
  background: ${({theme}) => theme.dark.grey3};
`
const SubMenuContainer = styled.div`
  & > a > div {
    padding-left: 42px;
  }
`

const UnstyledAnchorTag = styled.a`
  color: unset;
  text-decoration: none;
`

const MenuLink = ({background, link, onClick, children}: {background?: string; link?: string; onClick?: Function; children: any}) => {
  if (link) {
    return (
      <UnstyledAnchorTag href={link} target="_blank">
        <MenuItem clickable>{children}</MenuItem>
      </UnstyledAnchorTag>
    )
  }

  return (
    <MenuItem onClick={event => (onClick ? onClick(event) : null)} clickable={onClick ? true : false} background={background}>
      {children}
    </MenuItem>
  )
}

const NETWORK_ICONS: {[chainId in SupportedChainId | number]: string} = {
  [SupportedChainId.MAINNET]: EthereumLogo,
  [SupportedChainId.ARBITRUM]: ArbitrumLogo,
  [SupportedChainId.ARBITRUM_GÖRLI]: ArbitrumTestnetLogo,
}

const NETWORK_LABELS: {[chainId in SupportedChainId | number]: JSX.Element} = {
  [SupportedChainId.MAINNET]: <TEXT.SmallBody>Ethereum Mainnet</TEXT.SmallBody>,
  [SupportedChainId.ARBITRUM]: <TEXT.SmallBody>Arbitrum One</TEXT.SmallBody>,
  [SupportedChainId.ARBITRUM_GÖRLI]: (
    <FlexRow>
      <TEXT.SmallBody>Arbitrum Goerli -</TEXT.SmallBody>
      <TEXT.SmallBody color={colors(false).dark.red}>Testnet</TEXT.SmallBody>
    </FlexRow>
  ),
}

export default function WalletMenu() {
  const {deactivate, account, chainId} = useActiveWeb3React()
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)
  const [isSubMenuOpen, setIsSubMenuOpen] = useState<boolean>(false)
  const {setSlippageValue} = useBuildState()
  const toggleWalletModal = useWalletModalToggle()
  const toggleSetSlippageModal = useSetSlippageModalToggle()

  const menuRef = useRef<HTMLDivElement>(null)

  const disconnectWallet = () => {
    deactivate()
    localStorage.setItem('disconnected', 'true')
    window.location.reload()
  }

  const showMenu = (val: boolean) => {
    setIsMenuOpen(val)
  }

  const addTokenToMM = async () => {
    const {ethereum} = window
    if (ethereum && ethereum.request) {
      let networkSwitched = false

      const chainId = '0xa4b1' // Arbitrum One chain ID
      const networkAdded = await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: 'Arbitrum One', // Arbitrum One network name
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://arb1.arbitrum.io/rpc'], // Arbitrum One RPC endpoint
            blockExplorerUrls: ['https://explorer.arbitrum.io/'], // Arbitrum One block explorer URL
          },
        ],
      })

      if (!networkAdded) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{chainId: '0xa4b1'}], // Arbitrum One chain ID
          })
          networkSwitched = true
        } catch (error) {
          if ((error as any).code === 4902) {
            console.error('User rejected network switch.')
          } else {
            console.error(error)
          }
        }

        if (networkSwitched) {
          try {
            await ethereum.request({
              method: 'wallet_watchAsset',
              params: {
                // params is expecting an array, even though the correct type is an object.
                // @ts-ignore
                type: 'ERC20',
                options: {
                  address: '0x4305C4Bc521B052F17d389c2Fe9d37caBeB70d54',
                  symbol: 'OVL',
                  decimals: 18,
                  image: 'https://raw.githubusercontent.com/overlay-market/overlay-interface/staging/public/overlay-logo-white.png',
                },
              },
            })
          } catch (error) {
            console.error(error)
          }
        }
      }
    }
  }

  useEffect(() => {
    const closeMenu = (event: MouseEvent | TouchEvent) => {
      // Check if the clicked element is outside the div
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && event.target !== document.getElementById('showButton')) {
        setIsMenuOpen(false)
        setIsSubMenuOpen(false)
      }
    }

    document.addEventListener('click', closeMenu)

    return () => {
      document.removeEventListener('click', closeMenu)
    }
  }, [])

  const supportedChainId: boolean = Boolean(chainId && SupportedChainId[chainId])

  return (
    <>
      <RelativeContainer>
        <div onClick={() => showMenu(true)}>
          <WalletMenuButton
            id="showButton"
            onClick={event => {
              event.stopPropagation()
              showMenu(true)
            }}
          >
            {account && chainId && supportedChainId ? (
              <PlatformLogo open={isMenuOpen} src={NETWORK_ICONS[chainId]} />
            ) : (
              supportedChainId && <PlatformLogo open={isMenuOpen} src={ArbitrumLogo} />
            )}
            <HeaderHamburger
              open={isMenuOpen}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation()
                setIsMenuOpen(!isMenuOpen)
                setIsSubMenuOpen(false)
              }}
            />
          </WalletMenuButton>
        </div>
        <MenuContent open={isMenuOpen} ref={menuRef}>
          <MenuTitle open={isSubMenuOpen} onClick={() => (isSubMenuOpen ? setIsSubMenuOpen(false) : null)}>
            <ChevronLeft size={16} />
            <TEXT.SmallBody ml="4px">Menu</TEXT.SmallBody>
          </MenuTitle>
          {isSubMenuOpen ? (
            <>
              <MenuItem background={colors(false).dark.grey5}>
                <TEXT.BoldSmallBody>Community</TEXT.BoldSmallBody>
              </MenuItem>
              <SubMenuContainer>
                <MenuLink link={LINKS.DISCORD}>
                  <TEXT.SmallBody>Discord</TEXT.SmallBody>
                </MenuLink>
                <MenuLink link={LINKS.TWITTER}>
                  <TEXT.SmallBody>Twitter</TEXT.SmallBody>
                </MenuLink>
                <MenuLink link={LINKS.TELEGRAM}>
                  <TEXT.SmallBody>Telegram</TEXT.SmallBody>
                </MenuLink>
                <MenuLink link={LINKS.MIRROR}>
                  <TEXT.SmallBody>Mirror</TEXT.SmallBody>
                </MenuLink>
              </SubMenuContainer>
            </>
          ) : (
            <>
              {account && chainId ? (
                <MenuLink background={colors(false).dark.grey5}>
                  <FlexRow style={{gap: '8px'}}>
                    <PlatformLogo open={false} src={NETWORK_ICONS[chainId]} />
                    <TEXT.SmallBody>{NETWORK_LABELS[chainId]}</TEXT.SmallBody>
                  </FlexRow>
                </MenuLink>
              ) : (
                <MenuLink
                  background={colors(false).dark.grey5}
                  onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                    event.stopPropagation()
                    toggleWalletModal()
                  }}
                >
                  <TEXT.BoldSmallBody style={{textDecoration: 'underline'}}>Connect Wallet</TEXT.BoldSmallBody>
                </MenuLink>
              )}
              <MenuLink link={LINKS.RISKS}>
                <TEXT.SmallBody>Risks of Overlay</TEXT.SmallBody>
              </MenuLink>
              <MenuLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
                  event.stopPropagation()
                  setIsSubMenuOpen(true)
                }}
              >
                <FlexRow justify="space-between">
                  <TEXT.SmallBody>Community</TEXT.SmallBody>
                  <ChevronRight size={16} />
                </FlexRow>
              </MenuLink>
              <MenuLink link={LINKS.GOVERNANCE}>
                <TEXT.SmallBody>Governance</TEXT.SmallBody>
              </MenuLink>
              <MenuLink onClick={addTokenToMM}>
                <TEXT.SmallBody color={colors(false).dark.tan2}>Add OVL to Wallet</TEXT.SmallBody>
              </MenuLink>

              <SlippageItem onClick={toggleSetSlippageModal}>
                <SlippageContainer>
                  <Settings size={16} />
                  <TEXT.SmallBody>Slippage</TEXT.SmallBody>

                  <TEXT.SmallBody marginLeft="8px">{setSlippageValue}%</TEXT.SmallBody>
                </SlippageContainer>
              </SlippageItem>
              {account && (
                <MenuLink onClick={disconnectWallet}>
                  <TEXT.SmallBody>Disconnect Wallet</TEXT.SmallBody>
                </MenuLink>
              )}
            </>
          )}
        </MenuContent>
      </RelativeContainer>
    </>
  )
}
