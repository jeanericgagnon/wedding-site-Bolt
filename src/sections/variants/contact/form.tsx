import React from 'react';
import { z } from 'zod';
import { Mail, Instagram, Phone } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';

const ContactPersonSchema = z.object({
  id: z.string(),
  name: z.string().default(''),
  role: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  instagram: z.string().default(''),
});

export const contactFormSchema = z.object({
  eyebrow: z.string().default('Need help?'),
  headline: z.string().default('Questions?'),
  subheadline: z.string().default('We\'d love to hear from you.'),
  introText: z.string().default(''),
  contacts: z.array(ContactPersonSchema).default([]),
  closingNote: z.string().default(''),
  emailSubject: z.string().default('Wedding Question'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export const defaultContactFormData: ContactFormData = {
  eyebrow: 'Need help?',
  headline: 'Questions?',
  subheadline: 'We\'d love to hear from you.',
  introText: 'Have a question about the wedding? Don\'t hesitate to reach out — we\'re happy to help.',
  emailSubject: 'Wedding Question',
  closingNote: 'We\'ll get back to you within 24 hours.',
  contacts: [
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Bride / General Inquiries',
      email: 'sarah@example.com',
      phone: '',
      instagram: '',
    },
    {
      id: '2',
      name: 'Emily Chen',
      role: 'Maid of Honor',
      email: 'emily@example.com',
      phone: '+1 (212) 555-0102',
      instagram: '',
    },
  ],
};

const ContactForm: React.FC<SectionComponentProps<ContactFormData>> = ({ data }) => {
  return (
    <section className="py-24 md:py-32 bg-stone-50" id="contact">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400 font-medium mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-5xl font-light text-stone-900 mb-3">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-500 font-light text-lg">{data.subheadline}</p>
          )}
          {data.introText && (
            <p className="text-stone-400 text-sm max-w-xl mx-auto mt-2 leading-relaxed">{data.introText}</p>
          )}
        </div>

        {data.contacts.length > 0 && (
          <div className={`grid gap-5 ${data.contacts.length === 1 ? 'max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
            {data.contacts.map(contact => (
              <div key={contact.id} className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-medium text-stone-900 text-base">{contact.name}</h3>
                  {contact.role && (
                    <p className="text-xs text-stone-400 uppercase tracking-wide mt-0.5">{contact.role}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}?subject=${encodeURIComponent(data.emailSubject)}`}
                      className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-900 group transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:border-stone-300 transition-colors flex-shrink-0">
                        <Mail size={13} className="text-stone-400" />
                      </div>
                      {contact.email}
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-900 group transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:border-stone-300 transition-colors flex-shrink-0">
                        <Phone size={13} className="text-stone-400" />
                      </div>
                      {contact.phone}
                    </a>
                  )}
                  {contact.instagram && (
                    <a
                      href={`https://instagram.com/${contact.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-900 group transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:border-stone-300 transition-colors flex-shrink-0">
                        <Instagram size={13} className="text-stone-400" />
                      </div>
                      {contact.instagram}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {data.closingNote && (
          <p className="text-center text-sm text-stone-400 mt-8 font-light">{data.closingNote}</p>
        )}
      </div>
    </section>
  );
};

export const contactFormDefinition: SectionDefinition<ContactFormData> = {
  type: 'contact',
  variant: 'form',
  schema: contactFormSchema,
  defaultData: defaultContactFormData,
  Component: ContactForm,
};
