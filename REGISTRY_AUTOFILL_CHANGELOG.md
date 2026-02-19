# Registry URL Autofill Enhancement - Changelog

## Overview
Implemented a robust, extensible registry URL autofill system with retailer-specific adapters, starting with comprehensive Target support.

## Changes Made

### 1. URL Normalization (`supabase/functions/registry-preview/urlNormalizer.ts`)
- **Added URL canonicalization**: Removes tracking parameters (utm_*, ref, etc.)
- **Retailer detection**: Automatically identifies 15+ major retailers
- **Product ID extraction**:
  - Target TCIN (e.g., A-95024971)
  - Amazon ASIN (e.g., B07XYZ1234)
- **Duplicate detection**: `isSameProduct()` compares URLs by canonical form and product IDs

### 2. Adapter Architecture (`supabase/functions/registry-preview/adapterTypes.ts`)
- **ProductData interface**: Standardized format with confidence scoring and partial data support
- **RetailerAdapter interface**: Contract for implementing store-specific parsers
- **Helper functions**:
  - `extractJsonLdProduct()`: Parses structured JSON-LD Product schema
  - `extractOpenGraph()`: Extracts OpenGraph metadata
  - `extractMetaTags()`: Parses HTML meta tags
  - `parsePrice()`: Handles multiple currency formats
  - `generateFallbackTitle()`: Derives title from URL slug

### 3. Target Adapter (`supabase/functions/registry-preview/targetAdapter.ts`)
**Parsing strategies (in order of priority):**
1. **__NEXT_DATA__**: Extracts Target's Next.js embedded data
2. **JSON-LD Product schema**: Standard structured data
3. **OpenGraph + Meta tags**: Fallback metadata extraction
4. **URL slug fallback**: Generates human-readable title from URL

**Features:**
- Handles multiple Target data formats
- Confidence scoring (0.3 to 0.95)
- Partial data support with missing field tracking
- Browser-like request headers to improve success rate

### 4. Generic Adapter (`supabase/functions/registry-preview/genericAdapter.ts`)
- **Universal fallback**: Works with any e-commerce site
- **Multi-strategy parsing**: JSON-LD → OpenGraph → URL fallback
- **Smart store name derivation**: Extracts from hostname or brand data
- **Title cleanup**: Removes store suffixes from titles

### 5. Updated Edge Function (`supabase/functions/registry-preview/index.ts`)
- **Adapter routing**: Automatically selects appropriate parser
- **Enhanced error handling**: Returns partial data instead of failing completely
- **Improved caching**: Uses canonical URLs for deduplication
- **Extended timeout**: 15 seconds for complex pages
- **Better headers**: User-Agent, Accept-Language, Referer for bot detection bypass

### 6. Frontend Enhancements

#### RegistryItemForm.tsx
- **Partial data messaging**: "We could only import part of this item (missing: image, price)"
- **Refresh metadata button**: Re-fetch with force_refresh flag
- **Better error states**: Clear guidance when extraction fails
- **Smart prefilling**: Uses store_name field from adapter

#### registryTypes.ts
- Added `partial` and `missing_fields` to `RegistryPreview`
- Added `store_name` field support

#### registryService.ts
- **`findDuplicateItem()`**: Intelligent duplicate detection using:
  - Canonical URL matching
  - Item URL matching
  - Title matching (case-insensitive)
- **Session refresh**: Fixes 401 errors by calling `refreshSession()` instead of `getSession()`

### 7. Tests

#### URL Normalization Tests (`urlNormalizer.test.ts`)
- Tracking parameter removal
- TCIN/ASIN extraction
- Retailer detection
- Same-product comparison

#### Duplicate Detection Tests (`registryService.test.ts`)
- Canonical URL matching
- Title matching
- Case-insensitive comparison
- ID exclusion for edit mode

## User-Facing Improvements

### ✅ What Works Now
1. **Target URLs**: Reliably imports title, image, and price (when available)
2. **Partial imports**: Shows what was imported and what's missing
3. **User control**: Never blocks saving, always allows manual override
4. **Duplicate warnings**: Detects same product even with different URLs
5. **Refresh action**: Re-try extraction if first attempt fails
6. **Session handling**: No more "session expired" errors

### 📊 Confidence Scoring
- **0.95-1.0**: Complete data from specialized adapter
- **0.7-0.9**: Good data from JSON-LD or adapter
- **0.5-0.7**: Partial data from OpenGraph
- **0.3-0.5**: Minimal data or URL-based fallback
- **0.0-0.3**: Extraction failed, manual entry required

### 🎯 UX Flow
1. User pastes Target URL
2. System fetches and parses with Target adapter
3. **If full data**: Auto-fills all fields, shows success
4. **If partial data**: Auto-fills what's available, shows warning
5. **If extraction fails**: Saves URL, asks user to fill in details manually
6. User can always edit or refresh metadata

## Known Limitations

### Target-Specific
- **Bot detection**: Some Target pages may still block automated access (returns 403/429)
- **Regional variations**: Primarily tested with target.com (US)
- **Sale prices**: May not always detect discounted vs. regular price

### General
- **JavaScript-heavy sites**: Sites requiring JS execution may return incomplete HTML
- **Login-required products**: Cannot access products behind authentication
- **Rate limiting**: 30 requests per minute per IP address

### Future Enhancements
- Add Amazon adapter (with similar multi-strategy approach)
- Add Walmart adapter
- Add Etsy adapter
- Implement retry with exponential backoff
- Add image proxy for CORS-blocked images

## Technical Architecture

### Adapter Pattern Benefits
1. **Extensibility**: New retailers added by implementing `RetailerAdapter`
2. **Fallback chain**: Multiple parsing strategies per retailer
3. **Isolation**: Retailer-specific logic contained in separate modules
4. **Testability**: Each adapter can be tested independently

### Data Flow
```
User submits URL
  → normalizeUrl() → canonical form + retailer detection
  → Select adapter (Target/Generic)
  → Fetch HTML with browser headers
  → Parse with multiple strategies
  → Return ProductData with confidence score
  → Frontend shows appropriate UX based on confidence
  → Save to database with canonical_url for deduplication
```

## Migration Notes
- **No breaking changes**: Existing registry items unaffected
- **Backward compatible**: Old preview data still works
- **Database**: No schema changes required (uses existing fields)
- **Cache**: Old cache entries gradually replaced with new format

## Testing Summary
- ✅ URL normalization: 7 tests passing
- ✅ Duplicate detection: 6 tests passing
- ✅ Build: No regressions, all modules compiled successfully
- ✅ Edge function: Deployed successfully

## Success Metrics
- **Before**: Target URLs often failed or returned incomplete data
- **After**: Target URLs import at minimum a title, often with image/price
- **Fallback UX**: 100% of URLs now save successfully (even if data extraction fails)
- **User control**: Users can always override or refresh metadata
