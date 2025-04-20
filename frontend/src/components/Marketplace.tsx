import { useMarketplace, useBuyItem, useSellItem } from '../hooks/useMarketplace';
import { EMOJIS } from '../parameters/emojis';

import Toast from './Toast';
import { useState } from 'react';

export default function Marketplace() {
  const { data: items, isLoading, error } = useMarketplace();
  const buyItem = useBuyItem();
  // For demo, sellItem is not wired to UI

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  // Show toast on buy success/error
  const handleBuy = async (itemId: string, itemName: string) => {
    setToastError(null);
    setToastMsg(null);
    buyItem.mutate(itemId, {
      onSuccess: () => {
        setToastMsg(`Successfully purchased ${itemName}!`);
      },
      onError: (error: any) => {
        setToastError(error?.message || 'Failed to purchase item.');
      },
    });
  };

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

  const sellItem = useSellItem();
  const [sellState, setSellState] = useState<{ [itemId: string]: { quantity: number; price: number; open: boolean } }>({});

  const handleSellClick = (itemId: string) => {
    setSellState((prev) => ({ ...prev, [itemId]: { quantity: 1, price: 1, open: true } }));
  };
  const handleSellChange = (itemId: string, field: 'quantity' | 'price', value: number) => {
    setSellState((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value }
    }));
  };
  const handleSellSubmit = (item: any) => {
    const { quantity, price } = sellState[item.id];
    setToastError(null);
    setToastMsg(null);
    sellItem.mutate({ itemId: item.id, quantity, price }, {
      onSuccess: () => {
        setToastMsg(`Successfully listed ${quantity}x ${item.name} for ${price} Pi!`);
        setSellState((prev) => ({ ...prev, [item.id]: { ...prev[item.id], open: false } }));
      },
      onError: (error: any) => {
        setToastError(error?.message || 'Failed to list item.');
      },
    });
  };

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
              onClick={() => handleBuy(item.id, item.name)}
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
            {/* SELL BUTTON for items owned by 'me' (demo logic) */}
            {item.seller === 'me' && !sellState[item.id]?.open && (
              <IconButton
                ariaLabel={`Sell ${item.name}`}
                title={`Sell ${item.name}`}
                onClick={() => handleSellClick(item.id)}
                primary={false}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10h12" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M10 4v12" stroke="#b45309" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span className="ml-1">Sell</span>
              </IconButton>
            )}
            {/* SELL FORM */}
            {item.seller === 'me' && sellState[item.id]?.open && (
              <form
                onSubmit={e => { e.preventDefault(); handleSellSubmit(item); }}
                className="flex flex-col gap-2 bg-gray-800 p-2 rounded mt-2"
                style={{ minWidth: 180 }}
              >
                <label className="text-xs text-gray-300">Quantity:
                  <input
                    type="number"
                    min={1}
                    max={item.quantity}
                    value={sellState[item.id]?.quantity || 1}
                    onChange={e => handleSellChange(item.id, 'quantity', Number(e.target.value))}
                    className="ml-2 w-12 text-black px-1 rounded"
                  />
                </label>
                <label className="text-xs text-gray-300">Price:
                  <input
                    type="number"
                    min={1}
                    value={sellState[item.id]?.price || 1}
                    onChange={e => handleSellChange(item.id, 'price', Number(e.target.value))}
                    className="ml-2 w-12 text-black px-1 rounded"
                  /> Pi
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 text-xs"
                    disabled={sellItem.isPending}
                  >
                    {sellItem.isPending ? 'Listing...' : 'Confirm Sell'}
                  </button>
                  <button
                    type="button"
                    className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 text-xs"
                    onClick={() => setSellState(prev => ({ ...prev, [item.id]: { ...prev[item.id], open: false } }))}
                  >Cancel</button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
    {/* Toast for success */}
    {toastMsg && (
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} color="blue" />
    )}
    {/* Toast for error */}
    {toastError && (
      <Toast message={toastError} onClose={() => setToastError(null)} color="red" />
    )}
  );
}
