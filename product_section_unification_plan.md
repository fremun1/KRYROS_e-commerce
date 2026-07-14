# Technical Plan: Unifying Product Section Management

This plan focuses exclusively on consolidating the multiple product-related buttons in the Admin Panel CMS into a single, unified "Product Section" workflow.

## 1. The Problem: Button Clutter
The current Admin Panel presents separate buttons for every data source:
*   Top Selling Products
*   Trending Products
*   New Arrivals
*   Flash Sales
*   Featured Products
*   Sale Items
*   Get Now Eligible
*   Wholesale Products
*   Recently Viewed (currently separate)

## 2. The Solution: Unified Product Section
We will replace these 9+ separate buttons with a **single "Product Section" button**.

### 2.1. Updated Workflow
1.  Admin clicks **"Add Section"**.
2.  Admin selects **"Product Section"** from the template types.
3.  A **"Data Source" dropdown** appears inside the configuration modal.
4.  Admin selects the source (e.g., "Top Selling", "New Arrivals", "Recently Viewed").

### 2.2. Configuration Modal Changes
The modal for a Product Section will now include:
*   **Data Source Dropdown:** Select from the 9+ rules.
*   **Public Title:** (e.g., "Our Bestsellers").
*   **Item Limit:** (e.g., show 8 products).
*   **Layout:** (e.g., Horizontal Scroll or Grid).

## 3. Implementation Details

### 3.1. Backend (`Backend/src/cms/section-rules.ts`)
The rules are already well-defined. We don't need to change the logic of how products are fetched. We only change how they are presented to the Admin Panel.

### 3.2. Admin Panel (`Admin-Panel/app/cms-pages/page.tsx`)
*   **Group Rules:** We will modify `rulesGrouped` to treat all product-based rules as options within a single "Product Section" template.
*   **Dropdown Logic:** In the `Modal`, we will add a select field for `dataSourceId` that only appears when the `templateType` is `ProductShelf` or `Custom` (for Recently Viewed).

## 4. Why This Works
*   **Clean UI:** One button instead of nine.
*   **No Mismatch:** The `dataSourceId` is saved with the section. When the frontend loads the page, it sees the ID and tells the backend exactly which logic to use (e.g., "fetch new arrivals").
*   **Flexible:** You can add a "Product Section", name it "Weekly Deals", and set the source to "Sale Items".
