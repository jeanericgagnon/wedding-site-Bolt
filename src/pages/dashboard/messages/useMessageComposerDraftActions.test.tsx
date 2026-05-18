import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMessageComposerDraftActions } from './useMessageComposerDraftActions';
import type { AudienceOption, Guest, Message, SavedComposerTemplate, WeddingSite } from './messageDashboardTypes';

describe('useMessageComposerDraftActions template override boundary', () => {
  const weddingSite: WeddingSite = {
    id: 'site-1',
    couple_first_name: 'Maya',
    couple_second_name: 'Leo',
    couple_email: 'team@example.com',
    venue_name: 'Garden House',
    wedding_date: '2026-09-12',
  };

  const guests: Guest[] = [];
  const audienceOptions: AudienceOption[] = [
    { value: 'all', label: 'All guests', count: 120 },
  ];

  function Harness({
    onFormData,
  }: {
    onFormData: (value: {
      campaignName: string;
      templateKey: string;
      subject: string;
      body: string;
      audience: string;
      channel: 'email' | 'sms';
      scheduleType: string;
      scheduleDate: string;
      scheduleTime: string;
    }) => void;
  }) {
    const setMessages = vi.fn() as React.Dispatch<React.SetStateAction<Message[]>>;
    const setEditingMessageId = vi.fn();
    const setSavedTemplates = vi.fn() as React.Dispatch<React.SetStateAction<SavedComposerTemplate[]>>;

    const { applyComposerTemplate } = useMessageComposerDraftActions({
      weddingSite,
      guests,
      isDemoMode: true,
      formData: {
        campaignName: '',
        templateKey: 'blank',
        subject: '',
        body: '',
        audience: 'all',
        channel: 'email',
        scheduleType: 'now',
        scheduleDate: '',
        scheduleTime: '',
      },
      savedTemplates: [],
      audienceOptions,
      selectedAudience: audienceOptions[0],
      selectedTemplateLabel: 'Blank message',
      applyTemplateVariables: (text) => text,
      fetchMessages: async () => {},
      toast: vi.fn(),
      setMessages,
      setEditingMessageId,
      setFormData: (next) => {
        const resolved = typeof next === 'function'
          ? next({
            campaignName: '',
            templateKey: 'blank',
            subject: '',
            body: '',
            audience: 'all',
            channel: 'email',
            scheduleType: 'now',
            scheduleDate: '',
            scheduleTime: '',
          })
          : next;
        onFormData(resolved);
      },
      setSavedTemplates,
    });

    return (
      <button
        type="button"
        onClick={() => applyComposerTemplate('day-of-update', {
          channel: 'sms',
          subject: 'Custom live subject',
          body: 'Custom live body',
          campaignName: 'Live proof day-of',
        })}
      >
        Apply template
      </button>
    );
  }

  it('preserves explicit subject and body overrides when applying an operational template', () => {
    const onFormData = vi.fn();

    render(<Harness onFormData={onFormData} />);
    fireEvent.click(screen.getByRole('button', { name: 'Apply template' }));

    expect(onFormData).toHaveBeenCalledWith(expect.objectContaining({
      templateKey: 'day-of-update',
      channel: 'sms',
      subject: 'Custom live subject',
      body: 'Custom live body',
      campaignName: 'Live proof day-of',
    }));
  });
});
