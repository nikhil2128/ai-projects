import { render, screen } from '@testing-library/react';
import {
  FamilyProfileContent,
  ProfileAttributeSections,
  ProfileAvatar,
  ProfileHighlights,
  ProfileNarrativeSections,
  formatHeight,
  getProfileFullName,
  getProfileInitials,
  getProfileLocation,
  getProfileSubtitle,
  hasFamilyProfileContent,
} from './ProfileSections';
import { sampleFamilyProfile, sampleProfile } from '../../test/fixtures';

describe('ProfileSections helpers', () => {
  it('formats profile helper values', () => {
    expect(formatHeight(undefined)).toBe('—');
    expect(formatHeight(165)).toBe(`5'5"`);
    expect(getProfileInitials({ firstName: 'Asha', lastName: 'Verma' })).toBe('AV');
    expect(getProfileInitials({ firstName: '', lastName: '' })).toBe('?');
    expect(getProfileFullName({ firstName: 'Asha', lastName: 'Verma' })).toBe('Asha Verma');
    expect(getProfileSubtitle(sampleProfile)).toBe('Product Manager at Acme');
    expect(getProfileSubtitle({ firstName: 'A', lastName: 'V', profession: '', company: '' }, 'Fallback')).toBe('Fallback');
    expect(getProfileLocation({ location: 'Bengaluru', state: 'Karnataka' })).toBe('Bengaluru, Karnataka');
    expect(getProfileLocation({ location: '', state: '' })).toBe('—');
    expect(hasFamilyProfileContent(sampleFamilyProfile)).toBe(true);
    expect(hasFamilyProfileContent({ ...sampleFamilyProfile, fatherName: '', motherName: '' })).toBe(false);
  });
});

describe('ProfileSections components', () => {
  it('renders avatar fallbacks and images', () => {
    const { rerender } = render(<ProfileAvatar profile={sampleProfile} />);
    expect(screen.getByText('AV')).toBeInTheDocument();

    rerender(<ProfileAvatar profile={{ ...sampleProfile, photoUrl: 'https://example.com/photo.jpg' }} />);
    expect(screen.getByRole('img', { name: 'Asha Verma' })).toBeInTheDocument();
  });

  it('renders highlights, attributes, narrative content, and family sections', () => {
    render(
      <div>
        <ProfileHighlights profile={sampleProfile} />
        <ProfileAttributeSections profile={sampleProfile} />
        <ProfileNarrativeSections profile={sampleProfile} aboutTitle="About Asha" />
        <FamilyProfileContent familyProfile={sampleFamilyProfile} showIncome />
      </div>,
    );

    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    expect(screen.getByText('About Asha')).toBeInTheDocument();
    expect(screen.getByText('Travel')).toBeInTheDocument();
    expect(screen.getByText('Father')).toBeInTheDocument();
    expect(screen.getByText('Rajesh Verma')).toBeInTheDocument();
    expect(screen.getByText('Family Income:')).toBeInTheDocument();
  });

  it('omits optional narrative and family details when missing', () => {
    render(
      <div>
        <ProfileNarrativeSections profile={{ ...sampleProfile, bio: '', lookingFor: '', interests: [] }} />
        <FamilyProfileContent
          familyProfile={{ ...sampleFamilyProfile, fatherName: '', motherName: '', aboutFamily: '' }}
        />
      </div>,
    );

    expect(screen.queryByText('About Me')).not.toBeInTheDocument();
    expect(screen.queryByText('Father')).not.toBeInTheDocument();
  });
});
