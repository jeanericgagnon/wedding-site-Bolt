import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { PhotoBucketCards } from './PhotoBucketCards';

describe('PhotoBucketCards', () => {
  it('renders the bucket cards with titles', () => {
    render(<PhotoBucketCards buckets={createEmptyPhotoBuckets()} />);
    expect(screen.getByText('Main photo of you two')).toBeInTheDocument();
    expect(screen.getByText('Weekend / destination photos')).toBeInTheDocument();
  });

  it('can disable album upload buttons while the site is still loading', () => {
    render(<PhotoBucketCards buckets={createEmptyPhotoBuckets()} uploadDisabled />);
    screen.getAllByRole('button', { name: 'Upload to this album' }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
