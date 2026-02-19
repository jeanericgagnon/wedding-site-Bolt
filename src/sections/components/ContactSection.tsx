import React from 'react';
import { WeddingDataV1 } from '../../types/weddingData';
import { SectionInstance } from '../../types/layoutConfig';
import { Mail, Phone, MessageCircle } from 'lucide-react';

interface Props {
  data: WeddingDataV1;
  instance: SectionInstance;
}

interface ContactPerson {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
}

function getContacts(settings: SectionInstance['settings']): ContactPerson[] {
  if (settings.contacts && Array.isArray(settings.contacts)) {
    return settings.contacts as ContactPerson[];
  }
  return [];
}

export const ContactSection: React.FC<Props> = ({ data: _data, instance }) => {
  const { settings } = instance;
  const contacts = getContacts(settings);
  const introText = settings.introText as string;
  const emailSubject = encodeURIComponent((settings.emailSubject as string) || 'Wedding Question');

  return (
    <section className="py-20 px-4 bg-surface-subtle">
      <div className="max-w-3xl mx-auto text-center">
        {settings.showTitle !== false && (
          <div className="mb-10">
            <p className="text-xs uppercase tracking-[0.3em] text-primary mb-3 font-medium">
              {settings.eyebrow as string || 'Need help?'}
            </p>
            <h2 className="text-4xl font-light text-text-primary">
              {settings.title as string || 'Questions?'}
            </h2>
            {settings.subtitle && (
              <p className="mt-4 text-text-secondary max-w-xl mx-auto">{settings.subtitle as string}</p>
            )}
            <div className="w-10 h-px bg-primary mx-auto mt-5" />
          </div>
        )}

        {introText && (
          <p className="text-text-secondary mb-10 max-w-lg mx-auto">{introText}</p>
        )}

        {contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-text-tertiary">
            <MessageCircle className="w-8 h-8" />
            <p className="text-sm">Add contact details in section settings</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${contacts.length === 1 ? 'max-w-sm mx-auto' : 'sm:grid-cols-2'}`}>
            {contacts.map((contact, i) => (
              <div key={i} className="bg-surface border border-border rounded-2xl p-7 text-left">
                <div className="mb-4">
                  <p className="font-semibold text-text-primary">{contact.name}</p>
                  {contact.role && (
                    <p className="text-xs text-primary mt-0.5 uppercase tracking-wide">{contact.role}</p>
                  )}
                </div>
                <div className="space-y-3">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}?subject=${emailSubject}`}
                      className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-primary transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-2.5 text-sm text-text-secondary hover:text-primary transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Phone className="w-3.5 h-3.5 text-primary" />
                      </div>
                      {contact.phone}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {settings.closingNote && (
          <p className="mt-10 text-sm text-text-tertiary italic">{settings.closingNote as string}</p>
        )}
      </div>
    </section>
  );
};

export const ContactMinimal: React.FC<Props> = ({ data: _data, instance }) => {
  const { settings } = instance;
  const contacts = getContacts(settings);
  const emailSubject = encodeURIComponent((settings.emailSubject as string) || 'Wedding Question');

  return (
    <section className="py-16 px-4 bg-surface border-y border-border">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-light text-text-primary">
              {settings.title as string || 'Have questions?'}
            </h2>
            {settings.subtitle && (
              <p className="text-text-secondary text-sm mt-1">{settings.subtitle as string}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 justify-center">
            {contacts.slice(0, 2).map((contact, i) => (
              <div key={i} className="flex items-center gap-3">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}?subject=${emailSubject}`}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    {contact.name ? contact.name : contact.email}
                  </a>
                )}
                {contact.phone && !contact.email && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                    <Phone className="w-4 h-4" />
                    {contact.name ? contact.name : contact.phone}
                  </a>
                )}
              </div>
            ))}
            {contacts.length === 0 && (
              <p className="text-sm text-text-tertiary">Add contacts in section settings</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
