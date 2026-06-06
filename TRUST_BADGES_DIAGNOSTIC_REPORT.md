# Trust Badges Section - Diagnostic & Fix Report

**Date**: 2026-06-04  
**Status**: Investigating data mismatch between Admin Panel and Frontend  
**Priority**: Medium

---

## Issue Description

The Trust Badges section on the homepage is not syncing properly with Admin Panel CMS edits. When admins edit the trust badges in the CMS panel, changes are not appearing on the frontend homepage.

---

## Root Cause Analysis

### Data Flow Architecture

```
Admin Panel (CMS)
    ↓ (PUT request)
Backend: PUT /api/cms/homepage-sections/:id
    ↓
Database: HomePageSection table (type='TrustBadges')
    ↓
Cache: Redis/Memory cache (5 min TTL)
    ↓
Frontend API: GET /api/cms/homepage-sections?type=TrustBadges
    ↓
TrustBadges.tsx Component
    ↓
Homepage Display
```

### Identified Issues

#### 1. **Cache Invalidation Problem** ⚠️
- **Location**: `Backend/src/cms/cms.service.ts` (lines 24-32)
- **Issue**: When `updateHomePageSection()` is called, it calls `invalidateCmsCache()` but the cache key might not match the retrieval key
- **Current Code**:
  ```typescript
  async invalidateCmsCache(type?: string) {
    const keys = [
      'cms:banners',
      'cms:sections',
      type ? `cms:sections:${type}` : null,
    ].filter(Boolean) as string[];
    await Promise.all(keys.map(k => this.cacheManager.del(k)));
  }
  ```
- **Problem**: The cache invalidation doesn't include the `cms:sections:TrustBadges` key when updating a specific type

#### 2. **Admin Panel Save Logic** ⚠️
- **Location**: `Frontend/Admi-Panel/app/cms-pages/page.tsx` (lines 641-664)
- **Issue**: The admin panel uses `createCmsHomepageSection()` for new sections but the mapping might not preserve the correct `type` value
- **Current Code**:
  ```typescript
  const type = HP_SECTION_TYPE[secName] || secName;
  createCmsHomepageSection({ type, config: { ...content, ...(mediaUrl ? { media: mediaUrl } : {}) }, isActive: true })
  ```
- **Problem**: The `HP_SECTION_TYPE` mapping shows `'Trust Badges': 'TrustBadges'` but there's no guarantee the admin panel is using this mapping correctly

#### 3. **Frontend JSON Parsing** ⚠️
- **Location**: `Frontend/User-UI/artifacts/kryros/src/components/home/TrustBadges.tsx` (lines 15-33)
- **Issue**: The component expects `config.items` to be an array, but the admin panel might be saving it as a JSON string
- **Current Code**:
  ```typescript
  function homepageSectionToTrustBadges(sec: ApiHomepageSection): TrustBadge[] | null {
    const cfg = (sec.config || {}) as Record<string, any>;
    let items = cfg.items;
    if (!items && cfg.value?.items) {
      items = cfg.value.items;
    }
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
  ```
- **Problem**: If `config.items` is a JSON string instead of an array, this will fail silently

#### 4. **Backend Config Parsing** ⚠️
- **Location**: `Backend/src/cms/cms.service.ts` (lines 79-89)
- **Issue**: The backend parses JSON strings in config but might not handle nested structures correctly
- **Current Code**:
  ```typescript
  async updateHomePageSection(id: string, data: UpdateHomePageSectionDto) {
    const result = await this.prisma.homePageSection.update({
      where: { id },
      data: {
        ...data,
        config: data.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : undefined,
      } as any,
    });
    await this.invalidateCmsCache();
    return result;
  }
  ```
- **Problem**: The cache invalidation is called but doesn't specify the type, so it might not invalidate the specific `TrustBadges` cache key

---

## Fixes Required

### Fix 1: Improve Cache Invalidation
**File**: `Backend/src/cms/cms.service.ts`

Update the `updateHomePageSection()` method to pass the type to cache invalidation:

```typescript
async updateHomePageSection(id: string, data: UpdateHomePageSectionDto) {
  const result = await this.prisma.homePageSection.update({
    where: { id },
    data: {
      ...data,
      config: data.config ? (typeof data.config === 'string' ? JSON.parse(data.config) : data.config) : undefined,
    } as any,
  });
  // Invalidate cache for this specific type
  await this.invalidateCmsCache(result.type);
  return result;
}
```

### Fix 2: Ensure Correct Type Mapping
**File**: `Frontend/Admi-Panel/app/cms-pages/page.tsx`

Verify that the `HP_SECTION_TYPE` mapping includes `'Trust Badges': 'TrustBadges'` (already present at line 635).

### Fix 3: Handle JSON String Config
**File**: `Frontend/User-UI/artifacts/kryros/src/components/home/TrustBadges.tsx`

Update the mapper to handle JSON strings:

```typescript
function homepageSectionToTrustBadges(sec: ApiHomepageSection): TrustBadge[] | null {
  let cfg = (sec.config || {}) as Record<string, any>;
  
  // If config is a JSON string, parse it
  if (typeof cfg === 'string') {
    try {
      cfg = JSON.parse(cfg);
    } catch {
      return null;
    }
  }
  
  // Support both direct items array and nested structure
  let items = cfg.items;
  if (!items && cfg.value?.items) {
    items = cfg.value.items;
  }
  
  // If items is a JSON string, parse it
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      return null;
    }
  }
  
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  
  return items.map((item: any) => ({
    icon: item.icon || "Truck",
    title: item.title || "",
    subtitle: item.subtitle || "",
  }));
}
```

### Fix 4: Add Logging for Debugging
**File**: `Backend/src/cms/cms.service.ts`

Add debug logging to track cache invalidation:

```typescript
async invalidateCmsCache(type?: string) {
  const keys = [
    'cms:banners',
    'cms:sections',
    type ? `cms:sections:${type}` : null,
  ].filter(Boolean) as string[];
  
  console.log(`[CMS Cache] Invalidating keys:`, keys);
  await Promise.all(keys.map(k => this.cacheManager.del(k)));
}
```

---

## Testing Checklist

- [ ] Admin edits Trust Badges in CMS panel
- [ ] Save button is clicked
- [ ] Backend receives PUT request with correct type and config
- [ ] Cache is invalidated for `cms:sections:TrustBadges`
- [ ] Frontend fetches fresh data from `/api/cms/homepage-sections?type=TrustBadges`
- [ ] TrustBadges component receives updated config
- [ ] Homepage displays updated badges immediately
- [ ] Mobile and desktop layouts render correctly

---

## Implementation Steps

1. **Apply Fix 1**: Update cache invalidation in backend
2. **Apply Fix 2**: Verify type mapping in admin panel
3. **Apply Fix 3**: Enhance JSON parsing in frontend component
4. **Apply Fix 4**: Add logging for debugging
5. **Test**: Manually test the entire flow
6. **Commit**: Push changes to GitHub

---

## Files to Modify

1. `Backend/src/cms/cms.service.ts` - Cache invalidation
2. `Frontend/User-UI/artifacts/kryros/src/components/home/TrustBadges.tsx` - JSON parsing
3. `Frontend/Admi-Panel/app/cms-pages/page.tsx` - Verify type mapping (no changes needed)

---

## Expected Outcome

After implementing these fixes:
- Admin panel edits will immediately reflect on the frontend
- Cache will be properly invalidated
- JSON string configs will be parsed correctly
- Logging will help debug any future issues
