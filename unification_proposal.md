# Proposal: Unified Product Section Management for KRYROS CMS

This proposal outlines a plan to consolidate the multiple product-related buttons in the Admin Panel CMS into a single, unified "Add Section" workflow. This will streamline the user experience and provide a more intuitive way to manage various types of product displays.

## 1. Current State vs. Proposed Vision

### Current State
Currently, the Admin Panel CMS (in `cms-pages/page.tsx`) uses multiple logic paths and potentially multiple buttons (as noted by the user) to add different types of product sections like "Flash Sales," "New Arrivals," and "Featured Products." This can be confusing and leads to a fragmented interface.

### Proposed Vision
A single "Add Section" button that opens a **Template Selector**. This selector will categorize templates into distinct groups: **Products**, **Banners**, **Categories**, and **Brands**. 

Crucially, the "unification" focuses on the **Products group**. Instead of having separate buttons for "Flash Sales," "New Arrivals," and "Featured Products," these will all be managed under a single **"Product Shelf"** or **"Product Grid"** template. Once the product template is selected, the administrator then chooses the specific **Data Source** (e.g., Best Selling, Newest, Flash Sale) within that section's configuration. Banners and Categories will remain as their own distinct template types within the same selector, ensuring no functional mix-up.

## 2. Technical Implementation Plan

### 2.1. Unified Admin UI (`Admin-Panel`)

We will modify `Admin-Panel/app/cms-pages/page.tsx` to:
1.  **Single Entry Point:** Replace multiple "Add" buttons with one "Add Section" button.
2.  **Two-Step Configuration Modal:**
    *   **Step 1: Template Selection:** The user chooses the visual layout (Product Shelf, Grid, Carousel).
    *   **Step 2: Data Source Configuration:** Within the same modal, the user selects how products are fetched.
3.  **Dynamic Rule Loading:** The modal will fetch available rules from the backend's `section-rules.ts` to populate the data source options.

### 2.2. Intelligent Product Fetching (`Backend`)

The system will understand how to fetch products without hardcoding for every new section:

| Data Source | Logic / Calculation | Fetching Strategy |
| :--- | :--- | :--- |
| **New Arrivals** | `orderBy: { createdAt: 'desc' }` | Auto-fetch latest products. |
| **Best Sellers** | `orderBy: { orderItems: { _count: 'desc' } }` | Auto-calculate based on order volume. |
| **Trending** | `orderBy: [{ orderItems: { _count: 'desc' } }, { wishlists: { _count: 'desc' } }]` | Combine sales and wishlist data. |
| **Flash Sales** | `where: { isFlashSale: true, isActive: true }` | Fetch products with active flash sale flags. |
| **Manual / Featured** | `where: { isFeatured: true }` | Fetch products manually flagged by admin. |

### 2.3. Handling "Mismatch" and Custom Sections

To prevent product mismatch (e.g., Best Sellers showing in a New Arrivals section):
*   **DataSourceId Binding:** Every section record in the database will store a `dataSourceId`.
*   **Backend Validation:** When the frontend requests products for a section, the backend looks up the `dataSourceId` in the `SECTION_RULES` registry and applies the corresponding logic.
*   **Custom Naming:** The "Public Title" (e.g., "Our Hottest Picks") is independent of the "Data Source" (e.g., "Trending Products"), allowing admins to name sections whatever they want while the system handles the correct logic.

## 3. Benefits of Unification

*   **Simplified UI:** Reduces clutter in the Admin Panel.
*   **Flexibility:** Allows admins to create multiple sections of the same type (e.g., two different "Featured" shelves) with different titles and limits.
*   **Scalability:** New data fetching rules can be added to the backend `section-rules.ts` and will automatically appear as options in the Admin Panel without needing UI changes.
*   **Automation:** Reduces manual work by leveraging the system's ability to "decide" and "calculate" which products to show based on real-time data.
