// Behavioural smoke tests for the directory via its dev harness. Kept seed-agnostic
// (no hard-coded installer ids / featured slots) so they hold across data changes — the
// data itself is checked in data.test.ts, the matcher in match.test.ts.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DevDirectoryPage from './DevDirectoryPage.tsx';

function setPostcode(pc: string) {
  fireEvent.change(screen.getByTestId('dev-postcode'), { target: { value: pc } });
}
/** First rendered testid with the given prefix, or null. */
function firstSuffix(prefix: string): string | null {
  const el = document.querySelector(`[data-testid^="${prefix}"]`);
  return el?.getAttribute('data-testid')?.slice(prefix.length) ?? null;
}

describe('directory — behaviour via the dev harness', () => {
  it('a Brisbane postcode returns distance-ordered installer cards', () => {
    render(<DevDirectoryPage />);
    setPostcode('4000');
    const section = screen.getByTestId('directory-section');
    const cards = within(section).queryAllByTestId(/^installer-/);
    expect(cards.length).toBeGreaterThan(1);
    // Rendered top→bottom by ascending distance (no featured strip in seed data).
    const dists = cards.map((c) => Number(c.textContent?.match(/~(\d+) km/)?.[1] ?? Infinity));
    expect(dists).toEqual([...dists].sort((a, b) => a - b));
  });

  it('a non-QLD postcode (2000) shows the waitlist empty state', () => {
    render(<DevDirectoryPage />);
    setPostcode('2000');
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(within(screen.getByTestId('directory-section')).queryAllByTestId(/^installer-/)).toHaveLength(0);
  });

  it('"do nothing" collapses the section behind an explicit click', () => {
    render(<DevDirectoryPage />);
    fireEvent.click(screen.getByTestId('scenario-nothing'));
    expect(screen.getByTestId('do-nothing-collapse')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('show-anyway'));
    expect(screen.queryByTestId('do-nothing-collapse')).toBeNull();
    expect(screen.getByRole('group', { name: 'Work type' })).toBeInTheDocument();
  });

  it('renders a company-type badge and opens the shared "Two ways to buy" modal', () => {
    render(<DevDirectoryPage />);
    setPostcode('4000');
    const infoId = firstSuffix('badge-info-');
    expect(infoId).not.toBeNull();
    expect(screen.queryByTestId('two-ways-explainer')).toBeNull();
    fireEvent.click(screen.getByTestId(`badge-info-${infoId}`));
    const modal = screen.getByTestId('two-ways-explainer');
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveTextContent(/Two ways to buy/i);
    fireEvent.click(screen.getByTestId('two-ways-close'));
    expect(screen.queryByTestId('two-ways-explainer')).toBeNull();
  });

  it('click-to-reveal shows a phone for a listing that has one', () => {
    render(<DevDirectoryPage />);
    setPostcode('4000');
    const id = firstSuffix('reveal-');
    expect(id).not.toBeNull();
    expect(screen.queryByTestId(`phone-${id}`)).toBeNull();
    fireEvent.click(screen.getByTestId(`reveal-${id}`));
    expect(screen.getByTestId(`phone-${id}`)).toBeInTheDocument();
  });

  it('empty-state waitlist submit confirms', () => {
    render(<DevDirectoryPage />);
    setPostcode('2000');
    const empty = screen.getByTestId('empty-state');
    fireEvent.change(within(empty).getByLabelText('Email to be notified'), {
      target: { value: 'me@example.com' },
    });
    fireEvent.submit(within(empty).getByTestId('waitlist-notify').closest('form')!);
    expect(screen.getByTestId('empty-state')).toHaveTextContent(/we'll email you/i);
  });
});
