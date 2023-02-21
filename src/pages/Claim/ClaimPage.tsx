import styled from 'styled-components'
import {FlexRow, FlexColumn} from '../../components/Container/Container'
import {TEXT} from '../../theme/theme'
interface ClaimDataProps {
  platform: string
  seatsAvailable: number
  claimLink: string
  logoSrc: string
  startDate: string
  endDate: string
}

const ClaimData: Array<ClaimDataProps> = [
  {
    platform: 'Beacon holders',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/1',
    endDate: '3/4',
  },
  {
    platform: 'Overlay users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/2',
    endDate: '3/5',
  },
  {
    platform: 'Gearbox users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/6',
    endDate: '3/7',
  },
  {
    platform: 'Sense Finance users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/7',
    endDate: '3/8',
  },
  {
    platform: 'NFTPerp users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/8',
    endDate: '3/9',
  },
  {
    platform: 'Ambire Wallet users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/9',
    endDate: '3/10',
  },
  {
    platform: 'Element Finance users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/13',
    endDate: '3/14',
  },
  {
    platform: 'GMX users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/14',
    endDate: '3/15',
  },
  {
    platform: 'coW Swap users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/15',
    endDate: '3/16',
  },
  {
    platform: 'Arbitrum users',
    seatsAvailable: 222,
    claimLink: '',
    logoSrc: '',
    startDate: '3/16',
    endDate: '3/17',
  },
]

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  max-width: 1200px;
  justify-content: center;
  gap: 15px;
`

const InterfaceContainer = styled.a`
  display: flex;
  flex-direction: column;
  border: 1px solid #71ceff;
  border-radius: 8px;
  box-shadow: 0 0 12px #5b60a4;
  padding: 12px;
  margin: 16px 0 24px;
  background: #1b2131;
  width: 300px;
  text-decoration: none;
`

const ClaimPage = () => {
  return (
    <Container>
      {ClaimData.map((claim, index) => (
        <InterfaceContainer href={claim.claimLink} target="_blank" rel="noopener noreferrer">
          <TEXT.Supplemental>Claim OVL for {claim.platform}</TEXT.Supplemental>
          <TEXT.Supplemental>{claim.seatsAvailable} seats available</TEXT.Supplemental>
          <TEXT.BoldSupplemental textAlign="center">
            Open {claim.startDate} - {claim.endDate}
          </TEXT.BoldSupplemental>
        </InterfaceContainer>
      ))}
    </Container>
  )
}

export default ClaimPage