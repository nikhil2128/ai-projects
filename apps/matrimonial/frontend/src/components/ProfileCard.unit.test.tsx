import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileCard from './ProfileCard';
import { sampleProfile } from '../test/fixtures';

describe('ProfileCard', () => {
  function renderCard(props: Partial<ComponentProps<typeof ProfileCard>> = {}) {
    const onToggleShortlist = vi.fn();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={(
              <ProfileCard
                profile={sampleProfile}
                onToggleShortlist={onToggleShortlist}
                isShortlisted
                {...props}
              />
            )}
          />
          <Route path="/profile/:userId" element={<div>Profile page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    return { onToggleShortlist };
  }

  it('renders fallback identity details and recommendation metadata', () => {
    renderCard();

    expect(screen.getByText('AV')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('Why recommended')).toBeInTheDocument();
    expect(screen.getByText('Shared values')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('navigates to the profile detail page when the card is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByText(/Asha Verma/i));

    expect(await screen.findByText('Profile page')).toBeInTheDocument();
  });

  it('toggles shortlist without navigating', async () => {
    const user = userEvent.setup();
    const { onToggleShortlist } = renderCard();

    await user.click(screen.getByTitle('Remove from shortlist'));

    expect(onToggleShortlist).toHaveBeenCalledWith('user-1');
    expect(screen.queryByText('Profile page')).not.toBeInTheDocument();
  });

  it('renders image-based cards and lower match styles', () => {
    renderCard({
      profile: {
        ...sampleProfile,
        photoUrl: 'https://example.com/photo.jpg',
        matchPercentage: 45,
        recommendationReasons: [],
        interests: ['Travel'],
      },
      isShortlisted: false,
    });

    expect(screen.getByRole('img', { name: 'Asha' })).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.queryByText('Why recommended')).not.toBeInTheDocument();
  });
});
