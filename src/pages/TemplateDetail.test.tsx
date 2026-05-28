import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { templateCatalog } from '../builder/constants/templateCatalog';
import TemplateDetail from './TemplateDetail';

describe('TemplateDetail truth copy', () => {
  it('keeps template decision copy framed as preview and sharing, not ready-made live promises', () => {
    const templateId = templateCatalog[0]?.id ?? 'modern-romance';

    render(
      <MemoryRouter initialEntries={[`/templates/${templateId}`]}>
        <Routes>
          <Route path="/templates/:templateId" element={<TemplateDetail />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Website + RSVP + Registry + Day-of sections')).toBeInTheDocument();
    expect(screen.getByText('Share when you’re ready')).toBeInTheDocument();
    expect(screen.getByTitle(/website preview/i)).toBeInTheDocument();
    expect(screen.getByText('Share when ready')).toBeInTheDocument();
    expect(screen.queryByText(/Day-of ready/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/live preview/i)).not.toBeInTheDocument();
  });
});
