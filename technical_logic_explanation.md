# Technical Logic: How Unified Sections Handle Smart Cards and Auto-Fetching

This document explains the two core mechanisms that make the unified product section work without hardcoding or mismatching.

## 1. The "Smart Card" Logic (Frontend)

You mentioned that **Wholesale** and **Get Now (Loan)** products have different card designs. The unified system handles this by using a **Conditional Card Renderer**.

Even though you add a "Product Section," the products inside it are passed to the `UnifiedProductCard.tsx` component. This component "inspects" each product:

*   **If `product.isWholesaleOnly` is true:** It automatically switches the card to show wholesale prices and the "Bulk" button.
*   **If `product.allowCredit` is true:** It automatically switches the card to show the "Apply for Credit" button and the monthly payment calculation.
*   **Default:** It shows the standard "Buy Now" card.

**Result:** You can have a "New Arrivals" section that contains *both* a wholesale product and a loan product, and they will each look correct side-by-side because the card itself is smart.

## 2. The "Calculation Bridge" (Backend)

You asked how the backend understands how to "calculate" or "fetch" products for a new section without it being hardcoded. This happens through the **Section Rules Bridge**.

### How it works step-by-step:

1.  **The Rule Registry:** In `Backend/src/cms/section-rules.ts`, we have a list of "Rules." Each rule has an ID (like `new-arrivals`) and a set of **Query Parameters**.
    *   `new-arrivals` rule → `{ orderBy: { createdAt: 'desc' } }`
    *   `top-selling` rule → `{ orderBy: { orderItems: { _count: 'desc' } } }`

2.  **The Section Record:** When you add a section in the Admin Panel and name it "Latest Gadgets," the database only saves the `dataSourceId: "new-arrivals"`.

3.  **The Fetching Request:** When a user visits the site, the frontend asks the backend: *"Give me products for Section ID: [Section_UUID]"*.

4.  **The Calculation:** The backend `SectionDataSourceService` does this:
    *   It looks up the section and sees it uses `dataSourceId: "new-arrivals"`.
    *   It goes to the **Rule Registry** and finds the query parameters for `new-arrivals`.
    *   It then "calculates" the database query using those parameters.

**Result:** The system doesn't need a hardcoded "Latest Gadgets" function. It only needs to know that "Latest Gadgets" = "new-arrivals" logic. The backend then uses its existing `ProductsService` to perform the actual calculation (sorting by date, counting orders, etc.) in real-time.

## Summary
*   **The UI (Card)** is smart enough to change its look based on the product's data (Wholesale vs. Get Now).
*   **The Backend (Fetching)** uses a "Bridge" to turn a section's ID into a pre-defined database query, so you can add as many sections as you want without changing the code.
