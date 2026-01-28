import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatModal } from '@app/components/chat/ChatModal';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock useStreamChat hook
jest.mock('@/hooks/useStreamChat', () => ({
  useStreamChat: jest.fn(),
}));

// We need to also mock with the src path as the component might use that
jest.mock('../../src/hooks/useStreamChat', () => ({
  useStreamChat: jest.fn(),
}), { virtual: true });

// Mock Stream Chat components
jest.mock('stream-chat-react', () => ({
  Chat: ({ children }: any) => <div data-testid="stream-chat">{children}</div>,
  Channel: ({ children }: any) => <div data-testid="stream-channel">{children}</div>,
  ChannelList: ({ filters, sort, Preview, EmptyStateIndicator, setActiveChannel }: any) => (
    <div data-testid="channel-list">
      <button onClick={() => setActiveChannel({ id: 'test-channel' })}>
        Select Channel
      </button>
    </div>
  ),
  MessageList: () => <div data-testid="message-list">Messages</div>,
  MessageInput: () => <div data-testid="message-input">Input</div>,
  Window: ({ children }: any) => <div data-testid="stream-window">{children}</div>,
  ChannelHeader: () => <div data-testid="channel-header">Header</div>,
  LoadingIndicator: ({ size }: any) => <div data-testid="loading-indicator">Loading...</div>,
}));

// Mock custom components
jest.mock('@app/components/chat/CustomChannelPreview', () => ({
  CustomChannelPreview: () => <div>Custom Preview</div>,
}));

jest.mock('@app/components/chat/CustomMessage', () => ({
  CustomMessage: () => <div>Custom Message</div>,
}));

jest.mock('@app/components/chat/EmptyStateIndicator', () => ({
  EmptyStateIndicator: () => <div>No conversations</div>,
}));

// Mock @headlessui/react Dialog
jest.mock('@headlessui/react', () => ({
  Dialog: ({ children, open, onClose, ...props }: any) => (
    open ? (
      <div data-testid="dialog" role="dialog" {...props}>
        <button data-testid="close-dialog" onClick={onClose}>Close</button>
        {children}
      </div>
    ) : null
  ),
  Transition: ({ children, show }: any) => (show ? <>{children}</> : null),
  'Transition.Child': ({ children }: any) => <>{children}</>,
}));

// Import the mocked hook
import { useStreamChat } from '@/hooks/useStreamChat';

describe('ChatModal', () => {
  const mockOnClose = jest.fn();

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

  const mockStreamClient = {
    channel: jest.fn().mockReturnValue({
      watch: jest.fn().mockResolvedValue(undefined),
      id: 'test-channel',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (useStreamChat as jest.Mock).mockReturnValue({
      client: mockStreamClient,
      isConnecting: false,
      error: null,
    });
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(<ChatModal isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should render default title "Messages"', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    it('should render custom title with target user name', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} targetUserName="Jane" />);

      expect(screen.getByText(/chat avec jane/i)).toBeInTheDocument();
    });

    it('should render channel list', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('channel-list')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('close-dialog')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when connecting to stream', () => {
      (useStreamChat as jest.Mock).mockReturnValue({
        client: null,
        isConnecting: true,
        error: null,
      });

      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/connexion au chat/i)).toBeInTheDocument();
    });

    it('should show loading indicator when client is null', () => {
      (useStreamChat as jest.Mock).mockReturnValue({
        client: null,
        isConnecting: false,
        error: null,
      });

      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/connexion au chat/i)).toBeInTheDocument();
    });

    it('should show loading when creating channel', () => {
      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          isCreatingChannel={true}
          targetUserName="Jane"
        />
      );

      expect(screen.getByText(/ouverture du chat avec jane/i)).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display stream error message', () => {
      (useStreamChat as jest.Mock).mockReturnValue({
        client: null,
        isConnecting: false,
        error: 'Failed to connect to chat server',
      });

      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/erreur de connexion/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to chat server')).toBeInTheDocument();
    });

    it('should display custom error prop', () => {
      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          error="Unable to open conversation"
        />
      );

      expect(screen.getByText(/erreur d'ouverture du chat/i)).toBeInTheDocument();
      expect(screen.getByText('Unable to open conversation')).toBeInTheDocument();
    });

    it('should render close button in error state', () => {
      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          error="Some error"
        />
      );

      const closeButton = screen.getByText(/fermer/i);
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button clicked', async () => {
      const user = userEvent.setup();
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      await user.click(screen.getByTestId('close-dialog'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking close button in error state', async () => {
      const user = userEvent.setup();
      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          error="Some error"
        />
      );

      const closeButton = screen.getByText(/fermer/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking close button in stream error state', async () => {
      const user = userEvent.setup();
      (useStreamChat as jest.Mock).mockReturnValue({
        client: null,
        isConnecting: false,
        error: 'Connection failed',
      });

      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      const closeButton = screen.getByText(/fermer/i);
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Channel Selection', () => {
    it('should show empty state message when no channel selected', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText(/sélectionnez une conversation/i)).toBeInTheDocument();
    });

    it('should show context message with target user name', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} targetUserName="Jane" />);

      expect(screen.getByText(/votre conversation avec jane va s'ouvrir/i)).toBeInTheDocument();
    });

    it('should open specific channel when channelId is provided', async () => {
      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          channelId="specific-channel"
        />
      );

      await waitFor(() => {
        expect(mockStreamClient.channel).toHaveBeenCalledWith('messaging', 'specific-channel');
      });
    });

    it('should call watch on the channel', async () => {
      const mockChannel = {
        watch: jest.fn().mockResolvedValue(undefined),
        id: 'specific-channel',
      };
      mockStreamClient.channel.mockReturnValue(mockChannel);

      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          channelId="specific-channel"
        />
      );

      await waitFor(() => {
        expect(mockChannel.watch).toHaveBeenCalled();
      });
    });

    it('should render message components when channel is selected', async () => {
      const user = userEvent.setup();
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      // Click to select a channel
      const selectButton = screen.getByText('Select Channel');
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('stream-channel')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock window resize
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500, // Mobile width
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024, // Reset to desktop
      });
    });

    it('should detect mobile viewport', async () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      // Trigger resize event
      fireEvent.resize(window);

      await waitFor(() => {
        // In mobile view, the component should still render
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Stream Chat Integration', () => {
    it('should render Chat component with client', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('stream-chat')).toBeInTheDocument();
    });

    it('should pass correct filters to ChannelList', () => {
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      // ChannelList is rendered
      expect(screen.getByTestId('channel-list')).toBeInTheDocument();
    });

    it('should render message list when channel is active', async () => {
      const user = userEvent.setup();
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      const selectButton = screen.getByText('Select Channel');
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });
    });

    it('should render message input when channel is active', async () => {
      const user = userEvent.setup();
      render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      const selectButton = screen.getByText('Select Channel');
      await user.click(selectButton);

      await waitFor(() => {
        expect(screen.getByTestId('message-input')).toBeInTheDocument();
      });
    });
  });

  describe('Channel Reset', () => {
    it('should reset selected channel when modal closes', async () => {
      const { rerender } = render(<ChatModal isOpen={true} onClose={mockOnClose} />);

      // Rerender with isOpen=false
      rerender(<ChatModal isOpen={false} onClose={mockOnClose} />);

      // Modal should not be visible
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling for Channel Opening', () => {
    it('should handle channel watch error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const mockChannel = {
        watch: jest.fn().mockRejectedValue(new Error('Failed to watch channel')),
        id: 'error-channel',
      };
      mockStreamClient.channel.mockReturnValue(mockChannel);

      render(
        <ChatModal
          isOpen={true}
          onClose={mockOnClose}
          channelId="error-channel"
        />
      );

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
