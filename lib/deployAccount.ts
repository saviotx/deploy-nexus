import {
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
import { NexusFactoryPassthroughAbi } from "./abi/nexusFactoryPassthrough";
import { SnsRegistryAbi } from "./abi/snsRegistry";
import { SOPHON_SNS_REGISTRY } from "./sns";

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

type FactoryCall = {
  functionName: "createAccountWithName";
  args: readonly [`0x${string}`, Hex, string];
};

type DeploymentOptions = {
  sophonName?: string;
};

type PreparedDeployment = {
  publicClient: ReturnType<typeof createPublicClient>;
  request: DeploymentRequest;
  initData: `0x${string}`;
  saltHex: Hex;
  predictedAccount: `0x${string}`;
  alreadyDeployed: boolean;
  factoryCall: FactoryCall;
  snsName: string | null;
};

const SERVICE_PRIVATE_KEY =
  "0x0a64c2dbb70fb9059a354312467af1a5a6d4e041b67bcbebc11b1d7492d19142" as const;

const serviceAccount = privateKeyToAccount(SERVICE_PRIVATE_KEY);

const lookupSophonName = async (
  publicClient: ReturnType<typeof createPublicClient>,
  accountAddress: `0x${string}`
): Promise<string | null> => {
  let suffix = "soph.id";
  try {
    const baseDomain = (await publicClient.readContract({
      address: SOPHON_SNS_REGISTRY,
      abi: SnsRegistryAbi,
      functionName: "baseDomain",
    })) as string;
    suffix = baseDomain?.replace(/^\./, "") || suffix;
  } catch {
    // Ignore suffix lookup failures; default is fine.
  }

  /* try {
    const balance = (await publicClient.readContract({
      address: SOPHON_SNS_REGISTRY,
      abi: SnsRegistryAbi,
      functionName: "balanceOf",
      args: [accountAddress],
    })) as bigint;

    if (balance === BigInt(0)) {
      return null;
    }
  } catch {
    return null;
  } */

  try {
    console.log("Looking up token ID...");
    console.log(accountAddress);
    const tokenId = (await publicClient.readContract({
      address: SOPHON_SNS_REGISTRY,
      abi: SnsRegistryAbi,
      functionName: "tokenOfOwnerByIndex",
      args: [accountAddress, BigInt(0)],
    })) as bigint;
    console.log(tokenId);

    const nameHash = pad(toHex(tokenId), { size: 32 }) as Hex;
    const label = (await publicClient.readContract({
      address: SOPHON_SNS_REGISTRY,
      abi: SnsRegistryAbi,
      functionName: "name",
      args: [nameHash],
    })) as string;

    const sanitizedLabel = label?.replace(/\.$/, "");
    return sanitizedLabel ? `${sanitizedLabel}.${suffix}` : null;
  } catch (error) {
    console.log(error);
    console.log("Error looking up token ID...");
    return null;
  }
};

const prepareDeployment = async (
  ownerAddress: `0x${string}`,
  options: DeploymentOptions = {}
): Promise<PreparedDeployment> => {
  const publicClient = createPublicClient({
    chain: SOPHON_VIEM_CHAIN,
    transport: http(),
  });

  const meeConfig = getMEEVersion(MEEVersion.V2_1_0);
  const factoryAddress = "0x5457Ce09A36cCd2b976497670979b90dC9465852";
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
    abi: NexusFactoryPassthroughAbi,
    functionName: "computeAccountAddress",
    args: [initData, saltHex],
  })) as `0x${string}`;

  const existingCode = await publicClient.getCode({
    address: predictedAccount,
  });

  const alreadyDeployed = existingCode && existingCode !== "0x";

  const normalizedName = options.sophonName?.trim() ?? "";

  const factoryCall: FactoryCall = {
    functionName: "createAccountWithName",
    args: [initData, saltHex, normalizedName] as const,
  };

  const encodedFactoryCall = encodeFunctionData({
    abi: NexusFactoryPassthroughAbi,
    functionName: factoryCall.functionName,
    args: factoryCall.args,
  }) as `0x${string}`;

  const snsName = await lookupSophonName(publicClient, predictedAccount);

  return {
    publicClient,
    initData,
    saltHex,
    predictedAccount,
    alreadyDeployed: alreadyDeployed || false,
    factoryCall,
    snsName,
    request: {
      to: factoryAddress,
      data: encodedFactoryCall,
      value: BigInt(0),
    },
  };
};

export const deployAccount = async (
  ownerAddress: `0x${string}`,
  options?: DeploymentOptions
) => {
  console.log("Deploying account...");
  console.log(`Owner address: ${ownerAddress}`);

  const {
    publicClient,
    predictedAccount,
    alreadyDeployed,
    request,
    factoryCall,
  } = await prepareDeployment(ownerAddress, options);

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
    abi: NexusFactoryPassthroughAbi,
    functionName: factoryCall.functionName,
    args: factoryCall.args,
    value: request.value,
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    accountAddress: predictedAccount,
    alreadyDeployed,
    transactionHash: txHash,
  } as const;
};

export const getDeploymentTransaction = async (
  ownerAddress: `0x${string}`,
  options?: DeploymentOptions
) => {
  const { request, predictedAccount, alreadyDeployed, factoryCall, snsName } =
    await prepareDeployment(ownerAddress, options);

  return {
    accountAddress: predictedAccount,
    alreadyDeployed,
    to: request.to,
    data: request.data,
    value: request.value,
    callArgs: factoryCall.args,
    functionName: factoryCall.functionName,
    snsName,
  } as const;
};
