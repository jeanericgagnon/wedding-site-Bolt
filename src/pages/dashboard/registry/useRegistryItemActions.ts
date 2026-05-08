import { createRegistryItem, deleteRegistryItem, fetchUrlPreview, ownerMarkPurchased, updateRegistryItem } from './registryService';
import type { RegistryItem, RegistryItemDraft } from './registryTypes';
import { sanitizeRegistryQuantityState } from './registryTypes';

const WEEKLY_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;
const DIRECT_IMAGE_HOST_HINTS = ['images-na.ssl-images-amazon.com', 'm.media-amazon.com', 'cdn', 'images'];
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif|avif|heic)(\?.*)?$/i;

function normalizeRegistryImageUrl(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (IMAGE_EXT_RE.test(path)) return parsed.toString();
    if (DIRECT_IMAGE_HOST_HINTS.some((hint) => host.includes(hint)) && !path.includes('/dp/')) return parsed.toString();
    return null;
  } catch {
    return null;
  }
}

interface UseRegistryItemActionsArgs {
  editItem: RegistryItem | null;
  isDemoMode: boolean;
  items: RegistryItem[];
  normalizeOwnerDashboardRegistryItem: (item: RegistryItem) => RegistryItem;
  setEditItem: React.Dispatch<React.SetStateAction<RegistryItem | null>>;
  setItems: React.Dispatch<React.SetStateAction<RegistryItem[]>>;
  setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (message: string, type?: 'success' | 'error') => void;
  logRegistryAction: (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => void;
  weddingSiteId: string | null;
}

export function useRegistryItemActions(args: UseRegistryItemActionsArgs) {
  const {
    editItem,
    isDemoMode,
    items,
    normalizeOwnerDashboardRegistryItem,
    setEditItem,
    setItems,
    setShowForm,
    toast,
    logRegistryAction,
    weddingSiteId,
  } = args;

  async function handleSave(draft: RegistryItemDraft) {
    if (!weddingSiteId) throw new Error('No wedding site found');

    const parsedPrice = draft.price_amount ? parseFloat(draft.price_amount) : null;
    const parsedGoal = draft.fund_goal_amount ? parseFloat(draft.fund_goal_amount) : null;
    const parsedReceived = draft.fund_received_amount ? parseFloat(draft.fund_received_amount) : null;
    const isCashFund = draft.item_type === 'cash_fund';

    let normalizedImageUrl = isCashFund ? null : normalizeRegistryImageUrl(draft.image_url || '');
    if (!isCashFund && !normalizedImageUrl && draft.item_url?.trim()) {
      try {
        const preview = await fetchUrlPreview(draft.item_url.trim(), false);
        normalizedImageUrl = normalizeRegistryImageUrl(preview.image_url || '');
      } catch {
        // ignore preview fetch failures
      }
    }

    if (!isCashFund && draft.image_url.trim() && !normalizedImageUrl) {
      toast('Image URL must be a direct image file link (or leave it blank and we’ll auto-pull one).', 'error');
      return;
    }

    const quantityState = sanitizeRegistryQuantityState(
      editItem?.quantity_purchased ?? 0,
      isCashFund ? 1 : (parseInt(draft.desired_quantity) || 1),
    );

    const fields: Partial<RegistryItem> = {
      item_type: isCashFund ? 'cash_fund' : 'product',
      item_name: draft.item_name.trim(),
      price_label: null,
      price_amount: isCashFund ? null : (parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null),
      merchant: isCashFund ? null : (draft.merchant || null),
      store_name: isCashFund ? null : (draft.merchant || null),
      item_url: isCashFund ? null : (draft.item_url || null),
      canonical_url: isCashFund ? null : (draft.canonical_url || draft.item_url || null),
      image_url: normalizedImageUrl,
      description: isCashFund ? null : (draft.description || null),
      notes: draft.notes || draft.description || null,
      quantity_needed: quantityState.quantityNeeded,
      quantity_purchased: quantityState.quantityPurchased,
      purchase_status: quantityState.purchaseStatus,
      hide_when_purchased: isCashFund ? false : draft.hide_when_purchased,
      availability: isCashFund ? null : (draft.availability || null),
      metadata_fetch_status: isCashFund ? 'manual' : (draft.metadata_fetch_status || 'manual'),
      metadata_confidence_score: isCashFund ? null : (draft.metadata_confidence_score ?? null),
      metadata_source_method: isCashFund ? 'manual' : (draft.metadata_source_method ?? 'manual'),
      metadata_retailer: isCashFund ? null : (draft.metadata_retailer || draft.merchant || null),
      fund_goal_amount: parsedGoal !== null && !isNaN(parsedGoal) ? parsedGoal : null,
      fund_received_amount: parsedReceived !== null && !isNaN(parsedReceived) ? parsedReceived : 0,
      fund_venmo_url: draft.fund_venmo_url || null,
      fund_paypal_url: draft.fund_paypal_url || null,
      fund_zelle_handle: draft.fund_zelle_handle || null,
      fund_custom_url: draft.fund_custom_url || null,
      fund_custom_label: draft.fund_custom_label || null,
      metadata_last_checked_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
    };

    if (isDemoMode) {
      if (editItem) {
        setItems((prev) => prev.map((item) => (item.id === editItem.id ? normalizeOwnerDashboardRegistryItem({ ...item, ...fields, updated_at: new Date().toISOString() }) : item)));
        toast('Item updated');
      } else {
        const created: RegistryItem = {
          id: `demo-registry-${Date.now()}`,
          wedding_site_id: weddingSiteId,
          item_type: (fields.item_type as 'product' | 'cash_fund') ?? 'product',
          item_name: fields.item_name || 'Untitled item',
          price_label: fields.price_label ?? null,
          price_amount: fields.price_amount ?? null,
          store_name: fields.store_name ?? null,
          merchant: fields.merchant ?? null,
          item_url: fields.item_url ?? null,
          canonical_url: fields.canonical_url ?? null,
          image_url: fields.image_url ?? null,
          description: fields.description ?? null,
          notes: fields.notes ?? null,
          quantity_needed: fields.quantity_needed ?? 1,
          quantity_purchased: 0,
          purchaser_name: null,
          purchase_status: 'available',
          hide_when_purchased: fields.hide_when_purchased ?? false,
          sort_order: items.length,
          priority: 'medium',
          availability: fields.availability ?? null,
          metadata_last_checked_at: new Date().toISOString(),
          metadata_fetch_status: fields.metadata_fetch_status ?? 'manual',
          metadata_confidence_score: fields.metadata_confidence_score ?? null,
          metadata_source_method: fields.metadata_source_method ?? 'manual',
          metadata_retailer: fields.metadata_retailer ?? null,
          previous_price_amount: null,
          price_last_changed_at: null,
          next_refresh_at: new Date(Date.now() + WEEKLY_REFRESH_MS).toISOString(),
          last_auto_refreshed_at: null,
          refresh_fail_count: 0,
          fund_goal_amount: fields.fund_goal_amount ?? null,
          fund_received_amount: fields.fund_received_amount ?? 0,
          fund_venmo_url: fields.fund_venmo_url ?? null,
          fund_paypal_url: fields.fund_paypal_url ?? null,
          fund_zelle_handle: fields.fund_zelle_handle ?? null,
          fund_custom_url: fields.fund_custom_url ?? null,
          fund_custom_label: fields.fund_custom_label ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setItems((prev) => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
        toast('Item added to registry');
      }
      setShowForm(false);
      setEditItem(null);
      return;
    }

    if (editItem) {
      const updated = await updateRegistryItem(editItem.id, fields);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : item)));
      logRegistryAction('registry_item_updated', 'Registry item was updated.', {
        itemType: updated.item_type ?? 'product',
        hideWhenPurchased: updated.hide_when_purchased,
        purchaseStatus: updated.purchase_status,
        quantityNeeded: updated.quantity_needed,
      }, updated.id, updated.item_name);
      toast('Item updated');
    } else {
      const created = await createRegistryItem(weddingSiteId, fields);
      setItems((prev) => [...prev, normalizeOwnerDashboardRegistryItem(created)]);
      logRegistryAction('registry_item_created', 'Registry item was created.', {
        itemType: created.item_type ?? 'product',
        hideWhenPurchased: created.hide_when_purchased,
        purchaseStatus: created.purchase_status,
        quantityNeeded: created.quantity_needed,
      }, created.id, created.item_name);
      toast('Item added to registry');
    }

    setShowForm(false);
    setEditItem(null);
  }

  async function handleDelete(id: string) {
    try {
      const item = items.find((candidate) => candidate.id === id);
      if (!isDemoMode) {
        await deleteRegistryItem(id);
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      logRegistryAction('registry_item_deleted', 'Registry item was deleted.', {
        purchaseStatus: item?.purchase_status ?? null,
        quantityPurchased: item?.quantity_purchased ?? null,
        quantityNeeded: item?.quantity_needed ?? null,
      }, id, item?.item_name || 'Registry item');
      toast('Item removed');
    } catch {
      toast('Couldn’t remove that item. Please try again.', 'error');
    }
  }

  async function handleMarkPurchased(item: RegistryItem, qty: number) {
    try {
      const updated = isDemoMode
        ? (() => {
            const quantityState = sanitizeRegistryQuantityState(item.quantity_purchased + qty, item.quantity_needed);
            return {
              ...item,
              quantity_needed: quantityState.quantityNeeded,
              quantity_purchased: quantityState.quantityPurchased,
              purchase_status: quantityState.purchaseStatus,
              updated_at: new Date().toISOString(),
            };
          })()
        : await ownerMarkPurchased(item.id, qty);

      setItems((prev) => prev.map((candidate) => (candidate.id === updated.id ? normalizeOwnerDashboardRegistryItem(updated) : candidate)));
      logRegistryAction('registry_purchase_marked', 'Registry purchase status was updated by the owner.', {
        incrementBy: qty,
        quantityPurchased: updated.quantity_purchased,
        quantityNeeded: updated.quantity_needed,
        purchaseStatus: updated.purchase_status,
      }, updated.id, updated.item_name);
      toast(
        updated.purchase_status === 'purchased'
          ? `"${item.item_name}" marked as fully purchased`
          : `"${item.item_name}" updated — ${updated.quantity_purchased}/${updated.quantity_needed} purchased`,
      );
    } catch {
      toast('Couldn’t update purchase status. Please try again.', 'error');
    }
  }

  return {
    handleDelete,
    handleMarkPurchased,
    handleSave,
  };
}
