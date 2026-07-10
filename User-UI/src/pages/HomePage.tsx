import HeroSection from "@/components/home/HeroSection";
import BrandsSection from "@/components/home/BrandsSection";
import CategorySection from "@/components/home/CategorySection";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import RecentlyViewedSection from "@/components/home/RecentlyViewedSection";
import TopSellingSection from "@/components/home/TopSellingSection";
import LimitedStockDealSection from "@/components/home/LimitedStockDealSection";
import AppliancesDealSection from "@/components/home/AppliancesDealSection";
import TopExpressSection from "@/components/home/TopExpressSection";
import UpgradeBanner from "@/components/home/UpgradeBanner";
import PromoBanners from "@/components/home/PromoBanners";
import NewestArrivalsSection from "@/components/home/NewestArrivalsSection";
import BestSellersSection from "@/components/home/BestSellersSection";
import TrendingSection from "@/components/home/TrendingSection";
import CategoryPromoBanners from "@/components/home/CategoryPromoBanners";
import ProductSection from "@/components/home/ProductSection";
import NewsletterPopup from "@/components/NewsletterPopup";

export default function HomePage() {
  return (
    <div>
      {/* Newsletter popup */}
      <NewsletterPopup />

      {/* 1. Hero slider */}
      <HeroSection />

      {/* 2. Top Brands */}
      <BrandsSection />

      {/* 3. Category cards */}
      <CategorySection />

      {/* 4. Flash Sales */}
      <FlashSaleSection />

      {/* 5. What You Viewed */}
      <RecentlyViewedSection />

      {/* 6. Top Selling Items */}
      <TopSellingSection />

      {/* 7. Limited Stock Deal (up to configurable % off) */}
      <LimitedStockDealSection />

      {/* 8. Appliances Deal */}
      <AppliancesDealSection />

      {/* 9. Top Express */}
      <TopExpressSection />

      {/* 10. Upgrade Banner (image-only carousel) */}
      <UpgradeBanner />

      {/* 11. Promo Banners */}
      <PromoBanners />

      {/* 12. Newest Arrivals */}
      <NewestArrivalsSection />

      {/* 13. Best Sellers */}
      <BestSellersSection />

      {/* 14. Trending Now */}
      <TrendingSection />

      {/* 15. Category Promo Banners */}
      <CategoryPromoBanners />

      {/* 16. Recommended For You */}
      <ProductSection
        title="Recommended For You"
        viewAllHref="/shop"
        params={{ take: 8 }}
        limit={8}
        scroll={true}
      />
    </div>
  );
}
