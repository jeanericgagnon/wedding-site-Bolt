import React from 'react';
import { z } from 'zod';
import { Mail, Instagram, Phone } from 'lucide-react';
import { SectionDefinition, SectionComponentProps } from '../../types';
import { getSafePublicEmailHref, getSafePublicInstagramUrl, getSafePublicTelHref } from '../../publicLinks';

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
  headline: z.string().default('Need help?'),
  subheadline: z.string().default('We\'d love to hear from you.'),
  introText: z.string().default(''),
  contacts: z.array(ContactPersonSchema).default([]),
  closingNote: z.string().default(''),
  emailSubject: z.string().default('Wedding question'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

export const defaultContactFormData: ContactFormData = {
  eyebrow: 'Need help?',
  headline: 'Need help?',
  subheadline: 'We\'d love to hear from you.',
  introText: 'Have a question about the wedding weekend? Reach out — we\'re happy to help.',
  emailSubject: 'Wedding question',
  closingNote: 'We\'ll get back to you as soon as we can.',
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
    <section className="py-28 md:py-36 bg-gradient-to-b from-stone-50 to-white" id="contact">
      <div className="max-w-4xl mx-auto px-6 md:px-12">
        <div className="text-center mb-14">
          {data.eyebrow && (
            <p className="text-sm text-stone-400 font-light mb-4">
              {data.eyebrow}
            </p>
          )}
          <h2 className="text-4xl md:text-6xl font-light text-stone-900 mb-3">{data.headline}</h2>
          {data.subheadline && (
            <p className="text-stone-500 font-light text-lg leading-relaxed">{data.subheadline}</p>
          )}
          {data.introText && (
            <p className="text-stone-400 text-sm max-w-xl mx-auto mt-2 leading-relaxed">{data.introText}</p>
          )}
        </div>

        {data.contacts.length > 0 && (
          <div className={`grid gap-5 ${data.contacts.length === 1 ? 'max-w-sm mx-auto' : 'grid-cols-1 md:grid-cols-2'}`}>
            {data.contacts.map(contact => {
              const safeEmailHref = getSafePublicEmailHref(contact.email, data.emailSubject);
              const safeTelHref = getSafePublicTelHref(contact.phone);
              const safeInstagramUrl = getSafePublicInstagramUrl(contact.instagram);
              return (
              <div key={contact.id} className="bg-white rounded-[1.5rem] p-7 border border-stone-100 shadow-sm hover:shadow-lg transition-shadow">
                <div className="mb-4">
                  <h3 className="font-medium text-stone-900 text-base">{contact.name}</h3>
                  {contact.role && (
                    <p className="text-xs text-stone-400 mt-0.5">{contact.role}</p>
                  )}
                </div>

                <div className="space-y-3">
                  {safeEmailHref && (
                    <a
                      href={safeEmailHref}
                      className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-900 group transition-colors"
                    >
                      <div className="w-7 h-7 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:border-stone-300 transition-colors flex-shrink-0">
                        <Mail size={13} className="text-stone-400" />
                      </div>
                      {contact.email}
                    </a>
                  )}
                  {safeTelHref && (
                    <a
                      href={safeTelHref}
                      className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-900 group transition-colors"
                    >
                      <div className="w-7 h-7 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:border-stone-300 transition-colors flex-shrink-0">
                        <Phone size={13} className="text-stone-400" />
                      </div>
                      {contact.phone}
                    </a>
                  )}
                  {safeInstagramUrl && (
                    <a
                      href={safeInstagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-900 group transition-colors"
                    >
                      <div className="w-7 h-7 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center group-hover:border-stone-300 transition-colors flex-shrink-0">
                        <Instagram size={13} className="text-stone-400" />
                      </div>
                      {contact.instagram}
                    </a>
                  )}
                </div>
              </div>
              );
            })}
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
