import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MainBanner from './MainBanner';

describe('MainBanner', () => {
  it('renders logo, title, description, and all buttons', () => {
    render(<MainBanner />);
    expect(screen.getByAltText(/Pioneer Logo/i)).toBeInTheDocument();
    expect(screen.getByText(/Pioneer Pathways/i)).toBeInTheDocument();
    expect(screen.getByText(/Explore, Trade, and Conquer/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get Started/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Explore Scrolls/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect with Pi/i })).toBeInTheDocument();
  });

  it('calls connectPi when Connect with Pi button is clicked', () => {
    // Mock window.Pi
    const authenticateMock = jest.fn().mockResolvedValue({ user: { username: 'testuser' } });
    // @ts-ignore
    window.Pi = { authenticate: authenticateMock };
    render(<MainBanner />);
    fireEvent.click(screen.getByRole('button', { name: /Connect with Pi/i }));
    expect(authenticateMock).toHaveBeenCalled();
  });
});
