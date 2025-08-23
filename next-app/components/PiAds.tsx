import { useQuery } from '@tanstack/react-query';

/**
 * PiAds component: Fetches and displays Pi Network ads from a configurable API endpoint.
 * Usage: <PiAds apiEndpoint="https://api.minepi.com/ads" />
 */
// Mock ad data for development
const mockAds = [
  {
    id: 'ad1',
    url: 'https://minepi.com/',
    image: 'https://minepi.com/assets/pi-logo.png',
    title: 'Earn Pi with Pi Network!',
  },
  {
    id: 'ad2',
    url: 'https://minepi.com/ads',
    image: 'https://minepi.com/assets/pi-ad.png',
    title: 'Advertise on Pi Network',
  },
];

export default function PiAds() {
    const { data, isLoading, error } = useQuery({
    queryKey: ['piAds'],
    queryFn: async () => {
      // Simulate loading delay
      await new Promise((r) => setTimeout(r, 400));
      // Simulate error state randomly (10% chance)
      if (Math.random() < 0.1) throw new Error('Mock ad fetch error');
      return { ads: mockAds };
    }
  });

  if (isLoading) return <div>Loading Pi Network ads...</div>;
  if (error) return <div>Could not load ads.</div>;
  if (!data?.ads?.length) return <div>No ads available.</div>;

  return (
    <div className="flex flex-wrap gap-4 justify-center my-4">
      {data.ads.map((ad: any) => (
        <a
          href={ad.url}
          key={ad.id}
          target="_blank"
          rel="noopener noreferrer"
          className="block border rounded shadow hover:shadow-lg bg-gray-800 p-2 transition"
        >
          <img
            src={ad.image}
            alt={ad.title || 'Pi Network Ad'}
            className="max-w-xs max-h-24 object-contain mx-auto"
          />
          {ad.title && (
            <div className="text-xs text-gray-200 mt-1 text-center">{ad.title}</div>
          )}
        </a>
      ))}
    </div>
  );
}

