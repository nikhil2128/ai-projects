import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../../pages/HomePage';

const mockNavigate = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
    logout: mockLogout,
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../services/api', () => ({
  api: {
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

import { api } from '../../services/api';
const mockedApi = vi.mocked(api);

const sampleDocs = [
  {
    id: 'doc-1',
    title: 'My Document',
    authorId: 'user-1',
    sharedWith: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'doc-2',
    title: 'Shared Document',
    authorId: 'other-user',
    sharedWith: ['user-1'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.listDocuments.mockResolvedValue(sampleDocs);
  });

  function renderHomePage() {
    return render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
  }

  it('should show loading state initially', () => {
    mockedApi.listDocuments.mockImplementation(() => new Promise(() => {}));
    renderHomePage();
    expect(screen.getByText('Loading documents...')).toBeInTheDocument();
  });

  it('should show document list after loading', async () => {
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
      expect(screen.getByText('Shared Document')).toBeInTheDocument();
    });
  });

  it('should show user info', async () => {
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  it('should show Owner badge for authored documents', async () => {
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument();
    });
  });

  it('should show Shared badge for shared documents', async () => {
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('Shared')).toBeInTheDocument();
    });
  });

  it('should navigate to document on click', async () => {
    const user = userEvent.setup();
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    const docCard = screen.getByText('My Document').closest('.document-card');
    await user.click(docCard!);
    expect(mockNavigate).toHaveBeenCalledWith('/doc/doc-1');
  });

  it('should create new document', async () => {
    const user = userEvent.setup();
    mockedApi.createDocument.mockResolvedValue({
      id: 'new-doc',
      title: 'Untitled Document',
      authorId: 'user-1',
      sharedWith: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New Document'));
    await waitFor(() => {
      expect(mockedApi.createDocument).toHaveBeenCalledWith('Untitled Document');
      expect(mockNavigate).toHaveBeenCalledWith('/doc/new-doc');
    });
  });

  it('should delete document on button click with confirmation', async () => {
    const user = userEvent.setup();
    mockedApi.deleteDocument.mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete document');
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockedApi.deleteDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  it('should not delete document if confirmation is cancelled', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTitle('Delete document');
    await user.click(deleteButton);

    expect(mockedApi.deleteDocument).not.toHaveBeenCalled();
  });

  it('should filter documents by search', async () => {
    const user = userEvent.setup();
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search documents...'), 'Shared');

    expect(screen.queryByText('My Document')).not.toBeInTheDocument();
    expect(screen.getByText('Shared Document')).toBeInTheDocument();
  });

  it('should show empty state when no documents', async () => {
    mockedApi.listDocuments.mockResolvedValue([]);
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('No documents yet')).toBeInTheDocument();
    });
  });

  it('should show "No matching documents" when search has no results', async () => {
    const user = userEvent.setup();
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Search documents...'), 'zzzzz');
    expect(screen.getByText('No matching documents')).toBeInTheDocument();
  });

  it('should call logout on sign out button', async () => {
    const user = userEvent.setup();
    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Sign out'));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('should handle create document error', async () => {
    const user = userEvent.setup();
    mockedApi.createDocument.mockRejectedValue(new Error('Failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('New Document'));
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should handle load documents error', async () => {
    mockedApi.listDocuments.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHomePage();
    await waitFor(() => {
      expect(screen.queryByText('Loading documents...')).not.toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should handle delete document error', async () => {
    const user = userEvent.setup();
    mockedApi.deleteDocument.mockRejectedValue(new Error('Failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText('My Document')).toBeInTheDocument();
    });

    await user.click(screen.getByTitle('Delete document'));
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });

  it('should format timestamps correctly', async () => {
    const docsWithVariousTimes = [
      {
        ...sampleDocs[0],
        updatedAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      },
      {
        ...sampleDocs[1],
        id: 'doc-minutes',
        title: 'Minutes Ago',
        updatedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      },
    ];
    mockedApi.listDocuments.mockResolvedValue(docsWithVariousTimes);

    renderHomePage();
    await waitFor(() => {
      expect(screen.getByText(/Just now/)).toBeInTheDocument();
      expect(screen.getByText(/5m ago/)).toBeInTheDocument();
    });
  });
});
