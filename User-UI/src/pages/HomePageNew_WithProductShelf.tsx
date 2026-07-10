/**
 * HomePageNew_WithProductShelf.tsx
 * 
 * This is an example of how HomePage.tsx can be refactored to use the new ProductShelf component.
 * 
 * BEFORE: Hardcoded imports of individual section components
 * AFTER: Dynamic ProductShelf instances that fetch products based on dataSourceId
 * 
 * This file demonstrates the migration path. Once tested, the changes can be applied to HomePage.tsx.
 */

import HeroSection from "@/components/home/HeroSection";
import BrandsSection from "@/components/home/BrandsSection";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import HomepageCategoryGrid from "@/components/home/HomepageCategoryGrid";
import RecentlyViewedSection from "@/components/home/RecentlyViewedSection";
import ProductShelf from "@/components/home/ProductShelf";
import LimitedStockDealSection from "@/components/home/LimitedStockDealSection";
import AppliancesDealSection from "@/components/home/AppliancesDealSection";
import TopExpressSection from "@/components/home/TopExpressSection";
import UpgradeBanner from "@/components/home/UpgradeBanner";
import PromoBanners from "@/components/home/PromoBanners";
import CategoryPromoBanners from "@/components/home/CategoryPromoBanners";
import NewsletterPopup from "@/components/NewsletterPopup";

export default function HomePageWithProductShelf() {
  return (
    <div>
      {/* Newsletter popup */}
      <NewsletterPopup />

      {/* 1. Hero slider */}
      <HeroSection />

      {/* 2. Top Brands */}
      <BrandsSection />

      {/* 3. Flash Sales */}
      <FlashSaleSection />

      {/* 4. Category Grid */}
      <HomepageCategoryGrid />

      {/* 5. Recently Viewed */}
      <RecentlyViewedSection />

      {/* 6. Top Selling Items — Now using ProductShelf with 'top-selling' data source */}
      <ProductShelf
        title="Top Selling Items"
        subtitle="Our best-performing products"
        dataSourceId="top-selling"
        limit={8}
        layout="horizontal-scroll"
        viewAllHref="/shop"
        viewAllText="See All"
      />

      {/* 7. Limited Stock Deal */}
      <LimitedStockDealSection />

      {/* 8. Appliances Deal */}
      <AppliancesDealSection />

      {/* 9. Top Express */}
      <TopExpressSection />

      {/* 10. Upgrade Banner */}
      <UpgradeBanner />

      {/* 11. Promo Banners */}
      <PromoBanners />

      {/* 12. Newest Arrivals — Now using ProductShelf with 'new-arrivals' data source */}
      <ProductShelf
        title="Newest Arrivals"
        subtitle="Fresh products just added"
        dataSourceId="new-arrivals"
        limit={8}
        layout="horizontal-scroll"
        viewAllHref="/shop"
        viewAllText="See All"
      />

      {/* 13. Best Sellers — Now using ProductShelf with 'top-selling' data source (reused!) */}
      <ProductShelf
        title="Best Sellers"
        subtitle="Customer favorites"
        dataSourceId="top-selling"
        limit={8}
        layout="horizontal-scroll"
        viewAllHref="/shop"
        viewAllText="See All"
      />

      {/* 14. Trending Now — Now using ProductShelf with 'trending-products' data source */}
      <ProductShelf
        title="Trending Now"
        subtitle="What's hot right now"
        dataSourceId="trending-products"
        limit={8}
        layout="horizontal-scroll"
        viewAllHref="/shop"
        viewAllText="See All"
      />

      {/* 15. Category Promo Banners */}
      <CategoryPromoBanners />

      {/* 16. Recommended For You — Now using ProductShelf with 'recommended-for-you' data source */}
      <ProductShelf
        title="Recommended For You"
        subtitle="Based on your browsing"
        dataSourceId="recommended-for-you"
        limit={8}
        layout="horizontal-scroll"
        viewAllHref="/shop"
        viewAllText="See All"
      />
    </div>
  );
}
