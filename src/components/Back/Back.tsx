import styled from 'styled-components'
import {useHistory} from 'react-router-dom'
import {ArrowLeft} from 'react-feather'
import {TEXT} from '../../theme/theme'
import {Icon} from '../Icon/Icon'

const Container = styled.div<{margin?: string}>`
  display: flex;
  flex-direction: row;
  width: auto;
  cursor: pointer;
  margin-right: auto;
  margin-bottom: 0px;

  ${({theme}) => theme.mediaWidth.minSmall`
    margin-bottom: 16px; 
  `}}
`

type BackProps = {
  arrowSize: number
  textSize: number
  margin?: string
}
export const Back = ({arrowSize, textSize, margin}: BackProps) => {
  let history = useHistory()
  return (
    <>
      <Container onClick={() => history.goBack()}>
        <Icon size={arrowSize} clickable={true} margin={'auto 3px auto auto'}>
          <ArrowLeft size={arrowSize} />
        </Icon>
        <TEXT.AdjustableSize fontSize={textSize}>Back</TEXT.AdjustableSize>
      </Container>
    </>
  )
}
