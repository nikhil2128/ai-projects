import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../../components/ConnectionStatus';

describe('ConnectionStatus', () => {
  it('should show "Connected" when connected and synced', () => {
    render(<ConnectionStatus connected={true} synced={true} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show "Syncing..." when connected but not synced', () => {
    render(<ConnectionStatus connected={true} synced={false} />);
    expect(screen.getByText('Syncing...')).toBeInTheDocument();
  });

  it('should show "Disconnected" when not connected', () => {
    render(<ConnectionStatus connected={false} synced={false} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should show "Disconnected" when not connected even if synced', () => {
    render(<ConnectionStatus connected={false} synced={true} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('should have correct CSS class for connected state', () => {
    const { container } = render(<ConnectionStatus connected={true} synced={true} />);
    expect(container.querySelector('.status-connected')).toBeTruthy();
  });

  it('should have correct CSS class for syncing state', () => {
    const { container } = render(<ConnectionStatus connected={true} synced={false} />);
    expect(container.querySelector('.status-syncing')).toBeTruthy();
  });

  it('should have correct CSS class for disconnected state', () => {
    const { container } = render(<ConnectionStatus connected={false} synced={false} />);
    expect(container.querySelector('.status-disconnected')).toBeTruthy();
  });
});
