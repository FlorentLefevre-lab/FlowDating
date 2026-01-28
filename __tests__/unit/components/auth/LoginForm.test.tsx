import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@app/components/auth/LoginForm';
import { signIn, getProviders } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getProviders: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (getProviders as jest.Mock).mockResolvedValue({
      credentials: { id: 'credentials', name: 'Credentials' },
      google: { id: 'google', name: 'Google' },
      facebook: { id: 'facebook', name: 'Facebook' },
    });
  });

  describe('Rendering', () => {
    it('should render email and password fields', () => {
      render(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    });

    it('should render submit button with correct text', () => {
      render(<LoginForm />);

      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });

    it('should render social login buttons', () => {
      render(<LoginForm />);

      expect(screen.getByRole('button', { name: /continuer avec google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuer avec facebook/i })).toBeInTheDocument();
    });

    it('should render registration link', () => {
      render(<LoginForm />);

      expect(screen.getByText(/pas encore de compte/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /s'inscrire/i })).toHaveAttribute('href', '/auth/register');
    });

    it('should render forgot password link', () => {
      render(<LoginForm />);

      expect(screen.getByRole('link', { name: /mot de passe oublié/i })).toHaveAttribute('href', '/auth/forgot-password');
    });

    it('should have accessible form controls', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Validation', () => {
    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email invalide/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for empty password', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'valid@email.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/mot de passe requis/i)).toBeInTheDocument();
      });
    });

    it('should not show validation errors for valid input', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'valid@email.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/email invalide/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/mot de passe requis/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call signIn with credentials on submit', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('credentials', {
          email: 'test@example.com',
          password: 'password123',
          redirect: false,
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      (signIn as jest.Mock).mockReturnValue(signInPromise);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /connexion\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /connexion\.\.\./i })).toBeDisabled();

      resolveSignIn!({ ok: true, error: null });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /se connecter/i })).not.toBeDisabled();
      });
    });

    it('should redirect to dashboard on successful login', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ ok: true, error: null });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
        expect(mockRouter.refresh).toHaveBeenCalled();
      });
    });

    it('should display server error message on failed login', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue({ ok: false, error: 'CredentialsSignin' });

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email ou mot de passe incorrect/i)).toBeInTheDocument();
      });
    });

    it('should display generic error on exception', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
      });
    });
  });

  describe('Social Login', () => {
    it('should call signIn with google provider on Google button click', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue(undefined);

      render(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continuer avec google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/profile' });
      });
    });

    it('should call signIn with facebook provider on Facebook button click', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue(undefined);

      render(<LoginForm />);

      const facebookButton = screen.getByRole('button', { name: /continuer avec facebook/i });
      await user.click(facebookButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('facebook', { callbackUrl: '/profile' });
      });
    });

    it('should show loading state during social login', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      (signIn as jest.Mock).mockReturnValue(signInPromise);

      render(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continuer avec google/i });
      await user.click(googleButton);

      // During loading, buttons should be disabled
      expect(screen.getByRole('button', { name: /continuer avec google/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /continuer avec facebook/i })).toBeDisabled();

      resolveSignIn!(undefined);
    });

    it('should show error on social login failure', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockRejectedValue(new Error('OAuth error'));

      render(<LoginForm />);

      const googleButton = screen.getByRole('button', { name: /continuer avec google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/erreur de connexion/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Behavior', () => {
    it('should disable inputs during loading', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      (signIn as jest.Mock).mockReturnValue(signInPromise);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /se connecter/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();

      resolveSignIn!({ ok: true, error: null });
    });

    it('should have correct placeholder text', () => {
      render(<LoginForm />);

      expect(screen.getByPlaceholderText(/votre\.email@example\.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/votre mot de passe/i)).toBeInTheDocument();
    });
  });
});
