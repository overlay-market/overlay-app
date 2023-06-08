import {useState, useEffect} from 'react'
import {NavLink, useLocation} from 'react-router-dom'
import styled from 'styled-components/macro'
import {IconButton} from '@material-ui/core'
import {Trans} from '@lingui/macro'
import {Image} from 'rebass'
import {useDarkModeManager} from '../../state/user/hooks'
import {FlexRow} from '../Container/Container'
import {enableLock, disableLock} from '../../utils/scrollLock'
import {TEXT, colors} from '../../theme/theme'
import More from '../More/More'
import Burger from '../Hamburger/Hamburger'
import SlideMenu from '../SlideMenu/SlideMenu'
import Web3Status from '../Web3Status/Web3Status'
import OverlayLogoOnlyDark from '../../assets/images/overlay-logo-only-no-background.png'
import {ChevronDown} from 'react-feather'

export const HeaderContainer = styled.div`
  color: ${({theme}) => theme.dark.white};
  display: flex;
  flex-direction: row;
  width: auto;
  max-width: 1200px;
  margin: auto;
  padding: 24px 16px 24px;
  position: sticky;
  z-index: 420;

  ${({theme}) => theme.mediaWidth.minSmall`
    width: auto;
    padding: 24px 16px;
  `};
`

export const LogoContainer = styled.div`
  height: 30px;
  width: 30px;
  margin: auto 16px auto 0px;
  cursor: pointer;
`

export const AccountContainer = styled(FlexRow)`
  width: auto;
  margin-left: auto;
`

const activeClassName = 'ACTIVE'

export const StyledLink = styled(NavLink).attrs({
  activeClassName,
})`
  color: ${({theme}) => theme.dark.white};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  margin: auto 16px;
  display: none;

  &.${activeClassName} {
    color: ${({theme}) => theme.dark.blue2};
  }

  ${({theme}) => theme.mediaWidth.minSmall`
    display: flex;
  `};
`

const PowerCardLink = styled(StyledLink)`
  background: linear-gradient(89.2deg, #d5b4ff -1.18%, #ffa2b9 26.07%, #ff648a 47.56%, #ffcc8f 64.85%, #d5b4ff 99.44%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
`

const Dropdown = styled.div<{active: boolean}>`
  display: flex;
  flex-direction: column;
  position: relative;
  text-decoration: none;
  margin: auto 16px;
  padding: 8px;
  cursor: pointer;
  background: ${({theme}) => theme.dark.grey4};
  color: ${({theme, active}) => (active ? theme.dark.blue2 : theme.dark.purple2)};
  border-radius: 8px;
  width: 59px;
  transition: width 0.3s ease-in-out, border-radius 0.3s ease-in-out;

  .dropdown-list {
    padding: 0;
    border-radius: 8px;
    width: 59px;
    height: 0px;

    a {
      display: none;
    }
  }

  .chevron {
    transform: rotate(0deg);
  }

  &:hover {
    border-radius: 8px 8px 0 0;
    width: 110px;

    .chevron {
      transform: rotate(180deg);
    }

    .dropdown-list {
      padding: 8px 8px 16px 8px;
      border-radius: 0 0 8px 8px;
      width: 110px;
      height: 83px;

      a {
        display: flex;
      }
    }
  }
`

const DropdownContent = styled.div`
  display: flex;
  gap: 4px;
`

const DropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${({theme}) => theme.dark.grey4};
  overflow: hidden;
  transition: width 0.3s ease-in-out, height 0.2s ease-in-out, border-radius 0.3s ease-in-out;
`

const DropdownItem = styled(StyledLink)`
  margin: 0;
`

export const RotatingChevron = styled(ChevronDown)`
  transition: transform ease-out 0.25s;
`

export default function Header() {
  const [darkMode] = useDarkModeManager()
  const [open, setOpen] = useState(false)
  const menuId = 'main-menu'

  let location = useLocation().pathname

  // close menu when at new route
  useEffect(() => {
    if (open) {
      setOpen(open => false)
    }

    // Disabling eslint warning as passing open as a dependency will prevent the menu from opening
    // eslint-disable-next-line
  }, [location])

  // disable scroll when mobile menu open
  useEffect(() => {
    if (open) {
      enableLock()
    } else {
      disableLock()
    }
  }, [open])

  return (
    <HeaderContainer>
      <LogoContainer>
        <IconButton href="https://overlay.market" target="_blank" style={{padding: 0}}>
          {darkMode ? (
            <Image src={OverlayLogoOnlyDark} alt={'Overlay Logo Light'} height={'100%'} width={'100%'} minHeight={'30px'} minWidth={'30px'} />
          ) : (
            <Image src={OverlayLogoOnlyDark} alt={'Overlay Logo'} height={'100%'} width={'100%'} minHeight={'30px'} minWidth={'30px'} />
          )}
        </IconButton>
      </LogoContainer>
      <StyledLink to={'/markets'}>
        <Trans>
          <TEXT.Menu>Markets</TEXT.Menu>
        </Trans>
      </StyledLink>
      <StyledLink to={'/positions'}>
        <Trans>
          <TEXT.Menu>Positions</TEXT.Menu>
        </Trans>
      </StyledLink>
      <StyledLink to={'/bridge'}>
        <Trans>
          <TEXT.Menu>Bridge</TEXT.Menu>
        </Trans>
      </StyledLink>

      <PowerCardLink to={'/powercards'}>
        <Trans>
          <TEXT.Menu>Power Cards</TEXT.Menu>
        </Trans>
      </PowerCardLink>

      <Dropdown active={location === '/stake' || location === '/leaderboard' || location === '/referrals'}>
        <DropdownContent>
          <TEXT.Menu>Earn</TEXT.Menu>
          <RotatingChevron className="chevron" height={17} width={17} />
        </DropdownContent>

        <DropdownList className="dropdown-list">
          <DropdownItem to={'/stake'}>
            <Trans>
              <TEXT.Menu>Stake</TEXT.Menu>
            </Trans>
          </DropdownItem>
          <DropdownItem to={'/leaderboard'}>
            <Trans>
              <TEXT.Menu>Leaderboard</TEXT.Menu>
            </Trans>
          </DropdownItem>
          <DropdownItem to={'/referrals'}>
            <Trans>
              <TEXT.Menu>Referrals</TEXT.Menu>
            </Trans>
          </DropdownItem>
        </DropdownList>
      </Dropdown>
      {/* <StyledLink to={'/bridge'}>
        <Trans>
          <TEXT.Menu>Earn</TEXT.Menu>
        </Trans>
      </StyledLink> */}

      {/* <StyledLink to={'/claimpage'}>
        <Trans>
          <TEXT.Menu>Claim</TEXT.Menu>
        </Trans>
      </StyledLink> */}
      <AccountContainer>
        <TEXT.Menu color={colors(false).dark.tan2} marginRight={40}>
          Buy OVL
        </TEXT.Menu>
        <Web3Status />
        <More />
        <Burger open={open} setOpen={setOpen} aria-controls={menuId} />
      </AccountContainer>
      <SlideMenu open={open} setOpen={setOpen} />
    </HeaderContainer>
  )
}
