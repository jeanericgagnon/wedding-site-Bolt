import type { VendorProfile } from '../../../lib/vendorProfiles';
import type { PlanningVendor } from './planningService';
import type { VendorMetaMap } from './vendorMetaStorage';
import { isVendorDateOnOrBefore } from './vendorDate';

export interface VendorFitSummary {
  score: number;
  tone: 'urgent' | 'watch' | 'ready';
  label: string;
  detail: string;
  badges: string[];
}

export interface VendorDecisionDeckItem {
  id: string;
  tone: 'urgent' | 'watch' | 'ready';
  title: string;
  vendorName: string;
  detail: string;
  nextBestMove: string;
  badges: string[];
}

export interface VendorDecisionDeckModel {
  heading: string;
  summary: string;
  focusTitle: string;
  focusDetail: string;
  decisionRule: string;
  badges: string[];
  items: VendorDecisionDeckItem[];
}

export interface VendorProfileGuideModel {
  label: string;
  title: string;
  detail: string;
  focusTitle: string;
  focusDetail: string;
  nextMove: string;
  decisionRule: string;
  trustSignals: string[];
  checks: string[];
}

function createWindows(today = new Date()) {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const in7Days = new Date(start);
  in7Days.setDate(in7Days.getDate() + 7);
  const in21Days = new Date(start);
  in21Days.setDate(in21Days.getDate() + 21);
  return { start, in7Days, in21Days };
}

function countFilled(...values: Array<unknown>) {
  return values.filter((value) => {
    if (typeof value === 'string') return Boolean(value.trim());
    if (typeof value === 'number') return Number.isFinite(value) && value > 0;
    return Boolean(value);
  }).length;
}

export function buildVendorFitSummary(
  vendor: PlanningVendor,
  vendorMeta: VendorMetaMap,
  today = new Date(),
): VendorFitSummary {
  const meta = vendorMeta[vendor.id] ?? {};
  const { in7Days, in21Days } = createWindows(today);
  const hasDirectContact = countFilled(vendor.email, vendor.phone) > 0;
  const hasProof = countFilled(vendor.website, vendor.notes) > 0;
  const hasFinancialClarity = countFilled(vendor.contract_total, vendor.next_payment_due) > 0;
  const dueSoon = Boolean(vendor.balance_due > 0 && isVendorDateOnOrBefore(vendor.next_payment_due, in7Days));
  const followUpDue = Boolean(meta.nextFollowUp && isVendorDateOnOrBefore(meta.nextFollowUp, in7Days));
  const recentlyContacted = Boolean(meta.lastContacted && isVendorDateOnOrBefore(meta.lastContacted, in21Days));
  const score = countFilled(
    vendor.contact_name,
    hasDirectContact,
    vendor.website,
    vendor.notes,
    vendor.contract_total,
    recentlyContacted,
  );

  if (!hasDirectContact) {
    return {
      score,
      tone: 'urgent',
      label: 'Needs contact path',
      detail: 'Add a real email or phone path before this vendor becomes a serious option.',
      badges: [
        vendor.vendor_type,
        'No direct contact',
      ],
    };
  }

  if (dueSoon) {
    return {
      score,
      tone: 'urgent',
      label: 'Decision due soon',
      detail: 'There is money due soon here, so this vendor needs a yes, a plan, or a pause instead of passive tracking.',
      badges: [
        vendor.balance_due > 0 ? `${Math.round(vendor.balance_due).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} due` : 'Balance open',
        vendor.next_payment_due ? `Due ${vendor.next_payment_due}` : 'Payment timing unclear',
      ],
    };
  }

  if (followUpDue) {
    return {
      score,
      tone: 'watch',
      label: 'Follow-up due',
      detail: 'This vendor already needs a follow-up pass, so keep the loop moving before the thread gets cold.',
      badges: [
        vendor.vendor_type,
        meta.nextFollowUp ? `Follow up ${meta.nextFollowUp}` : 'Follow-up due',
      ],
    };
  }

  if (score >= 5 && hasProof && hasFinancialClarity) {
    return {
      score,
      tone: 'ready',
      label: 'Ready to choose',
      detail: 'You have enough contact, proof, and contract context here to make a real decision instead of gathering more trivia.',
      badges: [
        vendor.vendor_type,
        vendor.balance_due > 0 ? 'Contract in motion' : 'Financially calm',
      ],
    };
  }

  return {
    score,
    tone: 'watch',
    label: 'Needs one more pass',
    detail: 'This vendor is plausible, but one or two missing details are still keeping it from feeling decision-ready.',
    badges: [
      vendor.vendor_type,
      hasProof ? 'Has proof' : 'Needs proof',
      recentlyContacted ? 'Fresh contact' : 'Contact getting stale',
    ],
  };
}

export function buildVendorDecisionDeck(
  vendors: PlanningVendor[],
  vendorMeta: VendorMetaMap,
  today = new Date(),
): VendorDecisionDeckModel | null {
  if (vendors.length === 0) return null;

  const ranked = vendors
    .map((vendor) => {
      const summary = buildVendorFitSummary(vendor, vendorMeta, today);
      const urgencyWeight = summary.tone === 'urgent' ? 3 : summary.tone === 'watch' ? 2 : 1;
      return {
        vendor,
        summary,
        priority: urgencyWeight * 100 + (10 - Math.min(summary.score, 10)),
      };
    })
    .sort((a, b) => b.priority - a.priority || a.vendor.name.localeCompare(b.vendor.name));

  const urgentCount = ranked.filter((entry) => entry.summary.tone === 'urgent').length;
  const readyCount = ranked.filter((entry) => entry.summary.tone === 'ready').length;
  const needsContactCount = ranked.filter((entry) => entry.summary.label === 'Needs contact path').length;

  return {
    heading: 'Vendor fit guide',
    summary: urgentCount > 0
      ? 'These are the vendor decisions most likely to get noisy next. Handle the contact gaps and money timing first, then decide who is genuinely ready.'
      : 'Your vendor list is stable enough to compare calmly. Focus on who is decision-ready instead of reopening every vendor at once.',
    focusTitle: urgentCount > 0
      ? 'Clear urgency before you compare taste'
      : 'Use the quiet board to make one real decision',
    focusDetail: urgentCount > 0
      ? 'When vendors are missing contact paths or carrying payment pressure, the calm move is to remove that noise before you reopen style debates.'
      : 'When the board is stable, the job is not to keep browsing; it is to choose the next vendor that is truly ready for a yes.',
    decisionRule: urgentCount > 0
      ? 'Clear missing contact paths and payment pressure before you spend energy comparing aesthetics.'
      : 'Use this board to choose the next real yes, not to reopen every maybe.',
    badges: [
      `${urgentCount} urgent`,
      `${readyCount} ready to choose`,
      `${needsContactCount} missing direct contact`,
    ],
    items: ranked.slice(0, 3).map(({ vendor, summary }) => ({
      id: vendor.id,
      tone: summary.tone,
      title: summary.label,
      vendorName: vendor.name,
      detail: summary.detail,
      nextBestMove: summary.tone === 'urgent'
        ? summary.label === 'Needs contact path'
          ? 'Add one real contact path before this stays on the shortlist.'
          : 'Decide whether this vendor gets a yes, a payment plan, or a pause.'
        : summary.tone === 'ready'
          ? 'Use the proof you already have and make the call instead of gathering more trivia.'
          : 'Run one focused follow-up pass so this does not stay fuzzy.',
      badges: summary.badges,
    })),
  };
}

export function buildVendorProfileGuide(profile: VendorProfile): VendorProfileGuideModel {
  const hasDirectEmail = Boolean(profile.contact_email?.trim());
  const hasGalleryDepth = [profile.hero_image_url, ...profile.image_urls].filter(Boolean).length >= 3;
  const hasPublicLinks = countFilled(profile.instagram_url, profile.website_url) > 0;
  const hasDescriptor = Boolean(profile.descriptor?.trim());
  const linkCount = countFilled(
    profile.instagram_url,
    profile.website_url,
    typeof profile.source_payload?.pinterest_url === 'string' ? profile.source_payload.pinterest_url : null,
    typeof profile.source_payload?.tiktok_url === 'string' ? profile.source_payload.tiktok_url : null,
    typeof profile.source_payload?.facebook_url === 'string' ? profile.source_payload.facebook_url : null,
    typeof profile.source_payload?.youtube_url === 'string' ? profile.source_payload.youtube_url : null,
  );

  if (hasDirectEmail && hasGalleryDepth && hasPublicLinks) {
    return {
      label: 'Decision-friendly',
      title: 'This profile gives couples enough signal to move',
      detail: 'There is enough proof, imagery, and contact clarity here for a couple to decide whether they want the first conversation.',
      focusTitle: 'Use proof before outreach',
      focusDetail: 'This profile is strongest when the couple checks style fit first, verifies freshness second, and only then opens the conversation.',
      nextMove: hasDirectEmail
        ? 'Review the gallery and public links first, then send one direct email when the fit feels real.'
        : 'Review the gallery and public links first, then use the inquiry path once the fit feels real.',
      decisionRule: 'Do not start with outreach when the visual fit is still uncertain; use the proof first so the first conversation is warmer and more specific.',
      trustSignals: [
        'Gallery depth is strong enough to judge style',
        'Public links can verify recent work',
        'Direct contact path is already visible',
      ],
      checks: [
        'Look at the gallery first to see whether the visual style actually fits.',
        'Use the direct email when you already know you want to reach out.',
        'Use the public links to verify that recent work still matches the tone here.',
      ],
    };
  }

  return {
    label: 'Decision guide',
    title: hasDescriptor
      ? 'Use the strongest signals first before you reach out'
      : 'This profile still needs a quick human read before it earns a yes',
    detail: hasDirectEmail
      ? 'There is a direct contact path, but couples will still want to pressure-test the available proof before treating this like a shortlist lock.'
      : 'There is enough here to orient someone, but not enough to replace a quick manual check across links, visuals, and contact path.',
    focusTitle: hasGalleryDepth ? 'Pressure-test the fit first' : 'Gather one more layer of proof',
    focusDetail: hasGalleryDepth
      ? 'The page is good enough to form a first impression, but it still wants a quick freshness check before a real yes.'
      : 'This page can start the conversation, but it still needs either stronger visuals or stronger public proof before it feels shortlist-safe.',
    nextMove: hasDirectEmail
      ? 'Use the gallery and public links to decide whether this deserves a direct email right now.'
      : 'Use the available proof to decide whether this deserves a first-touch inquiry right now.',
    decisionRule: hasPublicLinks
      ? 'When the page is lighter, verify recent public work before you let convenience turn into a premature yes.'
      : 'When both proof and contact are thin, treat this as a maybe until one stronger signal appears.',
    trustSignals: [
      hasGalleryDepth ? 'Visual proof exists, but still wants a closer read.' : 'Gallery depth is still light.',
      hasPublicLinks ? 'Public proof is available for a freshness check.' : 'Public proof is still thin.',
      hasDirectEmail ? 'Direct contact is available once the fit feels real.' : 'Contact path still wants a little caution.',
    ],
    checks: [
      hasGalleryDepth ? 'The images give a decent style signal, so use those before reading every word.' : 'You may need to rely on the public links because the gallery is still light.',
      hasPublicLinks ? `${linkCount} public link${linkCount === 1 ? '' : 's'} can help verify freshness and fit.` : 'The profile is missing broader public proof, so outreach may need more caution.',
      hasDirectEmail ? 'Direct email is available once the fit feels real.' : 'Use the inquiry form when you want a low-friction first contact.',
    ],
  };
}
