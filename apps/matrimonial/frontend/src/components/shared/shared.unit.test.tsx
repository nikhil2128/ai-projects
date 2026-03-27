import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Heart, MapPin } from 'lucide-react';
import { DetailRow } from './DetailRow';
import { EmptyState } from './EmptyState';
import { ErrorAlert } from './ErrorAlert';
import { InfoCard } from './InfoCard';
import { LoadingSpinner } from './LoadingSpinner';
import { Modal } from './Modal';
import { Section } from './Section';
import { SelectionGroup } from './SelectionGroup';
import { StepIndicator } from './StepIndicator';

describe('shared components', () => {
  it('renders loading states, cards, and empty content blocks', () => {
    const { rerender } = render(<LoadingSpinner />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    rerender(<LoadingSpinner fullScreen size="lg" />);
    expect(document.querySelector('.min-h-screen')).toBeInTheDocument();

    rerender(<ErrorAlert message="" />);
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();

    rerender(<ErrorAlert message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    rerender(
      <EmptyState
        icon={<Heart data-testid="empty-icon" />}
        title="Nothing here"
        subtitle="Try again later"
        action={<button>Retry</button>}
      />,
    );
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();

    rerender(<InfoCard icon={Heart} label="Status" value="" emptyValue="None" />);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('renders modal sections and closes from both controls', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <Modal open onClose={onClose}>
        <Modal.Header onClose={onClose}>Modal title</Modal.Header>
        <Modal.Body className="body-class">Body content</Modal.Body>
      </Modal>,
    );

    expect(screen.getByText('Modal title')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toHaveClass('body-class');

    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    await user.click(document.querySelector('.absolute.inset-0.bg-black\\/40.backdrop-blur-sm') as Element);
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(
      <Modal open={false} onClose={onClose}>
        <div>Hidden</div>
      </Modal>,
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders interactive sections, detail rows, and selectors', async () => {
    const user = userEvent.setup();
    const onStepClick = vi.fn();
    const onChange = vi.fn();

    render(
      <div>
        <StepIndicator steps={['One', 'Two', 'Three']} currentStep={1} onStepClick={onStepClick} />
        <Section title="Details" className="section-class">
          <DetailRow label="City" value="Bengaluru" icon={MapPin} />
          <DetailRow label="Hidden" value="" />
        </Section>
        <SelectionGroup
          options={['Alpha', 'Beta', 'Gamma'] as const}
          value="Beta"
          onChange={onChange}
          columns={2}
        />
      </div>,
    );

    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Bengaluru')).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(document.querySelector('.section-class')).toBeInTheDocument();
    expect(document.querySelector('.grid-cols-2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /three/i }));
    await user.click(screen.getByRole('button', { name: 'Alpha' }));

    expect(onStepClick).toHaveBeenCalledWith(2);
    expect(onChange).toHaveBeenCalledWith('Alpha');
  });
});
