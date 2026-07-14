# Fully Dynamic Section System: Beyond Hardcoded Rules

This plan outlines how to transform the KRYROS CMS from a fixed list of rules into a **Fully Dynamic Filter System**. This allows you to create sections for anything (e.g., "Apple Products," "Summer Tech Deals," "Samsung Under $500") without any new backend code.

## 1. The "Dynamic Filter" Concept

Instead of picking a hardcoded rule like "New Arrivals," the unified "Product Section" will allow you to build a **Custom Query** right in the Admin Panel.

### How the Admin Panel will look (`Admin-Panel/app/cms-pages/page.tsx`):
When an administrator adds a "Product Section" and opens its configuration modal, they will encounter a **"Dynamic Query Builder"** interface. This interface will allow them to define the product fetching logic without writing code.

Key UI elements within the modal will include:

*   **Section Title & Subtitle:** Standard fields for display.
*   **Layout Type:** (Dropdown) e.g., "Horizontal Scroll," "Grid," "Carousel."
*   **Product Limit:** (Number input) e.g., 8, 12, 20.
*   **Data Source Type:** (Radio buttons/Dropdown) This will be a new field to select between:
    *   **"Pre-defined Rule"**: For existing fixed rules like "Top Selling" or "New Arrivals" (if still desired for simplicity).
    *   **"Dynamic Filter"**: This option will reveal the "Build Your Query" interface.

#### The "Build Your Query" Interface (Conditional Display):
This section will only appear when "Dynamic Filter" is selected as the Data Source Type.

*   **Brand Filter:**
    *   **UI:** A multi-select dropdown or searchable input populated with all available brands from the database.
    *   **Functionality:** Allows selection of one or more brands (e.g., "Apple," "Samsung").
*   **Category Filter:**
    *   **UI:** A multi-select dropdown or searchable input populated with all available categories.
    *   **Functionality:** Allows selection of one or more categories (e.g., "Smartphones," "Laptops").
*   **Price Range Filter:**
    *   **UI:** Two number input fields for "Minimum Price" and "Maximum Price."
    *   **Functionality:** Filters products within a specified price range.
*   **Product Status/Flags Filter:**
    *   **UI:** Checkboxes for `isNew`, `isFeatured`, `isFlashSale`, `allowCredit`, `isWholesaleOnly`, `lowStock`.
    *   **Functionality:** Allows inclusion of products based on these boolean flags.
*   **Search Keyword Filter:**
    *   **UI:** A text input field.
    *   **Functionality:** Filters products whose name or description contains the entered keyword.
*   **Sort By:**
    *   **UI:** A dropdown with options like "Newest First," "Price Low to High," "Price High to Low," "Most Popular (Sales)," "Most Popular (Wishlists)."
    *   **Functionality:** Defines the order in which products are displayed.

This UI will directly construct the `config` JSON object that the backend will then use to build the `Prisma` query.

## 2. How it Works (No Hardcoding)

### Step 1: Saving the Configuration
When you save the section, the Admin Panel saves these filters as a JSON object in the `config` field of the section record.
*Example:* `config: { brand: "apple", category: "smartphones", limit: 8 }`

### Step 2: The "Smart Fetcher" (Backend)
We will update the `SectionDataSourceService` to handle a new type of rule called `dynamic-query`.

When the backend receives a request for a `dynamic-query` section, the `SectionDataSourceService` will:
1.  **Retrieve the `config` object** associated with that `CMSSection` from the database.
2.  **Parse the `config` object** to extract the dynamic filters (e.g., `brand`, `category`, `priceRange`, `status`, `sortBy`).
3.  **Construct a `Prisma` query dynamically** based on these filters. This will involve mapping the frontend-defined filters to the `where` and `orderBy` clauses of the `productsService.findAll` method.
    *   **Brand Filter:** If `config.brand` is present, add `where: { brand: { slug: config.brand } }`.
    *   **Category Filter:** If `config.category` is present, add `where: { category: { slug: config.category } }`.
    *   **Price Range:** If `config.minPrice` and `config.maxPrice` are present, add `where: { price: { gte: config.minPrice, lte: config.maxPrice } }`.
    *   **Status Filters:** If `config.status` includes `isFlashSale`, `allowCredit`, `isWholesaleOnly`, these will be mapped to `where` clauses (e.g., `where: { isFlashSale: true }`).
    *   **Sort By:** If `config.sortBy` is present, map it to the appropriate `orderBy` clause (e.g., `sortBy: "newest"` → `orderBy: { createdAt: 'desc' }`).
4.  **Execute the `productsService.findAll` method** with the dynamically constructed query parameters.

This approach leverages the existing robust filtering capabilities of the `ProductsService` without requiring new hardcoded functions for each new section type.

## 3. Real-World Example: "Apple Arrival Section"

If you want to add an "Apple Arrival" section as you mentioned:
1.  **Add Section** → Select **Product Section**.
2.  **Title:** "Apple Arrival".
3.  **Filters:**
    *   Brand: **Apple**
    *   Sort By: **Newest**
4.  **Save.**

**The system understands:** It fetches all products where `brand == Apple` and `orderBy == createdAt DESC`. You didn't have to write a single line of code to make this work.

## 4. Why this is Better
*   **Infinite Possibilities:** You can create thousands of different combinations.
*   **Truly Dynamic:** As soon as you upload a new Apple product, it automatically appears in any section filtered for "Apple."
*   **Future-Proof:** You don't need a developer every time you want a new type of section.
