import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from '@app/components/auth/RegisterForm';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockRouter = {
  push: jest.fn(),
  refresh: jest.fn(),
};

describe('RegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Rendering', () => {
    it('should render all required form fields', () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText(/nom complet/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^mot de passe$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toBeInTheDocument();
    });

    it('should render submit button with correct text', () => {
      render(<RegisterForm />);

      expect(screen.getByRole('button', { name: /créer mon compte/i })).toBeInTheDocument();
    });

    it('should render social registration buttons', () => {
      render(<RegisterForm />);

      expect(screen.getByRole('button', { name: /s'inscrire avec google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /s'inscrire avec facebook/i })).toBeInTheDocument();
    });

    it('should render login link', () => {
      render(<RegisterForm />);

      expect(screen.getByText(/déjà un compte/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /se connecter/i })).toHaveAttribute('href', '/auth/login');
    });

    it('should have accessible form controls', () => {
      render(<RegisterForm />);

      expect(screen.getByLabelText(/nom complet/i)).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText(/^email$/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/^mot de passe$/i)).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText(/confirmer le mot de passe/i)).toHaveAttribute('type', 'password');
    });

    it('should display form heading', () => {
      render(<RegisterForm />);

      expect(screen.getByRole('heading', { name: /créer un compte/i })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show validation error for short name', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'A');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/le nom doit contenir au moins 2 caractères/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email invalide/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for short password', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, '12345');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/le mot de passe doit contenir au moins 6 caractères/i)).toBeInTheDocument();
      });
    });

    it('should show validation error for non-matching passwords', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/les mots de passe ne correspondent pas/i)).toBeInTheDocument();
      });
    });

    it('should not show validation errors for valid input', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Account created', emailSent: true }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/le nom doit contenir au moins 2 caractères/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/email invalide/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/le mot de passe doit contenir au moins 6 caractères/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/les mots de passe ne correspondent pas/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call API with correct data on submit', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ message: 'Account created', emailSent: true }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
          }),
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise((resolve) => {
        resolveRequest = resolve;
      });
      (global.fetch as jest.Mock).mockReturnValue(requestPromise);

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /création du compte\.\.\./i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /création du compte\.\.\./i })).toBeDisabled();

      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ message: 'Account created', emailSent: true }),
      });
    });

    it('should show success message on successful registration', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Compte créé avec succès !',
          emailSent: true
        }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/inscription réussie/i)).toBeInTheDocument();
      });
    });

    it('should show email sent confirmation', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Compte créé avec succès !',
          emailSent: true
        }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/un email de vérification a été envoyé/i)).toBeInTheDocument();
      });
    });

    it('should show warning when email sending fails', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Compte créé avec succès !',
          emailSent: false
        }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/problème d'envoi d'email/i)).toBeInTheDocument();
      });
    });

    it('should display links to login and resend verification after success', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Compte créé avec succès !',
          emailSent: true
        }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /aller à la connexion/i })).toHaveAttribute('href', '/auth/login');
        expect(screen.getByRole('link', { name: /renvoyer l'email de vérification/i })).toHaveAttribute('href', '/auth/resend-verification');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display server error message', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Email déjà utilisé' }),
      });

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email déjà utilisé/i)).toBeInTheDocument();
      });
    });

    it('should display generic error on network failure', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<RegisterForm />);

      const nameInput = screen.getByLabelText(/nom complet/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^mot de passe$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirmer le mot de passe/i);
      const submitButton = screen.getByRole('button', { name: /créer mon compte/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Social Registration', () => {
    it('should call signIn with google provider on Google button click', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue(undefined);

      render(<RegisterForm />);

      const googleButton = screen.getByRole('button', { name: /s'inscrire avec google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/profile' });
      });
    });

    it('should call signIn with facebook provider on Facebook button click', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValue(undefined);

      render(<RegisterForm />);

      const facebookButton = screen.getByRole('button', { name: /s'inscrire avec facebook/i });
      await user.click(facebookButton);

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('facebook', { callbackUrl: '/profile' });
      });
    });

    it('should show error on social registration failure', async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockRejectedValue(new Error('OAuth error'));

      render(<RegisterForm />);

      const googleButton = screen.getByRole('button', { name: /s'inscrire avec google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/erreur de connexion/i)).toBeInTheDocument();
      });
    });

    it('should disable social buttons during loading', async () => {
      const user = userEvent.setup();
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });
      (signIn as jest.Mock).mockReturnValue(signInPromise);

      render(<RegisterForm />);

      const googleButton = screen.getByRole('button', { name: /s'inscrire avec google/i });
      await user.click(googleButton);

      expect(screen.getByRole('button', { name: /s'inscrire avec google/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /s'inscrire avec facebook/i })).toBeDisabled();

      resolveSignIn!(undefined);
    });
  });

  describe('Placeholder Text', () => {
    it('should display correct placeholder text for all fields', () => {
      render(<RegisterForm />);

      expect(screen.getByPlaceholderText(/votre nom complet/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/votre\.email@example\.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/au moins 6 caractères/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/répétez votre mot de passe/i)).toBeInTheDocument();
    });
  });
});
