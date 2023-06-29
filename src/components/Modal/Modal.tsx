import React from 'react'
import styled, {css} from 'styled-components/macro'
import {DialogOverlay, DialogContent} from '@reach/dialog'
import {animated, useTransition, useSpring} from 'react-spring'
import {isMobile} from 'react-device-detect'
import {useGesture} from 'react-use-gesture'
import {transparentize} from 'polished'

const AnimatedDialogOverlay = animated(DialogOverlay)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StyledDialogOverlay = styled(AnimatedDialogOverlay)`
  &[data-reach-dialog-overlay] {
    z-index: 420;
    background-color: transparent;
    overflow: hidden;

    display: flex;
    align-items: center;
    justify-content: center;

    background-color: rgba(0, 0, 0, 0.424);
    backdrop-filter: blur(7px);
  }
`

const AnimatedDialogContent = animated(DialogContent)
// destructure to not pass custom props to Dialog DOM element
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const StyledDialogContent = styled(({minHeight, maxHeight, mobile, isOpen, width, borderColor, boxShadow, ...rest}) => (
  <AnimatedDialogContent {...rest} />
)).attrs({
  'aria-label': 'dialog',
})`
  overflow-y: auto;

  &[data-reach-dialog-content] {
    margin: auto;
    background-color: ${({theme}) => theme.dark.black};
    border: 1px solid ${({borderColor}) => borderColor ?? '#12b4ff'};
    box-shadow: 0 4px 8px 0 ${({theme}) => transparentize(0.95, theme.dark.background)};
    box-shadow: ${({boxShadow, theme}) => boxShadow ?? `0 4px 8px 0 ${transparentize(0.95, theme.dark.background)}`};
    padding: 0px;
    width: 85vw;
    overflow-y: auto;
    overflow-x: hidden;

    align-self: ${({mobile}) => (mobile ? 'flex-end' : 'center')};

    max-width: ${({width}) => (width ? width : '420px')};

    ${({maxHeight}) =>
      maxHeight &&
      css`
        max-height: ${maxHeight}vh;
      `}
    ${({minHeight}) =>
      minHeight &&
      css`
        min-height: ${minHeight}vh;
      `}
    display: flex;
    border-radius: 20px;
    ${({theme}) => theme.mediaWidth.minExtraSmall`
      width: 65vw;
      margin: 0;
    `}
    ${({theme, mobile}) => theme.mediaWidth.minMedium`
      width:  50vw;
      ${
        mobile &&
        css`
          width: 100vw;
          border-radius: 20px;
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        `
      }
    `}
  }
`

interface ModalProps {
  isOpen: boolean
  onDismiss: () => void
  minHeight?: number | false
  maxHeight?: number
  width?: string
  borderColor?: string
  boxShadow?: string
  initialFocusRef?: React.RefObject<any>
  children?: React.ReactNode
}

export default function Modal({
  isOpen,
  onDismiss,
  width,
  minHeight = false,
  maxHeight = 90,
  borderColor,
  boxShadow,
  initialFocusRef,
  children,
}: ModalProps) {
  const fadeTransition = useTransition(isOpen, null, {
    config: {duration: 200},
    from: {opacity: 0},
    enter: {opacity: 1},
    leave: {opacity: 0},
  })

  const [{y}, set] = useSpring(() => ({y: 0, config: {mass: 1, tension: 210, friction: 20}}))
  const bind = useGesture({
    onDrag: state => {
      set({
        y: state.down ? state.movement[1] : 0,
      })
      if (state.movement[1] > 300 || (state.velocity > 3 && state.direction[1] > 0)) {
        onDismiss()
      }
    },
  })

  return (
    <>
      {fadeTransition.map(
        ({item, key, props}) =>
          item && (
            <StyledDialogOverlay
              key={key}
              style={props}
              onDismiss={onDismiss}
              initialFocusRef={initialFocusRef}
              unstable_lockFocusAcrossFrames={false}
            >
              <StyledDialogContent
                {...(isMobile
                  ? {
                      ...bind(),
                      style: {transform: y.interpolate(y => `translateY(${(y as number) > 0 ? y : 0}px)`)},
                    }
                  : {})}
                aria-label="dialog content"
                minHeight={minHeight}
                maxHeight={maxHeight}
                mobile={isMobile}
                width={width}
                borderColor={borderColor}
                boxShadow={boxShadow}
              >
                {/* prevents the automatic focusing of inputs on mobile by the reach dialog */}
                {!initialFocusRef && isMobile ? <div tabIndex={1} /> : null}
                {children}
              </StyledDialogContent>
            </StyledDialogOverlay>
          ),
      )}
    </>
  )
}
