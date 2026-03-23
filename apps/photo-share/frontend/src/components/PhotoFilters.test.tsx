import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoFilters from './PhotoFilters';

describe('PhotoFilters', () => {
  it('renders filter options and selected state', async () => {
    const onSelectFilter = jest.fn();
    const user = userEvent.setup();

    render(
      <PhotoFilters
        imageUrl="/preview.jpg"
        selectedFilter="sepia"
        onSelectFilter={onSelectFilter}
      />,
    );

    expect(screen.getByText('Choose a Filter')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(11);

    await user.click(screen.getByRole('button', { name: /vintage/i }));
    expect(onSelectFilter).toHaveBeenCalledWith('vintage');
  });
});
