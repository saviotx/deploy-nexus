import {
  AccountFactoryAbi,
  getMEEVersion,
  MEEVersion,
  NexusBootstrapAbi,
} from "@biconomy/abstractjs";
import {
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  type Hex,
  http,
  pad,
  parseAbiParameters,
  toHex,
  zeroAddress,
  zeroHash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { SOPHON_VIEM_CHAIN } from "./sophonChain";

type BootstrapConfig = { module: `0x${string}`; data: `0x${string}` };
type BootstrapPreValidationHook = {
  hookType: bigint;
  module: `0x${string}`;
  data: `0x${string}`;
};

type DeploymentRequest = {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
};

type PreparedDeployment = {
  publicClient: ReturnType<typeof createPublicClient>;
  request: DeploymentRequest;
  initData: `0x${string}`;
  saltHex: Hex;
  predictedAccount: `0x${string}`;
  alreadyDeployed: boolean;
  callArgs: readonly [`0x${string}`, Hex];
};

const SERVICE_PRIVATE_KEY =
  "0x0a64c2dbb70fb9059a354312467af1a5a6d4e041b67bcbebc11b1d7492d19142" as const;

const serviceAccount = privateKeyToAccount(SERVICE_PRIVATE_KEY);

const prepareDeployment = async (
  ownerAddress: `0x${string}`
): Promise<PreparedDeployment> => {
  const publicClient = createPublicClient({
    chain: SOPHON_VIEM_CHAIN,
    transport: http(),
  });

  const meeConfig = getMEEVersion(MEEVersion.V2_1_0);
  const factoryAddress = "0x84b68EaCE123e6a86dBb6F054af7248B2A0537FC";
  const bootstrapAddress = meeConfig.bootStrapAddress;
  const accountIndex = BigInt(0);
  const saltHex = pad(toHex(accountIndex), { size: 32 }) as Hex;

  const emptyModules: BootstrapConfig[] = [];
  const emptyPrevalidationHooks: BootstrapPreValidationHook[] = [];
  const hookConfig: BootstrapConfig = { module: zeroAddress, data: zeroHash };

  const bootstrapCall = encodeFunctionData({
    abi: NexusBootstrapAbi,
    functionName: "initNexusWithDefaultValidatorAndOtherModulesNoRegistry",
    args: [
      ownerAddress,
      emptyModules,
      emptyModules,
      hookConfig,
      emptyModules,
      emptyPrevalidationHooks,
    ],
  });

  const initData = encodeAbiParameters(parseAbiParameters("address, bytes"), [
    bootstrapAddress,
    bootstrapCall,
  ]) as `0x${string}`;

  const predictedAccount = (await publicClient.readContract({
    address: factoryAddress,
    abi: AccountFactoryAbi,
    functionName: "computeAccountAddress",
    args: [initData, saltHex],
  })) as `0x${string}`;

  const existingCode = await publicClient.getCode({
    address: predictedAccount,
  });

  const alreadyDeployed = existingCode && existingCode !== "0x";

  const encodedFactoryCall = encodeFunctionData({
    abi: AccountFactoryAbi,
    functionName: "createAccount",
    args: [initData, saltHex],
  }) as `0x${string}`;

  return {
    publicClient,
    initData,
    saltHex,
    predictedAccount,
    alreadyDeployed: alreadyDeployed || false,
    callArgs: [initData, saltHex] as const,
    request: {
      to: factoryAddress,
      data: encodedFactoryCall,
      value: BigInt(0),
    },
  };
};

export const deployAccount = async (ownerAddress: `0x${string}`) => {
  console.log("Deploying account...");
  console.log(`Owner address: ${ownerAddress}`);

  const {
    publicClient,
    initData,
    saltHex,
    predictedAccount,
    alreadyDeployed,
    request,
  } = await prepareDeployment(ownerAddress);

  console.log(`Predicted account: ${predictedAccount}`);

  if (alreadyDeployed) {
    console.log("Account already deployed");
    return {
      accountAddress: predictedAccount,
      alreadyDeployed,
      transactionHash: null,
    } as const;
  }

  const backendBalance = await publicClient.getBalance({
    address: serviceAccount.address,
  });

  console.log("Service key balance check");
  console.log(`Balance: ${formatEther(backendBalance)} SOPH`);
  if (backendBalance === BigInt(0)) {
    throw new Error("Backend signer has no SOPH for gas");
  }

  console.log("Sending factory transaction...");

  const deployerClient = createWalletClient({
    account: serviceAccount,
    chain: SOPHON_VIEM_CHAIN,
    transport: http(),
  });

  const txHash = await deployerClient.writeContract({
    address: request.to,
    abi: AccountFactoryAbi,
    functionName: "createAccount",
    args: [initData, saltHex],
    value: request.value,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    accountAddress: predictedAccount,
    alreadyDeployed,
    transactionHash: txHash,
  } as const;
};

export const getDeploymentTransaction = async (ownerAddress: `0x${string}`) => {
  const { request, predictedAccount, alreadyDeployed, callArgs } =
    await prepareDeployment(ownerAddress);

  return {
    accountAddress: predictedAccount,
    alreadyDeployed,
    to: request.to,
    data: request.data,
    value: request.value,
    callArgs,
  } as const;
};
