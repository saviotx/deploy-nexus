'use client';

import { useCallback, useMemo, useState } from 'react';
import { isAddress } from 'viem';

import { deployAccount } from '@/lib/deployAccount';

type DeployResult = Awaited<ReturnType<typeof deployAccount>>;

export default function Home() {
  const [ownerInput, setOwnerInput] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [result, setResult] = useState<DeployResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const ownerAddress = useMemo(() => ownerInput.trim() as `0x${string}`, [ownerInput]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setErrorMessage(null);
      setResult(null);

      if (!ownerAddress || !isAddress(ownerAddress)) {
        setErrorMessage('Enter a valid 0x-prefixed owner address.');
        return;
      }

      try {
        setIsDeploying(true);
        const response = await deployAccount(ownerAddress);
        setResult(response);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Something went wrong while deploying.';
        setErrorMessage(message);
      } finally {
        setIsDeploying(false);
      }
    },
    [ownerAddress],
  );

  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 py-16 font-sans text-zinc-900 dark:bg-black dark:text-zinc-100">
      <main className="flex w-full max-w-2xl flex-col gap-8 rounded-xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Sophon Testnet Account Tool</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Deploy test accounts using the Abstract Nexus factory on the Sophon Testnet. Provide an
            EOA address as owner and trigger the deployment flow to inspect predicted addresses,
            transaction hashes, and status.
          </p>
        </header>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Owner address
            <input
              className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-base shadow-sm outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/40"
              name="owner"
              placeholder="0x..."
              value={ownerInput}
              onChange={(event) => setOwnerInput(event.target.value)}
              disabled={isDeploying}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <button
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:bg-zinc-600"
            type="submit"
            disabled={isDeploying}
          >
            {isDeploying ? 'Deploying…' : 'Deploy Account'}
          </button>
        </form>

        {errorMessage ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-200">
            {errorMessage}
          </div>
        ) : null}

        {result ? (
          <section className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-base font-semibold">Deployment Details</h2>
            <div className="space-y-2 break-all">
              <p>
                <span className="font-medium">Account address:</span> {result.accountAddress}
              </p>
              <p>
                <span className="font-medium">Already deployed:</span>{' '}
                {result.alreadyDeployed ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-medium">Transaction hash:</span>{' '}
                {result.transactionHash ?? 'Not sent'}
              </p>
            </div>
          </section>
        ) : null}

        <footer className="text-xs text-zinc-400 dark:text-zinc-600">
          Keep this tool private—your deployment service key is embedded client-side for convenient
          testing only.
        </footer>
      </main>
    </div>
  );
}
