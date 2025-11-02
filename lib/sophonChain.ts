import { defineChain } from 'viem';

export const sophonTestnet = defineChain({
  id: 531050204,
  name: 'Sophon Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SOPH',
    symbol: 'SOPH',
  },
  rpcUrls: {
    default: {
      http: ['https://zksync-os-testnet-sophon.zksync.dev'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Sophon Explorer',
      url: 'https://block-explorer-api.zksync-os-testnet-sophon.zksync.dev/',
    },
  },
  testnet: true,
});

export const SOPHON_VIEM_CHAIN = sophonTestnet;
