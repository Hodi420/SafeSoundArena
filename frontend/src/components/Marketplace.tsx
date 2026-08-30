import { useState } from 'react';
import { useMarketplace, useBuyItem, useSellItem } from '../hooks/useMarketplace';
import Toast from './Toast';

export default function Marketplace() {
  const { data: items, isLoading, error } = useMarketplace();
  const buyItem = useBuyItem();
  const sellItem = useSellItem();

  const [sellState, setSellState] = useState<Record<string, { quantity: number; price: number; open: boolean }>>({});
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const handleBuy = (itemId: string, itemName: string) => {
    setToastMsg(null);
    setToastError(null);
    buyItem.mutate(itemId, {
      onSuccess: () => setToastMsg(`Successfully purchased ${itemName}!`),
      onError: (err: any) => setToastError(err?.message || 'Failed to purchase item.'),
    });
  };

  const handleSellClick = (itemId: string) => {
    setSellState(prev => ({ ...prev, [itemId]: { quantity: 1, price: 1, open: true } }));
  };

  const handleSellChange = (itemId: string, field: 'quantity' | 'price', value: number) => {
    setSellState(prev => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const handleSellSubmit = (item: any) => {
    const state = sellState[item.id];
    setToastMsg(null);
    setToastError(null);
    sellItem.mutate({ itemId: item.id, quantity: state.quantity, price: state.price }, {
      onSuccess: () => {
        setToastMsg(`Successfully listed ${state.quantity}x ${item.name} for ${state.price} Pi!`);
        setSellState(prev => ({ ...prev, [item.id]: { ...prev[item.id], open: false } }));
      },
      onError: (err: any) => setToastError(err?.message || 'Failed to list item.'),
    });
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-yellow-500 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-red-500 text-red-200 max-w-md mx-auto">
        <div className="font-bold mb-2">Error loading marketplace</div>
        <div>{error.message || 'Something went wrong.'}</div>
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
    <>
      <div className="bg-gray-900 rounded-lg p-4 border border-yellow-500">
        <div className="font-bold mb-2">🔄 Marketplace</div>
        <div className="flex flex-col gap-4 mt-4">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between bg-gray-800 rounded-md p-3 border border-yellow-700 mb-2">
              <span className="text-2xl">{item.emoji}</span>
              <div className="flex-1 ml-3">
                <div className="font-bold">{item.name}</div>
                <div className="text-xs text-gray-400">{item.rarity}</div>
                <div>{item.price} Pi</div>
              </div>
              <button
                className="btn btn-sm bg-yellow-600 text-white rounded px-3 py-1 transition hover:bg-yellow-700 disabled:opacity-50 ml-2"
                aria-label={`Buy ${item.name} for ${item.price} Pi`}
                title={`Buy ${item.name} for ${item.price} Pi`}
                onClick={() => handleBuy(item.id, item.name)}
                disabled={buyItem.isPending}
              >
                {buyItem.isPending ? (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="11" cy="11" r="9" stroke="#1b7c1b" strokeWidth="3" opacity="0.2" />
                    <path d="M11 2a9 9 0 0 1 9 9" stroke="#1b7c1b" strokeWidth="3" strokeLinecap="round" />
                    <style>{'@keyframes spin{100%{transform:rotate(360deg);}}'}</style>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                    <rect x="3" y="7" width="16" height="8" rx="2" stroke="#1b7c1b" strokeWidth="2" />
                    <circle cx="8" cy="17" r="1.2" fill="#1b7c1b" />
                    <circle cx="16" cy="17" r="1.2" fill="#1b7c1b" />
                    <path d="M6 7V5.5A1.5 1.5 0 0 1 7.5 4h7A1.5 1.5 0 0 1 16 5.5V7" stroke="#1b7c1b" strokeWidth="1.3" />
                  </svg>
                )}
              </button>
              {item.seller === 'me' && !sellState[item.id]?.open && (
                <button
                  className="btn btn-sm bg-yellow-600 text-white rounded px-3 py-1 transition hover:bg-yellow-700 disabled:opacity-50 ml-2"
                  aria-label={`Sell ${item.name}`}
                  title={`Sell ${item.name}`}
                  onClick={() => handleSellClick(item.id)}
                  disabled={sellItem.isPending}
                >
                  {sellItem.isPending ? (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="8.5" stroke="#d97706" strokeWidth="1.5" />
                      <path d="M10 6v8M6 10h8" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="10" r="8.5" stroke="#d97706" strokeWidth="1.5" />
                      <path d="M10 6v8M6 10h8" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              )}
              {item.seller === 'me' && sellState[item.id]?.open && (
                <form
                  onSubmit={e => { e.preventDefault(); handleSellSubmit(item); }}
                  className="flex flex-col bg-gray-700 p-2 rounded gap-2 ml-4"
                  style={{ minWidth: 180 }}
                >
                  <label className="text-xs text-gray-300">
                    Quantity:
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={sellState[item.id]?.quantity || 1}
                      onChange={e => handleSellChange(item.id, 'quantity', Number(e.target.value))}
                      className="ml-2 w-12 text-black px-1 rounded"
                    />
                  </label>
                  <label className="text-xs text-gray-300">
                    Price:
                    <input
                      type="number"
                      min={1}
                      value={sellState[item.id]?.price || 1}
                      onChange={e => handleSellChange(item.id, 'price', Number(e.target.value))}
                      className="ml-2 w-12 text-black px-1 rounded"
                    /> Pi
                  </label>
                  <div className="flex gap-2 mt-1">
                    <button type="submit" className="bg-green-700 text-white px-3 py-1 rounded hover:bg-green-800 text-xs" disabled={sellItem.isPending}>
                      {sellItem.isPending ? 'Listing...' : 'Confirm Sell'}
                    </button>
                    <button type="button" className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 text-xs" onClick={() => setSellState(prev => ({ ...prev, [item.id]: { ...prev[item.id], open: false } }))}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} color="blue" />}
      {toastError && <Toast message={toastError} onClose={() => setToastError(null)} color="red" />}  
    </>
  );
}
