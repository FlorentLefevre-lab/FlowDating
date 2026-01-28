import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';

// Mock session for testing
const mockSession = {
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  },
};

interface AllTheProvidersProps {
  children: React.ReactNode;
  session?: typeof mockSession | null;
}

const AllTheProviders = ({ children, session = mockSession }: AllTheProvidersProps) => {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: typeof mockSession | null;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { session, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders session={session}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  });
};

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Export mock session for reuse
export { mockSession };

// Common test helpers
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Mock router helper
export const createMockRouter = (overrides = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  ...overrides,
});

// Mock fetch helper
export const mockFetch = (response: any, ok = true) => {
  return jest.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
  });
};

// Mock fetch that rejects
export const mockFetchError = (error: Error) => {
  return jest.fn().mockRejectedValue(error);
};

// Helper for testing form validation
export const fillForm = async (user: any, fields: Record<string, string>) => {
  for (const [label, value] of Object.entries(fields)) {
    const input = document.querySelector(`[aria-label="${label}"]`) ||
                  document.querySelector(`[name="${label}"]`) ||
                  document.querySelector(`#${label}`);
    if (input) {
      await user.type(input, value);
    }
  }
};

// Helper to wait for element to be removed
export const waitForElementToBeRemoved = async (getElement: () => HTMLElement | null) => {
  const maxAttempts = 50;
  let attempts = 0;

  while (attempts < maxAttempts) {
    if (!getElement()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    attempts++;
  }

  throw new Error('Element was not removed');
};

// Mock window.matchMedia for responsive tests
export const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  const mockIntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: mockIntersectionObserver,
  });

  return mockIntersectionObserver;
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  const mockResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: mockResizeObserver,
  });

  return mockResizeObserver;
};

// Type for mock user events
export type MockUserEvent = ReturnType<typeof import('@testing-library/user-event').default.setup>;
