import { normalizeGuestLanguageCode, type GuestLanguageCode } from './guestLanguagePreference';

export type MessageLanguageTemplateKey =
  | 'blank'
  | 'save-the-date'
  | 'rsvp-reminder'
  | 'event-reminder'
  | 'day-of-update'
  | 'photo-request'
  | 'thank-you';

export type MessageLanguagePreviewStatus = 'ready' | 'needs-review' | 'fallback';

export interface MessageLanguagePreviewInput {
  templateKey: string;
  subject: string;
  body: string;
  languages?: GuestLanguageCode[];
}

export interface MessageLanguagePreview {
  language: GuestLanguageCode;
  label: string;
  subject: string;
  body: string;
  status: MessageLanguagePreviewStatus;
  note: string;
}

const LANGUAGE_LABELS: Record<GuestLanguageCode, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  de: 'German',
  pt: 'Portuguese',
};

export interface MessagePreviewAudienceGuest {
  preferred_language?: string | null;
}

const TEMPLATE_VARIANTS: Partial<Record<MessageLanguageTemplateKey, Partial<Record<GuestLanguageCode, { subject: string; body: string }>>>> = {
  'save-the-date': {
    es: {
      subject: 'Reserva la fecha',
      body: 'Nos encantaria que nos acompanaran en nuestra boda. Marquen la fecha y pronto compartiremos la invitacion formal.',
    },
    fr: {
      subject: 'Reservez la date',
      body: 'Nous serions heureux de vous avoir avec nous pour notre mariage. Notez la date, invitation officielle a suivre.',
    },
  },
  'rsvp-reminder': {
    es: {
      subject: 'Recordatorio para confirmar asistencia',
      body: 'Queremos confirmar los ultimos detalles. Si aun no has respondido, por favor confirma tu asistencia cuando puedas.',
    },
    fr: {
      subject: 'Rappel de reponse',
      body: 'Nous finalisons les derniers details. Si vous ne l avez pas encore fait, merci de confirmer votre presence quand vous le pouvez.',
    },
  },
  'event-reminder': {
    es: {
      subject: 'Detalles para el evento',
      body: 'Un recordatorio rapido con los detalles importantes para el evento. Revisa la hora, el lugar y cualquier nota de llegada antes de salir.',
    },
    fr: {
      subject: 'Details pour l evenement',
      body: 'Un petit rappel avec les informations importantes pour l evenement. Verifiez l heure, le lieu et les notes d arrivee avant de partir.',
    },
  },
  'day-of-update': {
    es: {
      subject: 'Actualizacion para hoy',
      body: 'Una actualizacion rapida para hoy. Revisa el centro de la boda para los detalles mas recientes antes de salir.',
    },
    fr: {
      subject: 'Mise a jour du jour',
      body: 'Une mise a jour rapide pour aujourd hui. Consultez le hub du mariage pour les informations les plus recentes avant de partir.',
    },
  },
  'photo-request': {
    es: {
      subject: 'Comparte tus fotos',
      body: 'Creamos un enlace para que todos puedan compartir sus momentos favoritos. Puedes subir tus fotos cuando quieras.',
    },
    fr: {
      subject: 'Partagez vos photos',
      body: 'Nous avons cree un lien pour que chacun puisse partager ses moments preferes. Vous pouvez ajouter vos photos quand vous le souhaitez.',
    },
  },
  'thank-you': {
    es: {
      subject: 'Gracias',
      body: 'Muchas gracias por celebrar con nosotros. Su presencia significo muchisimo y estamos muy agradecidos por su carino y apoyo.',
    },
    fr: {
      subject: 'Merci',
      body: 'Merci beaucoup d avoir celebre avec nous. Votre presence a beaucoup compte pour nous et nous sommes reconnaissants pour votre affection et votre soutien.',
    },
  },
};

function normalizeTemplateKey(value: string): MessageLanguageTemplateKey {
  return (['blank', 'save-the-date', 'rsvp-reminder', 'event-reminder', 'day-of-update', 'photo-request', 'thank-you'].includes(value)
    ? value
    : 'blank') as MessageLanguageTemplateKey;
}

export function deriveGuestMessagePreviewLanguages(
  guests: MessagePreviewAudienceGuest[],
  siteDefaultLanguage?: string | null
): GuestLanguageCode[] {
  const seen = new Set<GuestLanguageCode>();
  const ordered: GuestLanguageCode[] = ['en'];

  const addLanguage = (value?: string | null) => {
    const normalized = normalizeGuestLanguageCode(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    if (normalized !== 'en') ordered.push(normalized);
  };

  seen.add('en');
  guests.forEach((guest) => addLanguage(guest.preferred_language));
  addLanguage(siteDefaultLanguage);

  return ordered;
}

export function buildGuestMessageLanguagePreviews(input: MessageLanguagePreviewInput): MessageLanguagePreview[] {
  const languages: GuestLanguageCode[] = input.languages?.length ? input.languages : ['en', 'es'];
  const templateKey = normalizeTemplateKey(input.templateKey);
  const fallbackSubject = input.subject.trim() || 'Guest update';
  const fallbackBody = input.body.trim() || 'Write the guest update before sending.';

  return languages.map((language) => {
    if (language === 'en') {
      return {
        language,
        label: LANGUAGE_LABELS[language],
        subject: fallbackSubject,
        body: fallbackBody,
        status: input.body.trim() ? 'ready' : 'needs-review',
        note: 'Uses the current composer copy.',
      };
    }

    const variant = TEMPLATE_VARIANTS[templateKey]?.[language];
    if (variant) {
      return {
        language,
        label: LANGUAGE_LABELS[language],
        subject: variant.subject,
        body: variant.body,
        status: 'needs-review',
        note: 'Template variant ready for owner review before sending.',
      };
    }

    return {
      language,
      label: LANGUAGE_LABELS[language],
      subject: fallbackSubject,
      body: fallbackBody,
      status: 'fallback',
      note: 'No reviewed variant yet, so this falls back to the current composer copy.',
    };
  });
}
