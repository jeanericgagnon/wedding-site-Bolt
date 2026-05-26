import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createEmptyPhotoBuckets } from '../../lib/aiPhotoBuckets';
import { PhotoBucketCards } from './PhotoBucketCards';

describe('PhotoBucketCards', () => {
  it('renders the bucket cards with titles', () => {
    render(<PhotoBucketCards buckets={createEmptyPhotoBuckets()} />);
    expect(screen.getByText('Main photo of you two')).toBeInTheDocument();
    expect(screen.getByText('Weekend / destination photos')).toBeInTheDocument();
    expect(screen.getAllByText('Empty').length).toBeGreaterThan(0);
  });

  it('shows readiness hints when buckets have enough photos', () => {
    const buckets = createEmptyPhotoBuckets();
    buckets['main-couple'] = [{ id: 'hero', url: '/hero.jpg', bucket: 'main-couple', label: 'Hero' }];

    render(<PhotoBucketCards buckets={buckets} />);

    expect(screen.getByText('Hero ready')).toBeInTheDocument();
  });
});
