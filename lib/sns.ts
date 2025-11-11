import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  fromHex,
  http,
} from "viem";
import { namehash } from "viem/ens";

import { SnsRegistryAbi } from "./abi/snsRegistry";
import { SOPHON_VIEM_CHAIN } from "./sophonChain";

export const NAME_PATTERN = /^[a-z0-9]{1,28}$/;

export const SOPHON_SNS_REGISTRY =
  "0xB6207614218417c7D7da669313143051AAe6b365" as const;

const DEFAULT_DOMAIN_SUFFIX = "soph.id";

const publicClient = createPublicClient({
  chain: SOPHON_VIEM_CHAIN,
  transport: http(),
});

let cachedSuffix: string | null = null;

const getDomainSuffix = async () => {
  if (cachedSuffix) {
    return cachedSuffix;
  }

  try {
    const baseDomain = (await publicClient.readContract({
      address: SOPHON_SNS_REGISTRY,
      abi: SnsRegistryAbi,
      functionName: "baseDomain",
    })) as string;

    cachedSuffix = baseDomain?.replace(/^\./, "") || DEFAULT_DOMAIN_SUFFIX;
  } catch {
    cachedSuffix = DEFAULT_DOMAIN_SUFFIX;
  }

  return cachedSuffix;
};

export const isSophonNameAvailable = async (name: string) => {
  if (!name) {
    return true;
  }

  const suffix = await getDomainSuffix();
  const hash = namehash(`${name}.${suffix}`);
  const tokenId = fromHex(hash, "bigint");

  try {
    await publicClient.readContract({
      address: SOPHON_SNS_REGISTRY,
      abi: SnsRegistryAbi,
      functionName: "ownerOf",
      args: [tokenId],
    });
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const missingTokenMessage =
      message.includes("ERC721NonexistentToken") ||
      message.toLowerCase().includes("nonexistent token");
    const knownContractError =
      error instanceof BaseError &&
      Boolean(
        error.walk((innerError) =>
          innerError instanceof ContractFunctionRevertedError
        )
      );

    if (missingTokenMessage || knownContractError) {
      return true;
    }

    throw error;
  }
};
