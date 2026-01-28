import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileOverview from '@app/components/profile/ProfileOverview';
import { useSession } from 'next-auth/react';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('ProfileOverview', () => {
  const mockOnTabChange = jest.fn();
  const mockOnMessage = jest.fn();

  const mockProfile = {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    age: 28,
    bio: 'Software developer who loves hiking',
    location: 'Paris, France',
    profession: 'Software Engineer',
    interests: ['Hiking', 'Photography', 'Music', 'Travel'],
    photos: [
      { id: '1', url: 'https://example.com/photo1.jpg', isPrimary: true, alt: 'Photo 1', createdAt: '2024-01-01' },
      { id: '2', url: 'https://example.com/photo2.jpg', isPrimary: false, alt: 'Photo 2', createdAt: '2024-01-02' },
    ],
    gender: 'male',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15',
  };

  const mockSession = {
    data: {
      user: {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      },
    },
    status: 'authenticated',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        totalStats: { profileViews: 150, likesReceived: 45, matchesCount: 12, messagesReceived: 78 },
        dailyStats: { profileViews: 5, likesReceived: 2, matchesCount: 1, messagesReceived: 3 },
      }),
    });
  });

  describe('Rendering', () => {
    it('should render loading state when profile is null', () => {
      render(<ProfileOverview profile={null} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/chargement du profil/i)).toBeInTheDocument();
    });

    it('should render user name', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should render user age', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/28 ans/)).toBeInTheDocument();
    });

    it('should render user location', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('Paris, France')).toBeInTheDocument();
    });

    it('should render user profession', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('should render user bio', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('Software developer who loves hiking')).toBeInTheDocument();
    });

    it('should render interests', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('Hiking')).toBeInTheDocument();
      expect(screen.getByText('Photography')).toBeInTheDocument();
      expect(screen.getByText('Music')).toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
    });

    it('should render photo count', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/photos \(2\/6\)/i)).toBeInTheDocument();
    });

    it('should render main photo', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const mainPhoto = screen.getByAlt('Photo de profil');
      expect(mainPhoto).toHaveAttribute('src', 'https://example.com/photo1.jpg');
    });

    it('should show placeholder when no name', () => {
      const profileWithoutName = { ...mockProfile, name: '' };
      render(<ProfileOverview profile={profileWithoutName} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/nom non défini/i)).toBeInTheDocument();
    });

    it('should show placeholder when no bio', () => {
      const profileWithoutBio = { ...mockProfile, bio: '' };
      render(<ProfileOverview profile={profileWithoutBio} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/aucune bio définie/i)).toBeInTheDocument();
    });

    it('should show placeholder when no interests', () => {
      const profileWithoutInterests = { ...mockProfile, interests: [] };
      render(<ProfileOverview profile={profileWithoutInterests} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/aucun centre d'intérêt défini/i)).toBeInTheDocument();
    });

    it('should show placeholder when no photos', () => {
      const profileWithoutPhotos = { ...mockProfile, photos: [] };
      render(<ProfileOverview profile={profileWithoutPhotos} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/aucune photo/i)).toBeInTheDocument();
    });
  });

  describe('Profile Completion', () => {
    it('should calculate and display completion percentage', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      // Profile has all 8 fields filled, so should show 100%
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should show lower percentage for incomplete profile', () => {
      const incompleteProfile = {
        ...mockProfile,
        bio: '',
        profession: undefined,
        interests: [],
      };
      render(<ProfileOverview profile={incompleteProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      // 5 out of 8 fields = 63%
      expect(screen.getByText('63%')).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('should fetch and display statistics', async () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // profileViews
        expect(screen.getByText('45')).toBeInTheDocument();  // likesReceived
        expect(screen.getByText('12')).toBeInTheDocument();  // matchesCount
      });
    });

    it('should display photo count in stats', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      // Photo count stat
      const photoStats = screen.getAllByText('2');
      expect(photoStats.length).toBeGreaterThan(0);
    });

    it('should show loading state for stats', () => {
      // Delay the fetch response
      (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/chargement/i)).toBeInTheDocument();
    });

    it('should display daily stats comparison', async () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      await waitFor(() => {
        expect(screen.getByText(/aujourd'hui/i)).toBeInTheDocument();
        expect(screen.getByText(/5 vues/)).toBeInTheDocument();
        expect(screen.getByText(/2 likes/)).toBeInTheDocument();
        expect(screen.getByText(/1 matches/)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should call onTabChange with "edit" when clicking edit button', async () => {
      const user = userEvent.setup();
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const editButtons = screen.getAllByText(/modifier/i);
      await user.click(editButtons[0]);

      expect(mockOnTabChange).toHaveBeenCalledWith('edit');
    });

    it('should call onTabChange with "photos" when clicking manage photos', async () => {
      const user = userEvent.setup();
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const manageButton = screen.getByText(/gérer/i);
      await user.click(manageButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('photos');
    });

    it('should call onTabChange with "preferences" when clicking preferences action', async () => {
      const user = userEvent.setup();
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const preferencesButton = screen.getByText(/mes préférences/i);
      await user.click(preferencesButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('preferences');
    });

    it('should call onTabChange with "personal" when clicking personal info action', async () => {
      const user = userEvent.setup();
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const personalButton = screen.getByText(/infos personnelles/i);
      await user.click(personalButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('personal');
    });

    it('should call onTabChange with "settings" when clicking settings action', async () => {
      const user = userEvent.setup();
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const settingsButton = screen.getByText(/paramètres/i);
      await user.click(settingsButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('settings');
    });

    it('should call onTabChange with "photos" when clicking on photo stats', async () => {
      const user = userEvent.setup();
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      // Find the photos stat card and click it
      const photosStatCard = screen.getByText(/sur 6 max/i).closest('div');
      if (photosStatCard) {
        await user.click(photosStatCard);
        expect(mockOnTabChange).toHaveBeenCalledWith('photos');
      }
    });

    it('should call onTabChange when clicking "add bio" prompt', async () => {
      const user = userEvent.setup();
      const profileWithoutBio = { ...mockProfile, bio: '' };
      render(<ProfileOverview profile={profileWithoutBio} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const addBioButton = screen.getByText(/ajoutez-en une/i);
      await user.click(addBioButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('edit');
    });

    it('should call onTabChange when clicking "add interests" prompt', async () => {
      const user = userEvent.setup();
      const profileWithoutInterests = { ...mockProfile, interests: [] };
      render(<ProfileOverview profile={profileWithoutInterests} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const addInterestsButton = screen.getByText(/ajoutez vos passions/i);
      await user.click(addInterestsButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('personal');
    });

    it('should call onTabChange when clicking "add photos" button', async () => {
      const user = userEvent.setup();
      const profileWithoutPhotos = { ...mockProfile, photos: [] };
      render(<ProfileOverview profile={profileWithoutPhotos} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const addPhotosButton = screen.getByText(/ajouter des photos/i);
      await user.click(addPhotosButton);

      expect(mockOnTabChange).toHaveBeenCalledWith('photos');
    });
  });

  describe('Photos Section', () => {
    it('should display primary photo with badge', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/principale/i)).toBeInTheDocument();
    });

    it('should display photo thumbnails when more than one photo', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(1);
    });

    it('should show +N indicator when more than 4 photos', () => {
      const manyPhotos = Array.from({ length: 6 }, (_, i) => ({
        id: `${i + 1}`,
        url: `https://example.com/photo${i + 1}.jpg`,
        isPrimary: i === 0,
        alt: `Photo ${i + 1}`,
        createdAt: '2024-01-01',
      }));
      const profileWithManyPhotos = { ...mockProfile, photos: manyPhotos };

      render(<ProfileOverview profile={profileWithManyPhotos} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('+2')).toBeInTheDocument();
    });
  });

  describe('Interests Display', () => {
    it('should limit displayed interests to 8', () => {
      const manyInterests = Array.from({ length: 12 }, (_, i) => `Interest ${i + 1}`);
      const profileWithManyInterests = { ...mockProfile, interests: manyInterests };

      render(<ProfileOverview profile={profileWithManyInterests} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText('+4 autres')).toBeInTheDocument();
    });

    it('should display interest count', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/centres d'intérêt \(4\)/i)).toBeInTheDocument();
    });
  });

  describe('Quick Actions', () => {
    it('should render all quick action buttons', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/mes préférences/i)).toBeInTheDocument();
      expect(screen.getByText(/infos personnelles/i)).toBeInTheDocument();
      expect(screen.getByText(/paramètres/i)).toBeInTheDocument();
    });

    it('should display action descriptions', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByText(/critères de recherche/i)).toBeInTheDocument();
      expect(screen.getByText(/genre, profession, etc\./i)).toBeInTheDocument();
      expect(screen.getByText(/confidentialité, notifications/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have heading structure', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should have alt text for profile image', () => {
      render(<ProfileOverview profile={mockProfile} onTabChange={mockOnTabChange} onMessage={mockOnMessage} />);

      expect(screen.getByAlt('Photo de profil')).toBeInTheDocument();
    });
  });
});
