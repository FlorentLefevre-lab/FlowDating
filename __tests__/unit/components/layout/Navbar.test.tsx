import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '@app/components/layout/Navbar';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock ChatNavItem component
jest.mock('@app/components/layout/ChatNavItem', () => ({
  ChatNavItem: () => <div data-testid="chat-nav-item">Chat</div>,
}));

// Mock fetch
global.fetch = jest.fn();

describe('Navbar', () => {
  const mockRouter = {
    push: jest.fn(),
    refresh: jest.fn(),
  };

  const mockSession = {
    data: {
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    status: 'authenticated',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue('/home');
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    // Mock window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        replace: jest.fn(),
        href: '',
        hostname: 'localhost',
      },
    });

    // Mock localStorage and sessionStorage
    const mockStorage: { [key: string]: string } = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        clear: jest.fn(),
        getItem: jest.fn((key: string) => mockStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
        removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
      },
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: {
        clear: jest.fn(),
        getItem: jest.fn((key: string) => mockStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => { mockStorage[key] = value; }),
        removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
      },
    });
  });

  describe('Visibility Conditions', () => {
    it('should not render on landing page', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<Navbar />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should not render on login page', () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/login');
      render(<Navbar />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should not render on register page', () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/register');
      render(<Navbar />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should not render on error page', () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/error');
      render(<Navbar />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should not render on verify-email page', () => {
      (usePathname as jest.Mock).mockReturnValue('/auth/verify-email');
      render(<Navbar />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should not render when unauthenticated', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null, status: 'unauthenticated' });
      render(<Navbar />);

      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('should render loading state when session is loading', () => {
      (useSession as jest.Mock).mockReturnValue({ data: null, status: 'loading' });
      render(<Navbar />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should render navbar when authenticated on allowed page', () => {
      render(<Navbar />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  describe('Navigation Links', () => {
    it('should render logo with home link', () => {
      render(<Navbar />);

      const logoLink = screen.getByText('Flow Dating').closest('a');
      expect(logoLink).toHaveAttribute('href', '/home');
    });

    it('should render home link', () => {
      render(<Navbar />);

      expect(screen.getByRole('link', { name: /accueil/i })).toHaveAttribute('href', '/home');
    });

    it('should render discover link', () => {
      render(<Navbar />);

      expect(screen.getByRole('link', { name: /découverte/i })).toHaveAttribute('href', '/discover');
    });

    it('should render matches link with badge', () => {
      render(<Navbar />);

      const matchesLink = screen.getByRole('link', { name: /matchs/i });
      expect(matchesLink).toHaveAttribute('href', '/matches');
      expect(screen.getByText('3')).toBeInTheDocument(); // Badge count
    });

    it('should render chat navigation', () => {
      render(<Navbar />);

      expect(screen.getByTestId('chat-nav-item')).toBeInTheDocument();
    });

    it('should highlight active navigation link', () => {
      (usePathname as jest.Mock).mockReturnValue('/discover');
      render(<Navbar />);

      const discoverLink = screen.getByRole('link', { name: /découverte/i });
      expect(discoverLink).toHaveClass('text-pink-600');
    });
  });

  describe('User Menu', () => {
    it('should display user initial in avatar', () => {
      render(<Navbar />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should display user name', () => {
      render(<Navbar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should toggle user menu on click', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      expect(screen.getByText(/mon profil/i)).toBeInTheDocument();
    });

    it('should render menu items when open', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      expect(screen.getByRole('link', { name: /mon profil/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /paramètres/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /premium/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /aide/i })).toBeInTheDocument();
    });

    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      expect(screen.getByText(/mon profil/i)).toBeInTheDocument();

      // Click outside (on the overlay)
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        await user.click(overlay);
      }

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /paramètres/i })).not.toBeInTheDocument();
      });
    });

    it('should close menu when menu item is clicked', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const profileLink = screen.getByRole('link', { name: /mon profil/i });
      await user.click(profileLink);

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /paramètres/i })).not.toBeInTheDocument();
      });
    });

    it('should display user member status', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      expect(screen.getByText(/membre flow dating/i)).toBeInTheDocument();
    });

    it('should display premium badge', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });
  });

  describe('Logout Functionality', () => {
    it('should call secure signOut when clicking logout', async () => {
      const user = userEvent.setup();
      (signOut as jest.Mock).mockResolvedValue(undefined);

      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', expect.any(Object));
        expect(signOut).toHaveBeenCalled();
      });
    });

    it('should show loading state during logout', async () => {
      const user = userEvent.setup();
      let resolveSignOut: () => void;
      const signOutPromise = new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      });
      (signOut as jest.Mock).mockReturnValue(signOutPromise);

      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
      await user.click(logoutButton);

      expect(screen.getByText(/déconnexion sécurisée/i)).toBeInTheDocument();

      resolveSignOut!();
    });

    it('should clear localStorage on logout', async () => {
      const user = userEvent.setup();
      (signOut as jest.Mock).mockResolvedValue(undefined);

      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(localStorage.clear).toHaveBeenCalled();
        expect(sessionStorage.clear).toHaveBeenCalled();
      });
    });

    it('should redirect to home after logout', async () => {
      const user = userEvent.setup();
      (signOut as jest.Mock).mockResolvedValue(undefined);

      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(window.location.replace).toHaveBeenCalledWith('/');
      });
    });

    it('should disable logout button during logout process', async () => {
      const user = userEvent.setup();
      let resolveSignOut: () => void;
      const signOutPromise = new Promise<void>((resolve) => {
        resolveSignOut = resolve;
      });
      (signOut as jest.Mock).mockReturnValue(signOutPromise);

      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
      await user.click(logoutButton);

      const logoutButtonLoading = screen.getByRole('button', { name: /déconnexion sécurisée/i });
      expect(logoutButtonLoading).toBeDisabled();

      resolveSignOut!();
    });

    it('should handle logout error gracefully', async () => {
      const user = userEvent.setup();
      (signOut as jest.Mock).mockRejectedValue(new Error('Logout failed'));

      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
      await user.click(logoutButton);

      await waitFor(() => {
        // Should still redirect even on error
        expect(window.location.href).toBe('/');
      });
    });
  });

  describe('Mobile Menu', () => {
    it('should render mobile logout button', () => {
      render(<Navbar />);

      // The mobile button is visible but hidden on md+ screens
      const buttons = screen.getAllByTitle(/se déconnecter/i);
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should trigger logout from mobile button', async () => {
      const user = userEvent.setup();
      (signOut as jest.Mock).mockResolvedValue(undefined);

      render(<Navbar />);

      const mobileLogoutButton = screen.getByTitle(/se déconnecter/i);
      await user.click(mobileLogoutButton);

      await waitFor(() => {
        expect(signOut).toHaveBeenCalled();
      });
    });
  });

  describe('Avatar Display', () => {
    it('should display first letter of user name', () => {
      render(<Navbar />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should display U when no name provided', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        status: 'authenticated',
      });

      render(<Navbar />);

      expect(screen.getByText('U')).toBeInTheDocument();
    });

    it('should display "Utilisateur" when no name', () => {
      (useSession as jest.Mock).mockReturnValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        status: 'authenticated',
      });

      render(<Navbar />);

      expect(screen.getByText('Utilisateur')).toBeInTheDocument();
    });
  });

  describe('Chevron Animation', () => {
    it('should rotate chevron when menu is open', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      // Find the chevron SVG
      const chevron = menuButton?.querySelector('svg.rotate-180');
      expect(chevron).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have navigation landmark', () => {
      render(<Navbar />);

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have accessible links', () => {
      render(<Navbar />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link).toHaveAccessibleName();
      });
    });

    it('should have accessible buttons', async () => {
      const user = userEvent.setup();
      render(<Navbar />);

      const menuButton = screen.getByText('John Doe').closest('button');
      await user.click(menuButton!);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        // Buttons should either have text content or aria-label
        expect(button.textContent || button.getAttribute('aria-label') || button.getAttribute('title')).toBeTruthy();
      });
    });
  });

  describe('Route-specific Styling', () => {
    it('should highlight home link on /home', () => {
      (usePathname as jest.Mock).mockReturnValue('/home');
      render(<Navbar />);

      const homeLink = screen.getByRole('link', { name: /accueil/i });
      expect(homeLink).toHaveClass('text-pink-600');
    });

    it('should highlight discover link on /discover', () => {
      (usePathname as jest.Mock).mockReturnValue('/discover');
      render(<Navbar />);

      const discoverLink = screen.getByRole('link', { name: /découverte/i });
      expect(discoverLink).toHaveClass('text-pink-600');
    });

    it('should highlight matches link on /matches', () => {
      (usePathname as jest.Mock).mockReturnValue('/matches');
      render(<Navbar />);

      const matchesLink = screen.getByRole('link', { name: /matchs/i });
      expect(matchesLink).toHaveClass('text-pink-600');
    });
  });
});
