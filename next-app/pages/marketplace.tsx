import { GetServerSideProps } from 'next';
import React from 'react';

type Item = {
  id: string;
  name: string;
  price: number;
};

export default function Marketplace({ items }: { items: Item[] }) {
  return (
    <div>
      <h1>Marketplace</h1>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.name} — ${item.price}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  // Example static data; replace with real API call
  const items = [
    { id: '1', name: 'Sword', price: 100 },
    { id: '2', name: 'Shield', price: 150 },
    { id: '3', name: 'Potion', price: 50 }
  ];
  return { props: { items } };
};
