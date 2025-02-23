
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../pages/login';
import { AuthProvider } from '../hooks/use-auth';

describe('Authentication Tests', () => {
  test('login form renders correctly', () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  test('shows error message on invalid credentials', async () => {
    render(
      <AuthProvider>
        <Login />
      </AuthProvider>
    );
    
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrongpassword' },
    });
    
    fireEvent.click(screen.getByText('Sign in'));
    
    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
  });
});
