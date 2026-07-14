# Code Analysis Findings: KRYROS Product Section & Details

## 1. Product Details Page (`ProductPage.tsx`)
*   **Dynamic Logic:** The page already uses `if/else` logic to handle `allowCredit` and `isWholesaleOnly`.
*   **Hardcoded Elements:** 
    *   `renderSpecs` function (lines 48-87) handles JSON or plain text specifications.
    *   Trust badges (lines 605-626) use `popularItemText`, `freeReturnsText`, `fiveYearGuaranteeText`, etc., with fallbacks.
*   **Missing Connection:** Some fields like `wholesalePrice` and `wholesaleMoq` are used for logic but might not be fully displayed in the "Details" accordion if they aren't in the `specifications` field.

## 2. CMS Section Rendering (`DynamicSectionRendererV2.tsx`)
*   **Hardcoded Mapping:** Lines 74-81 map legacy template types to `dataSourceId` strings.
*   **Limited Params:** Only `isFeatured`, `categoryId`, `categorySlug`, and `popularity` are passed to `ProductShelf`.
*   **Action Needed:** This needs to be expanded to pass the entire `config` object to allow for dynamic brand/price/status filters.

## 3. Product Shelf Fetching (`ProductShelf.tsx`)
*   **Fetching Logic:** It tries `/api/cms/sections/products-by-source` first, then falls back to `/api/products`.
*   **Limitation:** It only passes a few params. It needs to support a full set of dynamic filters.

## 4. Admin Panel CMS (`Admin-Panel/app/cms-pages/page.tsx`)
*   **Clutter:** Every backend rule is a separate button in the `TypeSelector`.
*   **Limited Config:** The configuration modal (lines 378-760) only has fields for `limit`, `layout`, `showTimer`, `showPercent`, `categoryId`, and `categorySlug`.
*   **Action Needed:** Consolidate product rules into one "Product Section" and add a "Query Builder" UI for dynamic filtering.

## 5. Backend Fetching (`SectionDataSourceService.ts`)
*   **Fixed Rules:** Currently only supports rules defined in `section-rules.ts`.
*   **Action Needed:** Add a `dynamic-query` rule that parses the `config` object and builds a custom Prisma query.
