import { createAction } from '@reduxjs/toolkit';
import { Currency, CurrencyAmount } from '@uniswap/sdk-core';

export enum PositionSide { 
  LONG = 'LONG',
  SHORT = 'SHORT',
};

export enum DefaultTxnSettings { 
  DEFAULT_SLIPPAGE = '0.3',
  DEFAULT_DEADLINE = '30'
};

export const typeInput = createAction<{ typedValue: string | undefined }>('positions/typeInput');
export const selectLeverage = createAction<{ selectedLeverage: number }>('positions/selectLeverage');
export const selectPositionSide = createAction<{ isLong: boolean }>('positions/selectPositionSide');
export const setSlippage = createAction<{ setSlippageValue: DefaultTxnSettings | string | undefined }>('positions/setSlippage');
export const setTxnDeadline = createAction<{ txnDeadline: DefaultTxnSettings | string | undefined }>('positions/setTxnDeadline');
export const resetBuildState = createAction<void>('unwind/resetBuildState');