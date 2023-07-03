import {useState, useCallback, useMemo, useEffect} from 'react'
import styled from 'styled-components'
import {utils, BigNumberish, ethers, BigNumber} from 'ethers'
import {Label} from '@rebass/forms'
import {Sliders, X} from 'react-feather'
import {MarketCard} from '../../components/Card/MarketCard'
import {SelectActionButton, TriggerActionButton, TransparentUnderlineButton, ApproveTransactionButton} from '../../components/Button/Button'
import {TEXT} from '../../theme/theme'
import {OVL} from '../../constants/tokens'
import {Icon} from '../../components/Icon/Icon'
import {useActiveWeb3React} from '../../hooks/web3'
import {useBuildState} from '../../state/build/hooks'
import {useDerivedBuildInfo} from '../../state/build/hooks'
import {DefaultTxnSettings} from '../../state/build/actions'
import {useBuildActionHandlers} from '../../state/build/hooks'
import {NumericalInput} from '../../components/NumericalInput/NumericalInput'
import {FlexColumn, FlexRow} from '../../components/Container/Container'
import {
  formatWeiToParsedNumber,
  formatFundingRateToDaily,
  formatBigNumberUsingDecimalsToString,
  formatBigNumberUsingDecimalsToNumber,
} from '../../utils/formatWei'
import {ApprovalState, useApproveCallback} from '../../hooks/useApproveCallback'
import {LeverageSlider} from '../../components/LeverageSlider/LeverageSlider'
import {TransactionSettingsModal} from './TransactionSettingsModal'
import {formatDecimalToPercentage} from '../../utils/formatDecimal'
import {useIsTxnSettingsAuto} from '../../state/build/hooks'
import {useEstimatedBuild} from '../../hooks/useEstimatedBuild'
import {useBuildCallback} from '../../hooks/useBuildCallback'
import {AdditionalDetails} from './AdditionalBuildDetails'
import ConfirmTxnModal from '../../components/ConfirmTxnModal/ConfirmTxnModal'
import {useMarketData} from '../../state/markets/hooks'
import {useSingleCallResult} from '../../state/multicall/hooks'
import {useToken} from '../../hooks/useToken'
import {useV1PeripheryContract} from '../../hooks/useContract'
import {useOvlBalance} from '../../state/wallet/hooks'
import {useMarketOi} from '../../hooks/useMarketOis'
import {useMarketCapOi} from '../../hooks/useMarketCapOi'
import {useEstimatedBuildOi} from '../../hooks/useEstimatedBuildOi'
import {useEstimatedBuildLiquidationPrice} from '../../hooks/useEstimatedBuildLiquidationPrice'
import {useMarketName} from '../../hooks/useMarketName'
import {useFractionOfCapOi} from '../../hooks/useFractionOfCapOi'
import {useBid} from '../../hooks/useBid'
import {useAsk} from '../../hooks/useAsk'
import {marketNameFromDescription} from '../../constants/markets'
import Loader from '../../components/Loaders/Loaders'
import {MainDetails} from './MainBuildDetails'

const SelectPositionSideButton = styled(SelectActionButton)`
  border: 1px solid #f2f2f2;
  margin: 4px 0;
`
const SelectLongPositionButton = styled(SelectPositionSideButton)`
  color: ${({active}) => (active ? '#0B0F1C' : '#10DCB1')};
  background: ${({active}) => (active ? '#10DCB1' : 'transparent')};
  border: ${({active}) => active && '1px solid #10DCB1'};
`

const SelectShortPositionButton = styled(SelectPositionSideButton)`
  color: ${({active}) => (active ? '#0B0F1C' : '#FF648A')};
  background: ${({active}) => (active ? '#FF648A' : 'transparent')};
  border: ${({active}) => active && '1px solid #FF648A'};
`

const TriggerBuildButton = styled(TriggerActionButton)`
  border: 1px solid #f2f2f2;
`

const ControlInterfaceContainer = styled(FlexColumn)`
  padding: 16px;
`

const ControlInterfaceHeadContainer = styled(FlexColumn)`
  padding: 16px 0 24px;
`

export const NumericalInputContainer = styled(FlexRow)`
  border: 1px solid ${({theme}) => theme.dark.white};
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0px;
`

export const NumericalInputDescriptor = styled.div`
  background: transparent;
  font-size: 16px;
  color: #f2f2f2;
  padding: 8px;
`

export const NumericalInputLabel = styled(Label)`
  margin-top: 24px !important;
`

export const NumericalInputTitle = styled(TEXT.StandardBody)`
  margin-bottom: 4px !important;
`

export const NumericalInputBottomText = styled(TEXT.Supplemental)`
  margin: 4px 0 24px auto !important;
`

export const MINIMUM_SLIPPAGE_VALUE = 0.05

// @TO-DO: Break down BuildInterface into sub-components
// separate out data fetching logic from view components

// BuildInterface component to handle user input
// & callbacks for approve/build, data from periphery contract
// to be moved to respective sub-components to keep clean
export const BuildInterface = ({marketId}: {marketId: string}) => {
  const [isTxnSettingsOpen, setTxnSettingsOpen] = useState<boolean>(false)
  const [showBalanceNotEnoughWarning, setShowBalanceNotEnoughWarning] = useState<boolean>(false)
  const [{showConfirm, attemptingTransaction, transactionErrorMessage, transactionHash}, setBuildState] = useState<{
    showConfirm: boolean
    attemptingTransaction: boolean
    transactionErrorMessage: string | undefined
    transactionHash: string | undefined
  }>({
    showConfirm: false,
    attemptingTransaction: false,
    transactionErrorMessage: undefined,
    transactionHash: undefined,
  })

  const {market, isLoading, refetch} = useMarketData(marketId)

  // force refetch when refreshing page
  useEffect(() => {
    refetch()
  }, [marketId, isLoading, refetch])

  // const market = marketData?.market
  const {chainId} = useActiveWeb3React()
  const ovlBalance = useOvlBalance()
  const parsedOvlBalance = ovlBalance && ovlBalance.toFixed(8)

  const isTxnSettingsAuto = useIsTxnSettingsAuto()
  const ovl = chainId ? OVL[chainId] : undefined

  // @TO-DO: pull market name from feed
  const {decimals, description, baseToken, quoteToken, baseTokenAddress, quoteTokenAddress} = useMarketName(market?.feedAddress)

  const marketName = useMemo(() => {
    if (description) return marketNameFromDescription(description, market?.id)
    if (baseToken === 'loading' && quoteToken === 'loading') return <Loader stroke="white" size="12px" />
    return `${baseToken}/${quoteToken}`
  }, [description, baseToken, quoteToken, market])

  const baseTokenInfo = useToken(baseTokenAddress)
  const quoteTokenInfo = useToken(quoteTokenAddress)

  const baseTokenDecimals = useMemo(() => {
    if (!baseTokenInfo) return undefined
    return baseTokenInfo.decimals
  }, [baseTokenInfo])

  const quoteTokenDecimals = useMemo(() => {
    if (quoteTokenInfo === undefined || !quoteTokenInfo) return undefined
    return quoteTokenInfo.decimals
  }, [quoteTokenInfo])

  const marketTokensDecimalsDifference = useMemo(() => {
    if (!baseTokenDecimals && typeof baseTokenDecimals !== 'number') return undefined
    if (!quoteTokenDecimals && typeof quoteTokenDecimals !== 'number') return undefined
    const difference = baseTokenDecimals - quoteTokenDecimals
    return difference
  }, [baseTokenDecimals, quoteTokenDecimals])

  const sigFigConstant = 4

  // @TO-DO: pull market attributes
  const capLeverage = market ? formatWeiToParsedNumber(market.capLeverage, 18, 2) : undefined
  const minCollateral = market ? formatWeiToParsedNumber(market.minCollateral, 18, 10) : undefined

  const ois = useMarketOi(marketId, baseTokenDecimals, quoteTokenDecimals)
  const rawOiLong = ois && ois[0] ? ois[0] : undefined
  const rawOiShort = ois && ois[1] ? ois[1] : undefined

  const formattedOiLong = useMemo(() => {
    if (!rawOiLong) return undefined
    if (!baseTokenDecimals && !decimals) return undefined
    if (!marketTokensDecimalsDifference && typeof marketTokensDecimalsDifference !== 'number' && !decimals) return undefined
    if (decimals) {
      return formatBigNumberUsingDecimalsToNumber(rawOiLong, decimals, sigFigConstant)
    }
    if (marketTokensDecimalsDifference === 0) {
      return formatBigNumberUsingDecimalsToNumber(rawOiLong, baseTokenDecimals, sigFigConstant)
    } else {
      // divide by ONE or 1e18 based on fixed point calc for OI in solidity
      const divBy1e18 = rawOiLong.div(ethers.constants.WeiPerEther)
      return formatBigNumberUsingDecimalsToNumber(divBy1e18, marketTokensDecimalsDifference, sigFigConstant)
    }
  }, [rawOiLong, baseTokenDecimals, decimals, marketTokensDecimalsDifference])

  const formattedOiShort = useMemo(() => {
    if (!rawOiShort) return undefined
    if (!baseTokenDecimals && !decimals) return undefined
    if (!marketTokensDecimalsDifference && typeof marketTokensDecimalsDifference !== 'number' && !decimals) return undefined
    if (decimals) {
      return formatBigNumberUsingDecimalsToNumber(rawOiShort, decimals, sigFigConstant)
    }
    if (marketTokensDecimalsDifference === 0) {
      return formatBigNumberUsingDecimalsToNumber(rawOiShort, baseTokenDecimals, sigFigConstant)
    } else {
      // divide by ONE or 1e18 based on fixed point calc for OI in solidity
      const divBy1e18 = rawOiShort.div(ethers.constants.WeiPerEther)
      return formatBigNumberUsingDecimalsToNumber(divBy1e18, marketTokensDecimalsDifference, sigFigConstant)
    }
  }, [rawOiShort, baseTokenDecimals, decimals, marketTokensDecimalsDifference])

  const capOiResult = useMarketCapOi(marketId)
  const rawCapOi = capOiResult ? capOiResult : undefined
  const formattedCapOi = useMemo(() => {
    if (!rawCapOi) return undefined
    if (!baseTokenDecimals && !decimals) return undefined
    if (!marketTokensDecimalsDifference && typeof marketTokensDecimalsDifference !== 'number' && !decimals) return undefined
    if (decimals) {
      return formatBigNumberUsingDecimalsToNumber(rawCapOi, decimals, sigFigConstant)
    }
    if (marketTokensDecimalsDifference === 0) {
      return formatBigNumberUsingDecimalsToNumber(rawCapOi, baseTokenDecimals, sigFigConstant)
    } else {
      // divide by ONE or 1e18 based on fixed point calc for OI in solidity
      const divBy1e18 = rawCapOi.div(ethers.constants.WeiPerEther)
      return formatBigNumberUsingDecimalsToNumber(divBy1e18, marketTokensDecimalsDifference, sigFigConstant)
    }
  }, [rawCapOi, decimals, baseTokenDecimals, marketTokensDecimalsDifference])

  const peripheryContract = useV1PeripheryContract()

  const buildFee = market?.tradingFeeRate
  const fetchPrices = useSingleCallResult(peripheryContract, 'prices', [marketId])
  const fetchFundingRate = useSingleCallResult(peripheryContract, 'fundingRate', [marketId])

  const prices: {
    bid?: string | number | any
    ask?: string | number | any
    mid?: string | number | any
    _bid?: BigNumberish
    _ask?: BigNumberish
    _mid?: BigNumberish
  } = useMemo(() => {
    if (fetchPrices.loading === true || !fetchPrices.result) {
      return {bid: 'loading', ask: 'loading', mid: 'loading'}
    }

    // when using chainlink feed, but not uniswap v3
    // @dev TO-DO: update variable names to differentiate between chainlink and uni v3 feeds
    if (decimals && quoteTokenDecimals === undefined) {
      return {
        bid: formatBigNumberUsingDecimalsToString(fetchPrices.result?.bid_, decimals, sigFigConstant),
        ask: formatBigNumberUsingDecimalsToString(fetchPrices.result?.ask_, decimals, sigFigConstant),
        mid: formatBigNumberUsingDecimalsToString(fetchPrices.result?.mid_, decimals, sigFigConstant),
        _bid: fetchPrices.result?.bid_,
        _ask: fetchPrices.result?.ask_,
        _mid: fetchPrices.result?.mid_,
      }
    }

    return {
      bid: formatBigNumberUsingDecimalsToString(fetchPrices.result?.bid_, quoteTokenDecimals, sigFigConstant),
      ask: formatBigNumberUsingDecimalsToString(fetchPrices.result?.ask_, quoteTokenDecimals, sigFigConstant),
      mid: formatBigNumberUsingDecimalsToString(fetchPrices.result?.mid_, quoteTokenDecimals, sigFigConstant),
      _bid: fetchPrices.result?.bid_,
      _ask: fetchPrices.result?.ask_,
      _mid: fetchPrices.result?.mid_,
    }
  }, [fetchPrices, decimals, quoteTokenDecimals])

  const fundingRate = useMemo(() => {
    if (fetchFundingRate.loading === true || !fetchFundingRate.result) return 'loading'
    return formatFundingRateToDaily(fetchFundingRate.result?.[0], 18, 2)?.toString() + '%'
  }, [fetchFundingRate])

  const {selectedLeverage, isLong, typedValue, setSlippageValue, txnDeadline} = useBuildState()
  const {onAmountInput, onSelectLeverage, onSelectPositionSide, onSetSlippage, onSetTxnDeadline, onResetBuildState} = useBuildActionHandlers()

  const handleResetTxnSettings = useCallback(
    (e: any) => {
      onSetSlippage(DefaultTxnSettings.DEFAULT_SLIPPAGE)
      onSetTxnDeadline(DefaultTxnSettings.DEFAULT_DEADLINE)
    },
    [onSetSlippage, onSetTxnDeadline],
  )

  const handleLeverageInput = useCallback(
    (e: any) => {
      onSelectLeverage(e.target.value)
    },
    [onSelectLeverage],
  )

  const handleSelectPositionSide = useCallback(
    (isLong: boolean) => {
      onSelectPositionSide(isLong)
    },
    [onSelectPositionSide],
  )

  const handleUserInput = useCallback(
    (input: string) => {
      onAmountInput(input)
    },
    [onAmountInput],
  )

  const maxInputIncludingFees: string | undefined = useMemo(() => {
    const parsedBuildFee = formatWeiToParsedNumber(buildFee, 18, 6)
    let buildFeeValueFromMaxInput

    if (!ovlBalance || !buildFee) return parsedOvlBalance
    buildFeeValueFromMaxInput = Number(ovlBalance && ovlBalance.toFixed(18)) * Number(parsedBuildFee)
    let returnValue = Number(ovlBalance && ovlBalance.toFixed(18)) - buildFeeValueFromMaxInput
    const decimals = 6
    return (Math.trunc(returnValue * Math.pow(10, decimals)) / Math.pow(10, decimals)).toString()
  }, [buildFee, ovlBalance, parsedOvlBalance])

  // Show warning with wallet balance is below minimum
  useEffect(() => {
    if (maxInputIncludingFees && minCollateral && +maxInputIncludingFees < minCollateral) {
      setShowBalanceNotEnoughWarning(true)
    } else {
      setShowBalanceNotEnoughWarning(false)
    }
  }, [maxInputIncludingFees, minCollateral])

  const handleQuickInput = (percentage: number, totalSupply: string | null) => {
    if (totalSupply === '0' || totalSupply === null) return

    let calculatedAmountByPercentage
    if (percentage < 100) {
      calculatedAmountByPercentage = (Number(totalSupply) * (percentage / 100)).toFixed(6)
    } else {
      calculatedAmountByPercentage = (Number(totalSupply) * (percentage / 100)).toFixed(6)
    }
    if (minCollateral && +calculatedAmountByPercentage < minCollateral) return handleUserInput('')
    return handleUserInput(calculatedAmountByPercentage)
  }

  const handleDismiss = useCallback(() => {
    setBuildState({
      showConfirm: false,
      attemptingTransaction,
      transactionErrorMessage,
      transactionHash,
    })
  }, [attemptingTransaction, transactionErrorMessage, transactionHash])

  const [approval, approveCallback] = useApproveCallback(
    typedValue !== '.' ? utils.parseUnits(typedValue ? typedValue : '0') : undefined,
    market?.id,
    ovl,
  )

  const showApprovalFlow = useMemo(() => {
    return approval !== ApprovalState.APPROVED && approval !== ApprovalState.UNKNOWN
  }, [approval])

  const handleApprove = useCallback(async () => {
    if (!typedValue) {
      // throw new Error("missing position input size");
      return
    }
    setBuildState({
      showConfirm: false,
      attemptingTransaction: true,
      transactionErrorMessage: undefined,
      transactionHash: undefined,
    })
    approveCallback()
      .then(hash => {
        setBuildState({
          showConfirm: false,
          attemptingTransaction: false,
          transactionErrorMessage: undefined,
          transactionHash: undefined,
        })
      })
      .catch(error => {
        setBuildState({
          showConfirm: false,
          attemptingTransaction: false,
          transactionErrorMessage: error,
          transactionHash: undefined,
        })
      })
  }, [approveCallback, typedValue])

  const estimatedOiResult = useEstimatedBuildOi(market?.id, typedValue, selectedLeverage, isLong, decimals, baseTokenDecimals, quoteTokenDecimals)

  const rawExpectedOi = estimatedOiResult.rawOi ? estimatedOiResult.rawOi : null
  const expectedOi = estimatedOiResult?.formattedOi ? estimatedOiResult?.formattedOi : null
  const estimatedFractionOfCapOi = useFractionOfCapOi(market?.id, estimatedOiResult?.rawOi)
  const estimatedBid: BigNumber | undefined = useBid(market?.id, estimatedFractionOfCapOi)
  const estimatedAsk: BigNumber | undefined = useAsk(market?.id, estimatedFractionOfCapOi)

  const estimatedLiquidationPriceResult = useEstimatedBuildLiquidationPrice(market?.id, typedValue, selectedLeverage, isLong)

  const estimatedLiquidationPrice = estimatedLiquidationPriceResult
    ? formatBigNumberUsingDecimalsToNumber(estimatedLiquidationPriceResult, decimals ?? quoteTokenDecimals, sigFigConstant)
    : null

  const estimatedReceivedPrice: any = useMemo(() => {
    if (isLong === undefined || estimatedBid === undefined || estimatedAsk === undefined) {
      return null
    }
    if (decimals) {
      return isLong
        ? formatBigNumberUsingDecimalsToString(estimatedAsk, decimals, sigFigConstant)
        : formatBigNumberUsingDecimalsToString(estimatedBid, decimals, sigFigConstant)
    }
    // if (estimatedBid === undefined || estimatedAsk === undefined) return prices.mid;
    return isLong
      ? formatBigNumberUsingDecimalsToString(estimatedAsk, quoteTokenDecimals, sigFigConstant)
      : formatBigNumberUsingDecimalsToString(estimatedBid, quoteTokenDecimals, sigFigConstant)
  }, [isLong, estimatedBid, estimatedAsk, quoteTokenDecimals, decimals])

  const headerPrice: string = useMemo(() => {
    const price = estimatedReceivedPrice ?? prices.mid
    const formattedPrice = price < 100000 ? price : Math.floor(price)
    return Number(formattedPrice).toLocaleString()
  }, [estimatedReceivedPrice, prices.mid])

  const priceImpact = useMemo(() => {
    if (!estimatedReceivedPrice) return null
    if (!typedValue || isLong === undefined || prices.bid === undefined || prices.ask === undefined) return null
    if (prices.bid === 'loading' || prices.ask === 'loading') return <Loader stroke="white" size="12px" />

    const priceImpactValue = isLong ? estimatedReceivedPrice - prices.ask : prices.bid - estimatedReceivedPrice
    const priceImpactPercentage = isLong ? (priceImpactValue / prices.ask) * 100 : (priceImpactValue / prices.bid) * 100

    return priceImpactPercentage.toFixed(2)
  }, [estimatedReceivedPrice, typedValue, isLong, prices.bid, prices.ask])

  const isPriceImpactHigh: boolean | null = useMemo(() => {
    if (!estimatedReceivedPrice || !priceImpact) return null
    if (!setSlippageValue) return null
    return Number(priceImpact) - Number(setSlippageValue) > 0 ? true : false
  }, [estimatedReceivedPrice, priceImpact, setSlippageValue])

  const showUnderwaterFlow = useMemo(() => {
    if (prices.mid === undefined || prices.mid === 'loading' || !estimatedLiquidationPrice) return false
    return isLong ? estimatedLiquidationPrice > parseFloat(prices.mid) : estimatedLiquidationPrice < parseFloat(prices.mid)
  }, [prices, isLong, estimatedLiquidationPrice])

  const exceedOiCap = useMemo(() => {
    if (!rawOiLong || !rawOiShort || !rawCapOi || !rawExpectedOi || isLong === undefined) return false
    return isLong ? rawExpectedOi.add(rawOiLong).gt(rawCapOi) : rawExpectedOi.add(rawOiShort).gt(rawCapOi)
  }, [isLong, rawOiLong, rawOiShort, rawCapOi, rawExpectedOi])

  const {adjustedCollateral} = useEstimatedBuild(
    selectedLeverage,
    Number(typedValue),
    buildFee ? formatWeiToParsedNumber(buildFee, 18, 10) : undefined,
  )

  const {buildData, inputError} = useDerivedBuildInfo()
  const estPrice = isLong ? estimatedAsk : estimatedBid
  const {callback: buildCallback, minPrice} = useBuildCallback(buildData, market?.id, estPrice, minCollateral, inputError) //change here
  const disableBuildButton: boolean = useMemo(() => {
    if (!typedValue || !parsedOvlBalance || !minCollateral || isLong === undefined || !estPrice) {
      return true
    }
    if (Number(typedValue) > Number(parsedOvlBalance)) {
      return true
    }
    if (minCollateral > Number(typedValue)) {
      return true
    }
    return false
  }, [typedValue, isLong, minCollateral, parsedOvlBalance, estPrice])

  const handleBuild = useCallback(() => {
    if (!typedValue) throw new Error('missing position input size')
    if (isLong === undefined) throw new Error('please choose a long/short position')
    if (!buildCallback) return
    setBuildState({
      showConfirm: true,
      attemptingTransaction: true,
      transactionErrorMessage: undefined,
      transactionHash: undefined,
    })
    buildCallback()
      .then(hash => {
        setBuildState({
          showConfirm: true,
          attemptingTransaction: true,
          transactionErrorMessage: undefined,
          transactionHash: hash,
        })
        setBuildState({
          showConfirm: false,
          attemptingTransaction: false,
          transactionErrorMessage: undefined,
          transactionHash: hash,
        })
        onResetBuildState()
      })
      .catch(error => {
        setBuildState({
          showConfirm: false,
          attemptingTransaction: false,
          transactionErrorMessage: error,
          transactionHash: undefined,
        })
      })
  }, [buildCallback, onResetBuildState, isLong, typedValue])

  return (
    <MarketCard align={'left'} padding={'0px'}>
      <ControlInterfaceContainer onSubmit={(e: any) => e.preventDefault()} as={'form'}>
        <ControlInterfaceHeadContainer>
          <TEXT.BoldHeader1>{marketName}</TEXT.BoldHeader1>
          <TEXT.StandardHeader1>{headerPrice}</TEXT.StandardHeader1>
          {isTxnSettingsOpen ? (
            <Icon
              onClick={() => setTxnSettingsOpen(!isTxnSettingsOpen)}
              disabled={Number(setSlippageValue) < MINIMUM_SLIPPAGE_VALUE}
              size={24}
              top={'18px'}
              right={'0px'}
              clickable={true}
              position={'absolute'}
              margin={'0 0 auto auto'}
              transform={'rotate(90deg)'}
              color={'#12B4FF'}
            >
              <X />
            </Icon>
          ) : (
            <Icon
              onClick={() => setTxnSettingsOpen(!isTxnSettingsOpen)}
              size={24}
              top={'18px'}
              right={'0px'}
              clickable={true}
              position={'absolute'}
              margin={'0 0 auto auto'}
              transform={'rotate(90deg)'}
              color={'#B9BABD'}
            >
              <Sliders />
            </Icon>
          )}
        </ControlInterfaceHeadContainer>
        <TransactionSettingsModal
          isTxnSettingsOpen={isTxnSettingsOpen}
          setSlippageValue={setSlippageValue}
          isTxnSettingsAuto={isTxnSettingsAuto}
          txnDeadline={txnDeadline}
          onSetSlippage={onSetSlippage}
          handleResetTxnSettings={handleResetTxnSettings}
          onSetTxnDeadline={onSetTxnDeadline}
        />
        <SelectLongPositionButton onClick={() => handleSelectPositionSide(true)} active={isLong}>
          Long
        </SelectLongPositionButton>
        <SelectShortPositionButton onClick={() => handleSelectPositionSide(false)} active={!isLong && isLong !== undefined}>
          Short
        </SelectShortPositionButton>
        <LeverageSlider
          name={'Build Position Leverage'}
          min={1}
          max={capLeverage ?? 1}
          step={0.1}
          margin={'24px 0 0 0'}
          value={Number(selectedLeverage)}
          onChange={handleLeverageInput}
        />
        <NumericalInputLabel htmlFor="Build Amount Input">
          <NumericalInputTitle> Amount </NumericalInputTitle>
          <FlexRow ml="auto" mb="4px" width="auto">
            <TransparentUnderlineButton onClick={() => handleQuickInput(25, ovlBalance?.toFixed(6) ?? null)}>25%</TransparentUnderlineButton>
            <TransparentUnderlineButton onClick={() => handleQuickInput(50, ovlBalance?.toFixed(6) ?? null)}>50%</TransparentUnderlineButton>
            <TransparentUnderlineButton onClick={() => handleQuickInput(75, ovlBalance?.toFixed(6) ?? null)}>75%</TransparentUnderlineButton>
            <TransparentUnderlineButton onClick={() => handleQuickInput(100, maxInputIncludingFees ?? null)}>Max</TransparentUnderlineButton>
          </FlexRow>
        </NumericalInputLabel>
        <NumericalInputContainer>
          <NumericalInputDescriptor> OVL </NumericalInputDescriptor>
          <NumericalInput align={'right'} onUserInput={handleUserInput} value={typedValue?.toString()} />
        </NumericalInputContainer>
        <NumericalInputBottomText>
          minimum: {minCollateral !== undefined ? minCollateral : <Loader stroke="white" size="12px" />}
        </NumericalInputBottomText>

        <MainDetails
          quoteTokenDecimals={quoteTokenDecimals}
          decimals={decimals}
          typedValue={typedValue}
          isLong={isLong}
          estimatedBid={estimatedBid}
          estimatedAsk={estimatedAsk}
          bidPrice={prices.bid}
          askPrice={prices.ask}
          minPrice={minPrice.length === 1 ? minPrice[0] : undefined}
        />

        {showUnderwaterFlow ? (
          <TriggerBuildButton onClick={() => null} isDisabled={true} disabled={true}>
            Position Underwater
          </TriggerBuildButton>
        ) : exceedOiCap ? (
          <TriggerBuildButton onClick={() => null} isDisabled={true} disabled={true}>
            Exceeds OI Cap
          </TriggerBuildButton>
        ) : showBalanceNotEnoughWarning ? (
          <TriggerBuildButton onClick={() => null} isDisabled={true} disabled={true}>
            OVL Balance Below Minimum
          </TriggerBuildButton>
        ) : showApprovalFlow ? (
          <ApproveTransactionButton attemptingTransaction={attemptingTransaction} onClick={handleApprove} />
        ) : (
          <TriggerBuildButton
            onClick={() => {
              setBuildState({
                showConfirm: true,
                attemptingTransaction: false,
                transactionErrorMessage: undefined,
                transactionHash: undefined,
              })
            }}
            isDisabled={disableBuildButton}
            disabled={disableBuildButton}
          >
            Build {isPriceImpactHigh && '- High Price Impact'}
          </TriggerBuildButton>
        )}
      </ControlInterfaceContainer>

      <AdditionalDetails
        bidPrice={prices.bid}
        askPrice={prices.ask}
        fee={buildFee ? formatDecimalToPercentage(formatWeiToParsedNumber(buildFee, 18, 5)) : 'loading'}
        oiCap={formattedCapOi}
        oiLong={formattedOiLong}
        oiShort={formattedOiShort}
        slippageTolerance={setSlippageValue}
        fundingRate={fundingRate}
        expectedOi={expectedOi && typedValue !== '' ? expectedOi : null}
        estLiquidationPrice={estimatedLiquidationPrice && typedValue !== '' ? estimatedLiquidationPrice : '-'}
        marketAddress={market?.id}
        feedAddress={market?.feedAddress}
      />

      <ConfirmTxnModal
        marketName={marketName}
        isOpen={showConfirm}
        attemptingTransaction={attemptingTransaction}
        isLong={isLong}
        buildFee={buildFee && formatDecimalToPercentage(formatWeiToParsedNumber(buildFee, 18, 5))}
        onConfirm={() => handleBuild()}
        onDismiss={handleDismiss}
        marketPrice={!isLong ? prices.bid : prices.ask}
        setSlippageValue={setSlippageValue}
        selectedLeverage={selectedLeverage}
        adjustedCollateral={adjustedCollateral}
        expectedOi={expectedOi && typedValue !== '' ? expectedOi : null}
        estimatedLiquidationPrice={estimatedLiquidationPrice && typedValue !== '' ? estimatedLiquidationPrice : '-'}
        transactionHash={transactionHash}
        transactionErrorMessage={transactionErrorMessage}
      />
    </MarketCard>
  )
}
