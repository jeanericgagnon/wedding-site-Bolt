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
  badges: string[];
}

export interface VendorDecisionDeckModel {
  heading: string;
  summary: string;
  badges: string[];
  items: VendorDecisionDeckItem[];
}

export interface VendorProfileGuideModel {
  label: string;
  title: string;
  detail: string;
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
    checks: [
      hasGalleryDepth ? 'The images give a decent style signal, so use those before reading every word.' : 'You may need to rely on the public links because the gallery is still light.',
      hasPublicLinks ? `${linkCount} public link${linkCount === 1 ? '' : 's'} can help verify freshness and fit.` : 'The profile is missing broader public proof, so outreach may need more caution.',
      hasDirectEmail ? 'Direct email is available once the fit feels real.' : 'Use the inquiry form when you want a low-friction first contact.',
    ],
  };
}
