# Technical Connection: How Upload Pages and Unified Sections Work Together

This document explains how the system ensures that products uploaded through different admin pages (Normal, Wholesale, Get Now) are correctly identified and fetched by the unified CMS sections.

## 1. The "Identity Flags" (Database Level)

Even though you have different uploading pages in the Admin Panel, they all save products into the same `Product` table in the database. The difference is the **Flags** they set:

| Upload Page | Key Flag Set in Database |
| :--- | :--- |
| **Normal Product Page** | `isWholesaleOnly: false`, `allowCredit: false` |
| **Wholesale Upload Page** | `isWholesaleOnly: true` |
| **Get Now (Credit) Upload Page** | `allowCredit: true` |

## 2. How the System "Picks" the Products

When you add a unified "Product Section" and select a "Data Source," the backend uses these **Identity Flags** to filter the products. It doesn't matter *which* page you used to upload them; the system only cares about the flags in the database.

### Example Scenarios:

*   **Scenario A: You want a "Wholesale Deals" section.**
    1.  You select the "Wholesale Products" data source in the CMS.
    2.  The backend calculates: `SELECT * FROM products WHERE isWholesaleOnly = true`.
    3.  **Result:** It only picks products you uploaded through the Wholesale page.

*   **Scenario B: You want a "Get Now (Loan)" section.**
    1.  You select the "Get Now Eligible" data source in the CMS.
    2.  The backend calculates: `SELECT * FROM products WHERE allowCredit = true`.
    3.  **Result:** It only picks products you uploaded through the Credit/Loan page.

*   **Scenario C: You want "New Arrivals" (Mixed).**
    1.  You select the "New Arrivals" data source.
    2.  The backend calculates: `SELECT * FROM products ORDER BY createdAt DESC`.
    3.  **Result:** It picks the latest products regardless of which page they were uploaded from (Normal, Wholesale, or Credit).

## 3. Why this is Robust
By using these database flags, the system remains "Identity Aware." It doesn't "forget" that a product is a wholesale product just because it's being shown in a "New Arrivals" section. The frontend card will see the `isWholesaleOnly: true` flag and automatically show the Wholesale design.

## Conclusion
The separate upload pages are for **your convenience** (to enter specific data like MOQ or Credit terms), but the **Unified Sections** use the resulting database flags to intelligently "pick" and "display" those products without mismatch.
