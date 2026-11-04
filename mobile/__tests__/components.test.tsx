/**
 * Component smoke tests — render the presentational primitives and assert
 * that the expected copy reaches the tree.
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  AppText,
  Badge,
  Button,
  EmptyState,
  ListRow,
  ProgressBar,
  StatTile,
} from '../src/components';

function render(element: React.ReactElement): string {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return JSON.stringify(renderer!.toJSON());
}

describe('presentational components', () => {
  it('StatTile upper-cases its label and shows the value', () => {
    const tree = render(<StatTile label="Pickups" value="42" hint="today" />);
    expect(tree).toContain('PICKUPS');
    expect(tree).toContain('42');
    expect(tree).toContain('today');
  });

  it('Button shows its label idle and swaps to a spinner while loading', () => {
    const onPress = jest.fn();
    const idle = render(<Button label="Save" onPress={onPress} />);
    const loading = render(<Button label="Save" loading onPress={onPress} />);

    expect(idle).toContain('Save');
    expect(idle).toContain('"disabled":false');
    expect(loading).not.toContain('Save');
    expect(loading).toContain('ActivityIndicator');
    expect(loading).toContain('"disabled":true');
  });

  it('EmptyState renders title and message', () => {
    const tree = render(
      <EmptyState title="No device yet" message="Register one first." />,
    );
    expect(tree).toContain('No device yet');
    expect(tree).toContain('Register one first.');
  });

  it('ListRow renders title, subtitle and trailing content', () => {
    const tree = render(
      <ListRow
        title="Instagram"
        subtitle="12 launches"
        leading="📱"
        trailing={<Badge label="social" />}
      />,
    );
    expect(tree).toContain('Instagram');
    expect(tree).toContain('12 launches');
    expect(tree).toContain('SOCIAL');
  });

  it('ProgressBar tolerates out-of-range values', () => {
    const tree = render(<ProgressBar value={2} label="of 4h" />);
    expect(tree).toContain('of 4h');
    expect(tree).toContain('100%');
  });

  it('AppText applies the requested variant and tone', () => {
    const tree = render(
      <AppText variant="title" tone="danger">
        Blocked
      </AppText>,
    );
    expect(tree).toContain('Blocked');
  });
});
