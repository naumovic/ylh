// Component smoke test for the dev harness — the render half of the Phase-1 exit criteria
// (all four scenarios + the empty state from placeholder data). Logic is covered exhaustively
// in match.test.ts; this asserts the wiring renders and reacts.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DevDirectoryPage from './DevDirectoryPage.tsx';

function setPostcode(pc: string) {
  fireEvent.change(screen.getByTestId('dev-postcode'), { target: { value: pc } });
}

describe('DevDirectoryPage — scenarios render from placeholder data', () => {
  it('battery (default): shows the featured strip capped at 2 in bne-east', () => {
    render(<DevDirectoryPage />);
    setPostcode('4157'); // Brisbane East
    const section = screen.getByTestId('directory-section');
    const featured = within(section).getAllByText('Featured — paid placement');
    expect(featured).toHaveLength(2); // cap enforced end-to-end
    // The two nearest active slot holders are the featured ones.
    expect(within(section).getByTestId('installer-test-solar-co')).toHaveAttribute('data-featured', 'true');
  });

  it('solar: no bne-central solar slot ⇒ organic-only, no featured strip', () => {
    render(<DevDirectoryPage />);
    fireEvent.click(screen.getByTestId('scenario-solar'));
    setPostcode('4000');
    const section = screen.getByTestId('directory-section');
    expect(within(section).queryByText('Featured — paid placement')).toBeNull();
    expect(within(section).getByTestId('installer-test-solar-co')).toBeInTheDocument();
  });

  it('EV: renders EV-capable installers', () => {
    render(<DevDirectoryPage />);
    fireEvent.click(screen.getByTestId('scenario-ev'));
    setPostcode('4000');
    const section = screen.getByTestId('directory-section');
    expect(within(section).getByTestId('installer-sample-sparks-electrical')).toBeInTheDocument();
  });

  it('do-nothing: collapses behind an explicit "show anyway" click', () => {
    render(<DevDirectoryPage />);
    fireEvent.click(screen.getByTestId('scenario-nothing'));
    expect(screen.getByTestId('do-nothing-collapse')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('show-anyway'));
    expect(screen.queryByTestId('do-nothing-collapse')).toBeNull();
    expect(screen.getByRole('group', { name: 'Work type' })).toBeInTheDocument();
  });

  it('empty state: a postcode no installer services shows the waitlist capture', () => {
    render(<DevDirectoryPage />);
    setPostcode('4870'); // Cairns — outside every placeholder service area
    const empty = screen.getByTestId('empty-state');
    fireEvent.change(within(empty).getByLabelText('Email to be notified'), {
      target: { value: 'me@example.com' },
    });
    fireEvent.submit(within(empty).getByTestId('waitlist-notify').closest('form')!);
    expect(screen.getByTestId('empty-state')).toHaveTextContent(/we'll email you/i);
  });

  it('click-to-reveal: phone is hidden until the user asks', () => {
    render(<DevDirectoryPage />);
    setPostcode('4157');
    expect(screen.queryByTestId('phone-test-solar-co')).toBeNull();
    fireEvent.click(screen.getByTestId('reveal-test-solar-co'));
    expect(screen.getByTestId('phone-test-solar-co')).toHaveTextContent('07 3000 0001');
  });
});
