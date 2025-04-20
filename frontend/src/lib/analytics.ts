import ReactGA from 'react-ga4';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export function initGA() {
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    ReactGA.initialize(GA_MEASUREMENT_ID);
  }
}

export function trackPageView(url: string) {
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    ReactGA.send({ hitType: 'pageview', page: url });
  }
}

export function trackEvent(action: string, params?: Record<string, any>) {
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    ReactGA.event(action, params);
  }
}
