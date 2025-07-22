import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('App Component', () => {
  it('should render the main heading', () => {
    render(<App />, { wrapper: createWrapper() })
    
    const heading = screen.getByRole('heading', { name: /PharmaRx/i })
    expect(heading).toBeInTheDocument()
  })

  it('should display welcome message', () => {
    render(<App />, { wrapper: createWrapper() })
    
    const welcomeMessage = screen.getByText(/Welcome to PharmaRx - Prescription Management System/i)
    expect(welcomeMessage).toBeInTheDocument()
  })

  it('should display success message', () => {
    render(<App />, { wrapper: createWrapper() })
    
    const successMessage = screen.getByText(/Frontend application is running successfully/i)
    expect(successMessage).toBeInTheDocument()
  })
}) 