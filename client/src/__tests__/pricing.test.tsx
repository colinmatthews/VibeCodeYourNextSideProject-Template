
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Pricing from '../pages/pricing';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('Pricing Page Tests', () => {
  test('renders pricing plans', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Pricing />
      </QueryClientProvider>
    );
    
    expect(screen.getByText('Simple, Transparent Pricing')).toBeInTheDocument();
    expect(screen.getByText(/free/i)).toBeInTheDocument();
    expect(screen.getByText(/pro/i)).toBeInTheDocument();
  });
});
