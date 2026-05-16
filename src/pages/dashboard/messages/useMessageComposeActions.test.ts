import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMessageComposeActions } from './useMessageComposeActions';
import type { AudienceOption, Guest, Message, WeddingSite } from './messageDashboardTypes';

describe('useMessageComposeActions draft validation boundary', () => {
  const weddingSite: WeddingSite = {
    id: 'site-1',
    couple_first_name: 'Maya',
    couple_second_name: 'Leo',
    couple_email: 'team@example.com',
  };

  const selectedAudience: AudienceOption = {
    value: 'all',
    label: 'All guests',
    count: 2,
  };

  const guests: Guest[] = [
    {
      id: 'guest-1',
      email: 'maya@example.com',
      first_name: 'Maya',
      last_name: 'Lee',
      name: 'Maya Lee',
      rsvp_status: 'pending',
    },
    {
      id: 'guest-2',
      email: 'leo@example.com',
      first_name: 'Leo',
      last_name: 'Lee',
      name: 'Leo Lee',
      rsvp_status: 'pending',
    },
  ];

  function ComposeHarness({
    formData,
    toast,
  }: {
    formData: {
      campaignName: string;
      templateKey: 'blank';
      subject: string;
      body: string;
      audience: string;
      channel: 'email' | 'sms';
      scheduleType: string;
      scheduleDate: string;
      scheduleTime: string;
    };
    toast: (message: string, tone?: 'success' | 'error' | 'info') => void;
  }) {
    const setSending = vi.fn();
    const setMessages = vi.fn() as React.Dispatch<React.SetStateAction<Message[]>>;
    const setShowRecipientPreview = vi.fn();
    const setEditingMessageId = vi.fn();
    const setFormData = vi.fn();

    const { handleSendMessage } = useMessageComposeActions({
      weddingSite,
      isDemoMode: true,
      formData,
      selectedAudience,
      selectedTemplate: {},
      editingMessageId: null,
      smsCredits: 0,
      smsCreditsNeeded: 0,
      smsCreditsSufficient: true,
      messagesChannel: formData.channel,
      getRecipients: () => guests,
      fetchMessages: async () => {},
      toast,
      setSending,
      setMessages,
      setShowRecipientPreview,
      setEditingMessageId,
      setFormData,
    });

    return (
      <div>
        <button type="button" onClick={(event) => void handleSendMessage(event as unknown as React.FormEvent, true)}>
          Save Draft
        </button>
      </div>
    );
  }

  it('blocks blank email drafts with a guest-facing error before anything is written', () => {
    const toast = vi.fn();

    render(
      <ComposeHarness
        toast={toast}
        formData={{
          campaignName: '',
          templateKey: 'blank',
          subject: '',
          body: '',
          audience: 'all',
          channel: 'email',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: '',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(toast).toHaveBeenCalledWith('Add both a subject and message before saving this draft.', 'error');
  });

  it('blocks blank sms drafts with the message-only validation before anything is written', () => {
    const toast = vi.fn();

    render(
      <ComposeHarness
        toast={toast}
        formData={{
          campaignName: '',
          templateKey: 'blank',
          subject: '',
          body: '',
          audience: 'all',
          channel: 'sms',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: '',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(toast).toHaveBeenCalledWith('Add a message before saving this draft.', 'error');
  });

  it('blocks partial email drafts when only a subject is present', () => {
    const toast = vi.fn();

    render(
      <ComposeHarness
        toast={toast}
        formData={{
          campaignName: '',
          templateKey: 'blank',
          subject: 'Quick reminder',
          body: '',
          audience: 'all',
          channel: 'email',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: '',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(toast).toHaveBeenCalledWith('Add both a subject and message before saving this draft.', 'error');
  });

  it('blocks partial sms drafts when the message is only whitespace', () => {
    const toast = vi.fn();

    render(
      <ComposeHarness
        toast={toast}
        formData={{
          campaignName: '',
          templateKey: 'blank',
          subject: '',
          body: '   ',
          audience: 'all',
          channel: 'sms',
          scheduleType: 'now',
          scheduleDate: '',
          scheduleTime: '',
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Draft' }));

    expect(toast).toHaveBeenCalledWith('Add a message before saving this draft.', 'error');
  });
});
