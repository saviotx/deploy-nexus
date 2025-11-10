export const NexusFactoryPassthroughAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "error",
    name: "SophonSent",
    inputs: [],
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroValue",
    inputs: [],
  },
  {
    type: "function",
    name: "ADMIN_ROLE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createAccount",
    inputs: [
      {
        name: "initData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "accountAddress",
        type: "address",
        internalType: "address payable",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "createAccountWithName",
    inputs: [
      {
        name: "initData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32",
      },
      {
        name: "name",
        type: "string",
        internalType: "string",
      },
    ],
    outputs: [
      {
        name: "accountAddress",
        type: "address",
        internalType: "address payable",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "computeAccountAddress",
    inputs: [
      {
        name: "initData",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32",
      },
    ],
    outputs: [
      {
        name: "expectedAddress",
        type: "address",
        internalType: "address payable",
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAccount",
    inputs: [
      {
        name: "accountAddress",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [
      {
        name: "metadata",
        type: "tuple",
        internalType: "struct NexusFactoryPassthrough.AccountData",
        components: [
          {
            name: "k1Signer",
            type: "address",
            internalType: "address",
          },
          {
            name: "currentVersion",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAccounts",
    inputs: [
      {
        name: "accountAddresses",
        type: "address[]",
        internalType: "address[]",
      },
    ],
    outputs: [
      {
        name: "metadataList",
        type: "tuple[]",
        internalType: "struct NexusFactoryPassthrough.AccountData[]",
        components: [
          {
            name: "k1Signer",
            type: "address",
            internalType: "address",
          },
          {
            name: "currentVersion",
            type: "string",
            internalType: "string",
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "adminAddress_",
        type: "address",
        internalType: "address",
      },
      {
        name: "nexusFactory_",
        type: "address",
        internalType: "address",
      },
      {
        name: "k1Validator_",
        type: "address",
        internalType: "address",
      },
      {
        name: "sophonNameService_",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setK1Validator",
    inputs: [
      {
        name: "k1Validator_",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setNexusFactory",
    inputs: [
      {
        name: "nexusFactory_",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setSophonNameService",
    inputs: [
      {
        name: "sophonNameService_",
        type: "address",
        internalType: "address",
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "receive",
    stateMutability: "payable",
  },
] as const;

export type NexusFactoryPassthroughAbiType = typeof NexusFactoryPassthroughAbi;
