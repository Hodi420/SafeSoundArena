export default function AppWalletDemo() {
  const walletAddress = 'Connect a Pi wallet to view an address';

  return (
    <div className="w-full rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
      <h3 className="mb-2 text-lg font-semibold text-blue-700">App Wallet</h3>
      <p className="mb-3 text-sm text-gray-600">
        Demo wallet generation is disabled in production builds.
      </p>
      <div className="break-all rounded bg-white px-3 py-2 font-mono text-sm text-blue-700">
        {walletAddress}
      </div>
    </div>
  );
}
