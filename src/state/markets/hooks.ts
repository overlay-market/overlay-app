import { useMemo, useCallback } from "react";
import { useOVLFactoryContract, useMarketContract } from "../../hooks/useContract";
import { useSingleCallResult, useSingleContractMultipleData } from "../multicall/hooks";
import { useAppQuery } from "../data/enhanced";
import { formatAmount } from "../../utils/formatData";
import { useAppSelector } from "../hooks";
import { AppState } from "../state";

export function useMarketsState(): AppState['markets'] {
  return useAppSelector((state) => state.markets)
}

export function useAllMarkets() {
  const account = '0x4F816C2016F5c8496380Cdb6c1dB881f73fe5fCA';

  const {
    isLoading,
    isError,
    error,
    isUninitialized,
    data
  } = useAppQuery({account});

  const formatData = useCallback(() => {
    if (data?.markets.length) {
      

    }


  }, [data])

  return useMemo(() => {
    return {
      isLoading,
      isError,
      error,
      isUninitialized,
      data
    } 
  }, [ isLoading, isError, error, isUninitialized, data ])
};



export function useTotalMarkets() {
  const ovlFactoryContract = useOVLFactoryContract();

  // temporary calling allMarkets
  // 1 market live currently
  // update when more markets live
  const results = useSingleCallResult(
    ovlFactoryContract,
    "allMarkets",
    [0]
  );

  let marketList = results.result;
  if (!Array.isArray(marketList)) {
    // temp hardcode begin state
    marketList = ['0x018184E4F0D1760778F53e7675c578Ee3Fe2e778'];
  }

  return useActiveMarkets(marketList);
};

export function useActiveMarkets(
  addresses?: any
) {
  const ovlFactoryContract = useOVLFactoryContract();
  const results = useSingleContractMultipleData(
    ovlFactoryContract,
    "isMarket",
    [addresses]
  )

  return useMemo(
    () =>
      addresses?.reduce((memo:any, address:any, i:any) => {
        const isTrue = results?.[i];
        if (isTrue) {
          memo.push(address);
        }
        return memo;
      }, []),
      [addresses, results]
  )
  
  // return results;
};

export function useMarketData() {
  const marketContract = useMarketContract('0x018184E4F0D1760778F53e7675c578Ee3Fe2e778');

  const results = useSingleCallResult(
    marketContract,
    'lastPrice',
  )

  return results;
}
