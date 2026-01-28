import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotosManager from '@app/components/profile/PhotosManager';

// Mock fetch
global.fetch = jest.fn();

// Mock Cloudinary widget
const mockCloudinaryWidget = {
  open: jest.fn(),
};

const mockCloudinaryCreateUploadWidget = jest.fn(() => mockCloudinaryWidget);

// Mock window.cloudinary
Object.defineProperty(window, 'cloudinary', {
  writable: true,
  value: {
    createUploadWidget: mockCloudinaryCreateUploadWidget,
  },
});

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('PhotosManager', () => {
  const mockOnMessage = jest.fn();
  const mockPhotos = [
    { id: '1', url: 'https://example.com/photo1.jpg', isPrimary: true, alt: 'Photo 1', createdAt: '2024-01-01' },
    { id: '2', url: 'https://example.com/photo2.jpg', isPrimary: false, alt: 'Photo 2', createdAt: '2024-01-02' },
    { id: '3', url: 'https://example.com/photo3.jpg', isPrimary: false, alt: 'Photo 3', createdAt: '2024-01-03' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();

    // Default mock for loading photos from API
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/profile/photos') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ photos: mockPhotos }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Set environment variables
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'test-cloud';
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = 'test-preset';
  });

  describe('Rendering', () => {
    it('should render the component header with photo count', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      expect(screen.getByText(/mes photos/i)).toBeInTheDocument();
      expect(screen.getByText(/3\/6/)).toBeInTheDocument();
    });

    it('should display all photos in grid', async () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images.length).toBeGreaterThanOrEqual(3);
      });
    });

    it('should mark primary photo with badge', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      expect(screen.getByText(/principale/i)).toBeInTheDocument();
    });

    it('should display empty state when no photos', () => {
      render(<PhotosManager photos={[]} onMessage={mockOnMessage} />);

      expect(screen.getByText(/aucune photo ajoutée/i)).toBeInTheDocument();
      expect(screen.getByText(/commencez par ajouter quelques photos/i)).toBeInTheDocument();
    });

    it('should display upload button when under photo limit', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      expect(screen.getByText(/ajouter des photos/i)).toBeInTheDocument();
    });

    it('should display limit warning when at 6 photos', () => {
      const sixPhotos = Array.from({ length: 6 }, (_, i) => ({
        id: `${i + 1}`,
        url: `https://example.com/photo${i + 1}.jpg`,
        isPrimary: i === 0,
        alt: `Photo ${i + 1}`,
        createdAt: '2024-01-01',
      }));

      render(<PhotosManager photos={sixPhotos} onMessage={mockOnMessage} />);

      expect(screen.getByText(/limite de photos atteinte/i)).toBeInTheDocument();
    });

    it('should display photo tips section', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      expect(screen.getByText(/conseils pour de meilleures photos/i)).toBeInTheDocument();
    });

    it('should display photo numbers', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Upload Functionality', () => {
    it('should open Cloudinary widget on upload button click', async () => {
      const user = userEvent.setup();
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const uploadButton = screen.getByText(/ajouter des photos/i);
      await user.click(uploadButton);

      expect(mockCloudinaryCreateUploadWidget).toHaveBeenCalled();
      expect(mockCloudinaryWidget.open).toHaveBeenCalled();
    });

    it('should configure widget with correct options', async () => {
      const user = userEvent.setup();
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const uploadButton = screen.getByText(/ajouter des photos/i);
      await user.click(uploadButton);

      expect(mockCloudinaryCreateUploadWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          cloudName: 'test-cloud',
          uploadPreset: 'test-preset',
          maxFiles: 3, // 6 - 3 existing photos
          maxFileSize: 10000000,
          cropping: true,
        }),
        expect.any(Function)
      );
    });

    it('should show loading state when uploading', async () => {
      const user = userEvent.setup();

      // Capture the callback to simulate upload events
      let widgetCallback: Function;
      mockCloudinaryCreateUploadWidget.mockImplementation((options, callback) => {
        widgetCallback = callback;
        return mockCloudinaryWidget;
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const uploadButton = screen.getByText(/ajouter des photos/i);
      await user.click(uploadButton);

      // Simulate upload starting
      act(() => {
        widgetCallback!(null, { event: 'queues-start' });
      });

      expect(screen.getByText(/upload en cours/i)).toBeInTheDocument();
    });

    it('should save photo to database on successful upload', async () => {
      const user = userEvent.setup();

      let widgetCallback: Function;
      mockCloudinaryCreateUploadWidget.mockImplementation((options, callback) => {
        widgetCallback = callback;
        return mockCloudinaryWidget;
      });

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url === '/api/profile/photos' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              id: '4',
              url: 'https://example.com/new-photo.jpg',
              isPrimary: false,
            }),
          });
        }
        if (url === '/api/profile/photos') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: mockPhotos }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const uploadButton = screen.getByText(/ajouter des photos/i);
      await user.click(uploadButton);

      // Simulate successful upload
      await act(async () => {
        widgetCallback!(null, {
          event: 'success',
          info: { secure_url: 'https://example.com/new-photo.jpg' },
        });
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/profile/photos', expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('https://example.com/new-photo.jpg'),
        }));
      });

      expect(mockOnMessage).toHaveBeenCalledWith('Photo ajoutée avec succès !', 'success');
    });

    it('should show error message when Cloudinary is not loaded', async () => {
      const user = userEvent.setup();

      // Temporarily remove cloudinary
      const originalCloudinary = window.cloudinary;
      Object.defineProperty(window, 'cloudinary', {
        writable: true,
        value: undefined,
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      // Wait for component to detect cloudinary is not loaded
      await waitFor(() => {
        expect(screen.getByText(/chargement/i)).toBeInTheDocument();
      });

      // Restore cloudinary
      Object.defineProperty(window, 'cloudinary', {
        writable: true,
        value: originalCloudinary,
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should show confirmation dialog before deleting', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      // Find and click delete button for non-primary photo
      const deleteButtons = screen.getAllByTitle(/supprimer cette photo/i);
      await user.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Êtes-vous sûr de vouloir supprimer cette photo ?');
      confirmSpy.mockRestore();
    });

    it('should call delete API when confirmed', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/api/profile/photos/') && options?.method === 'DELETE') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url === '/api/profile/photos') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: mockPhotos }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const deleteButtons = screen.getAllByTitle(/supprimer cette photo/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/profile/photos/'),
          expect.objectContaining({ method: 'DELETE' })
        );
      });

      expect(mockOnMessage).toHaveBeenCalledWith('Photo supprimée', 'success');
    });

    it('should not delete when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const deleteButtons = screen.getAllByTitle(/supprimer cette photo/i);
      await user.click(deleteButtons[0]);

      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/api/profile/photos/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should show error message on delete failure', async () => {
      const user = userEvent.setup();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/api/profile/photos/') && options?.method === 'DELETE') {
          return Promise.resolve({ ok: false });
        }
        if (url === '/api/profile/photos') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: mockPhotos }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const deleteButtons = screen.getAllByTitle(/supprimer cette photo/i);
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockOnMessage).toHaveBeenCalledWith('Erreur lors de la suppression', 'error');
      });
    });
  });

  describe('Set Primary Photo', () => {
    it('should display set primary button for non-primary photos', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const setPrimaryButtons = screen.getAllByTitle(/définir comme photo principale/i);
      // Should have 2 buttons (for photos 2 and 3, not for the primary photo)
      expect(setPrimaryButtons.length).toBe(2);
    });

    it('should call API to set primary photo', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/api/profile/photos/') && options?.method === 'PUT') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        }
        if (url === '/api/profile/photos') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: mockPhotos }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const setPrimaryButtons = screen.getAllByTitle(/définir comme photo principale/i);
      await user.click(setPrimaryButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/profile/photos/'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ isPrimary: true }),
          })
        );
      });

      expect(mockOnMessage).toHaveBeenCalledWith('Photo principale mise à jour', 'success');
    });

    it('should show error message on set primary failure', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/api/profile/photos/') && options?.method === 'PUT') {
          return Promise.resolve({ ok: false });
        }
        if (url === '/api/profile/photos') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ photos: mockPhotos }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const setPrimaryButtons = screen.getAllByTitle(/définir comme photo principale/i);
      await user.click(setPrimaryButtons[0]);

      await waitFor(() => {
        expect(mockOnMessage).toHaveBeenCalledWith('Erreur lors de la mise à jour', 'error');
      });
    });
  });

  describe('Photo Limit', () => {
    it('should not show upload button when at 6 photos', () => {
      const sixPhotos = Array.from({ length: 6 }, (_, i) => ({
        id: `${i + 1}`,
        url: `https://example.com/photo${i + 1}.jpg`,
        isPrimary: i === 0,
        alt: `Photo ${i + 1}`,
        createdAt: '2024-01-01',
      }));

      render(<PhotosManager photos={sixPhotos} onMessage={mockOnMessage} />);

      expect(screen.queryByText(/ajouter des photos/i)).not.toBeInTheDocument();
    });

    it('should calculate remaining slots correctly', async () => {
      const user = userEvent.setup();
      const fourPhotos = mockPhotos.concat([{
        id: '4',
        url: 'https://example.com/photo4.jpg',
        isPrimary: false,
        alt: 'Photo 4',
        createdAt: '2024-01-04',
      }]);

      render(<PhotosManager photos={fourPhotos} onMessage={mockOnMessage} />);

      const uploadButton = screen.getByText(/ajouter des photos/i);
      await user.click(uploadButton);

      expect(mockCloudinaryCreateUploadWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          maxFiles: 2, // 6 - 4 existing photos
        }),
        expect.any(Function)
      );
    });
  });

  describe('Accessibility', () => {
    it('should have alt text for all images', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const images = screen.getAllByRole('img');
      images.forEach((img) => {
        expect(img).toHaveAttribute('alt');
      });
    });

    it('should have title attributes on action buttons', () => {
      render(<PhotosManager photos={mockPhotos} onMessage={mockOnMessage} />);

      const deleteButtons = screen.getAllByTitle(/supprimer cette photo/i);
      const setPrimaryButtons = screen.getAllByTitle(/définir comme photo principale/i);

      expect(deleteButtons.length).toBeGreaterThan(0);
      expect(setPrimaryButtons.length).toBeGreaterThan(0);
    });
  });
});
