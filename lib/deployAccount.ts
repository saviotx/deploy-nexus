import {
  AccountFactoryAbi,
  getMEEVersion,
  MEEVersion,
  NexusBootstrapAbi,
} from "@biconomy/abstractjs";
import {
  type Account,
  type Chain,
  createPublicClient,
  createWalletClient,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  type Hex,
  http,
  pad,
  parseAbiParameters,
  type Transport,
  toHex,
  type WalletClient,
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

export const deployAccount = async (ownerAddress: `0x${string}`) => {
  console.log("Deploying account...");
  console.log(`Owner address: ${ownerAddress}`);

  const deployerAccount = privateKeyToAccount(
    "0x0a64c2dbb70fb9059a354312467af1a5a6d4e041b67bcbebc11b1d7492d19142" as `0x${string}`
  );

  console.log(deployerAccount);

  const deployerClient: WalletClient<Transport, Chain, Account> =
    createWalletClient({
      account: deployerAccount,
      chain: SOPHON_VIEM_CHAIN,
      transport: http(),
    });

  const publicClient = createPublicClient({
    chain: SOPHON_VIEM_CHAIN,
    transport: http(),
  });

  const meeConfig = getMEEVersion(MEEVersion.V2_1_0);
  const indexInput = "0";
  const accountIndex = BigInt(indexInput ?? "0");
  const factoryAddress = meeConfig.factoryAddress;
  const bootstrapAddress = meeConfig.bootStrapAddress;
  const saltHex = pad(toHex(accountIndex), { size: 32 }) as Hex;

  console.log("Encoding bootstrap payload...");
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
  ]);

  const predictedAccount = (await publicClient.readContract({
    address: factoryAddress,
    abi: AccountFactoryAbi,
    functionName: "computeAccountAddress",
    args: [initData, saltHex],
  })) as `0x${string}`;

  console.log(`Predicted account: ${predictedAccount}`);

  const existingCode = await publicClient.getCode({
    address: predictedAccount,
  });

  const alreadyDeployed = existingCode && existingCode !== "0x";

  if (alreadyDeployed) {
    console.log("Account already deployed");
    return {
      accountAddress: predictedAccount,
      alreadyDeployed,
      transactionHash: null,
    } as const;
  }

  const backendBalance = await publicClient.getBalance({
    address: deployerAccount.address,
  });

  console.log("Service key balance check");
  console.log(`Balance: ${formatEther(backendBalance)} SOPH`);
  if (backendBalance === BigInt(0)) {
    throw new Error("Backend signer has no SOPH for gas");
  }

  console.log("Sending factory transaction...");

  const txHash = await deployerClient.writeContract({
    address: factoryAddress,
    abi: AccountFactoryAbi,
    functionName: "createAccount",
    args: [initData, saltHex],
    value: BigInt(0),
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    accountAddress: predictedAccount,
    alreadyDeployed,
    transactionHash: txHash,
  } as const;
};
