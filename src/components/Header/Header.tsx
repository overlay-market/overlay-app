import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Image } from 'rebass';
import styled from 'styled-components/macro';
import { useActiveWeb3React } from '../../hooks/web3';
import { useDarkModeManager } from '../../state/user/hooks';
import { useETHBalances } from '../../state/wallet/hooks';
import { Row } from '../Row/Row';
import { Trans } from '@lingui/macro';
import Burger from '../Hamburger/Hamburger';
import SlideMenu from '../SlideMenu/SlideMenu';
import More from '../More/More';
import Web3Status from '../Web3Status/Web3Status';
import OverlayLogo from '../../assets/images/overlay-logo.png';
import LightOverlayLogo from '../../assets/images/overlay-logo-light.png';

export const HeaderContainer = styled.div`
  background-color: ${({theme}) => theme.bg1};
  color: ${({theme}) => theme.text1};
  display: flex;
  flex-direction: row;
  width: 100%;
  max-width: 900px;
  margin: auto;
  padding-top: 30px;
`

export const LogoContainer = styled.div`
  height: 32px;
  width: 32px;
  margin: auto 16px auto 0px;
`

export const AccountContainer = styled(Row)`
  width: auto;
  margin-left: auto;
`;

const activeClassName = 'ACTIVE'

export const StyledLink = styled(NavLink).attrs({
  activeClassName,
})`
  color: ${({theme}) => theme.text1};
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  margin: auto 16px;
  display: none;

  &.${activeClassName} {
    color: ${({theme}) => theme.text4};
  }

  ${({ theme }) => theme.mediaWidth.minSmall`
    display: flex;
  `};
`

export default function Header() {
  const [darkMode, toggleDarkMode] = useDarkModeManager();
  const [open, setOpen] = useState(false);
  const menuId = "main-menu";

  return (
    <HeaderContainer>
      <LogoContainer>
        {darkMode ? (
          <Image 
            src={LightOverlayLogo} 
            alt={'Overlay Logo Light'} 
            height={'100%'}
            width={'100%'}
            minHeight={'32px'}
            minWidth={'32px'}
            />
          ) : (
          <Image 
            src={OverlayLogo} 
            alt={'Overlay Logo'} 
            height={'100%'}
            width={'100%'}
            minHeight={'32px'}
            minWidth={'32px'}
            />
          )}
      </LogoContainer>

      <StyledLink to={'/markets'}>
        <Trans>
          Markets
        </Trans>
      </StyledLink>

      <StyledLink to={'/positions'}>
        <Trans>
          Positions
        </Trans>
      </StyledLink>

      <StyledLink to={'/magic'}>
        <Trans>
          Magic
        </Trans>
      </StyledLink>

      <AccountContainer>
         <Web3Status/>
         <More/>
         <Burger open={open} setOpen={setOpen} aria-controls={menuId} />
         <SlideMenu open={open} />
      </AccountContainer>

    </HeaderContainer>
  );
};

