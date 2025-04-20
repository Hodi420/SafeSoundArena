import { useMarketplace, useBuyItem, useSellItem } from '../hooks/useMarketplace';
import { EMOJIS } from '../parameters/emojis';

export default function Marketplace() {
  const { data: items, isLoading, error } = useMarketplace();
  const buyItem = useBuyItem();
  // For demo, sellItem is not wired to UI
  if (isLoading) return (
    <div className="bg-gray-900 rounded-lg p-4 border border-yellow-500 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-20 bg-gray-700 rounded col-span-1"></div>
        <div className="h-20 bg-gray-700 rounded col-span-1"></div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-red-500 text-red-200 max-w-md mx-auto">
        <div className="font-bold mb-2">Error loading marketplace</div>
        <div>{error.message || 'Something went wrong. Please try again later.'}</div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-yellow-500 text-yellow-200 max-w-md mx-auto">
        <div className="font-bold mb-2">No items available</div>
        <div>The marketplace is currently empty. Please check back soon!</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="font-bold mb-2">{EMOJIS.BLOCKCHAIN.TRADE} Marketplace</div>
      <div className={styles.marketplaceList}>
        {items.map(item => (
          <div key={item.id} className={styles.marketplaceItem}>
            <span className="text-2xl">{item.emoji}</span>
            <div>
              <div className="font-bold">{item.name}</div>
              <div className="text-xs text-gray-400">{item.rarity}</div>
              <div className="text-green-400">{item.price} Pi</div>
            </div>
            <IconButton
              ariaLabel={`Buy ${item.name} for ${item.price} Pi`}
              title={`Buy ${item.name} for ${item.price} Pi`}
              primary={!buyItem.isPending}
              disabled={buyItem.isPending}
              onClick={() => buyItem.mutate(item.id)}
            >
              {buyItem.isPending ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{animation: 'spin 1s linear infinite'}}>
                  <circle cx="11" cy="11" r="9" stroke="#1b7c1b" strokeWidth="3" opacity="0.2"/>
                  <path d="M11 2a9 9 0 0 1 9 9" stroke="#1b7c1b" strokeWidth="3" strokeLinecap="round"/>
                  <style>{'@keyframes spin{100%{transform:rotate(360deg);}}'}</style>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="16" height="8" rx="2" stroke="#1b7c1b" strokeWidth="2"/>
                  <circle cx="8" cy="17" r="1.2" fill="#1b7c1b"/>
                  <circle cx="16" cy="17" r="1.2" fill="#1b7c1b"/>
                  <path d="M6 7V5.5A1.5 1.5 0 0 1 7.5 4h7A1.5 1.5 0 0 1 16 5.5V7" stroke="#1b7c1b" strokeWidth="1.3"/>
                </svg>
              )}
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}
