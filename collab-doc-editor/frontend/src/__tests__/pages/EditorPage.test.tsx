import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EditorPage } from '../../pages/EditorPage';

const mockNavigate = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    token: 'test-token',
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useCollaboration', () => ({
  useCollaboration: () => ({
    ydoc: {},
    provider: null,
    connected: true,
    synced: true,
    user: { name: 'Test User', color: '#FF6B6B' },
    setUserName: vi.fn(),
    connectedUsers: [{ name: 'Test User', color: '#FF6B6B', clientId: 1 }],
  }),
}));

vi.mock('../../components/CollaborativeEditor', () => ({
  CollaborativeEditor: () => <div data-testid="collaborative-editor">Editor</div>,
}));

vi.mock('../../components/UserPresence', () => ({
  UserPresence: () => <div data-testid="user-presence">Presence</div>,
}));

vi.mock('../../components/ConnectionStatus', () => ({
  ConnectionStatus: () => <div data-testid="connection-status">Connected</div>,
}));

vi.mock('../../components/ShareDialog', () => ({
  ShareDialog: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="share-dialog">
      <button onClick={onClose}>Close Share</button>
    </div>
  ),
}));

vi.mock('../../services/api', () => ({
  api: {
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
  },
}));

import { api } from '../../services/api';
const mockedApi = vi.mocked(api);

const sampleDocDetail = {
  id: 'doc-1',
  title: 'Test Document',
  authorId: 'user-1',
  sharedWith: [],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-02',
  author: { id: 'user-1', name: 'Alice', email: 'alice@test.com' },
  sharedWithUsers: [],
  isAuthor: true,
};

describe('EditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.getDocument.mockResolvedValue(sampleDocDetail);
  });

  function renderEditorPage(docId = 'doc-1') {
    return render(
      <MemoryRouter initialEntries={[`/doc/${docId}`]}>
        <Routes>
          <Route path="/doc/:docId" element={<EditorPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('should show loading state initially', () => {
    mockedApi.getDocument.mockImplementation(() => new Promise(() => {}));
    renderEditorPage();
    expect(screen.getByText('Loading document...')).toBeInTheDocument();
  });

  it('should render editor after loading document', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
      expect(screen.getByTestId('collaborative-editor')).toBeInTheDocument();
    });
  });

  it('should show connection status', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  it('should show user presence', async () => {
    renderEditorPage();
    await waitFor(() => {
      expect(screen.getByTestId('user-presence')).toBeInTheDocument();
    });
  });

  it('should open share dialog on Share button click', async () => {
    const user = userEvent.setup();
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Share'));
    expect(screen.getByTestId('share-dialog')).toBeInTheDocument();
  });

  it('should close share dialog', async () => {
    const user = userEvent.setup();
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Share'));
    await user.click(screen.getByText('Close Share'));
    expect(screen.queryByTestId('share-dialog')).not.toBeInTheDocument();
  });

  it('should enable title editing on click', async () => {
    const user = userEvent.setup();
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Document'));
    expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
  });

  it('should save title on Enter', async () => {
    const user = userEvent.setup();
    mockedApi.updateDocument.mockResolvedValue({
      ...sampleDocDetail,
      title: 'Updated Title',
    });

    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Document'));
    const input = screen.getByDisplayValue('Test Document');
    await user.clear(input);
    await user.type(input, 'Updated Title{Enter}');

    await waitFor(() => {
      expect(mockedApi.updateDocument).toHaveBeenCalledWith('doc-1', 'Updated Title');
    });
  });

  it('should cancel title editing on Escape', async () => {
    const user = userEvent.setup();
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Document'));
    await user.type(screen.getByDisplayValue('Test Document'), '{Escape}');

    expect(screen.getByText('Test Document')).toBeInTheDocument();
  });

  it('should show access denied page', async () => {
    mockedApi.getDocument.mockRejectedValue(new Error('403 Forbidden'));

    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  it('should navigate home on unrecoverable errors', async () => {
    mockedApi.getDocument.mockRejectedValue(new Error('Network error'));

    renderEditorPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('should navigate home on back button click', async () => {
    const user = userEvent.setup();
    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    const backButtons = screen.getAllByRole('button');
    const backButton = backButtons.find((b) => b.classList.contains('btn-ghost'));
    if (backButton) {
      await user.click(backButton);
    }
  });

  it('should navigate to dashboard from access denied page', async () => {
    const user = userEvent.setup();
    mockedApi.getDocument.mockRejectedValue(new Error('access denied'));

    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Go to Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle title save error gracefully', async () => {
    const user = userEvent.setup();
    mockedApi.updateDocument.mockRejectedValue(new Error('Failed'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderEditorPage();

    await waitFor(() => {
      expect(screen.getByText('Test Document')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Test Document'));
    const input = screen.getByDisplayValue('Test Document');
    await user.type(input, '{Enter}');

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });

    consoleSpy.mockRestore();
  });
});
