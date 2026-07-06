import HeroSection from "@/components/home/HeroSection";
import TrustBadges from "@/components/home/TrustBadges";
import CategorySection from "@/components/home/CategorySection";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import UpgradeBanner from "@/components/home/UpgradeBanner";
import PromoBanners from "@/components/home/PromoBanners";
import CategoryPromoBanners from "@/components/home/CategoryPromoBanners";
import BrandsSection from "@/components/home/BrandsSection";
import RecentlyViewedSection from "@/components/home/RecentlyViewedSection";
import TopSellingSection from "@/components/home/TopSellingSection";
import NewestArrivalsSection from "@/components/home/NewestArrivalsSection";
import BestSellersSection from "@/components/home/BestSellersSection";
import TrendingSection from "@/components/home/TrendingSection";
import ProductSection from "@/components/home/ProductSection";
import NewsletterPopup from "@/components/NewsletterPopup";

export default function HomePage() {
  return (
    <div>
      {/* Newsletter popup — shows on every homepage visit unless already subscribed */}
      <NewsletterPopup />

      {/* 1. Hero slider */}
      <HeroSection />

      {/* 2. Top Brands — right after hero */}
      <BrandsSection />

      {/* 3. Trust badges */}
      <TrustBadges />

      {/* 4. Category cards horizontal scroll */}
      <CategorySection />

      {/* 5. Flash Sale banner + Flash Deals horizontal scroll */}
      <FlashSaleSection />

      {/* 6. What You Viewed — products the user recently browsed */}
      <RecentlyViewedSection />

      {/* 7. Top Selling Items — auto-picked by sales performance */}
      <TopSellingSection />

      {/* 8. Upgrade Your Tech Game banner */}
      <UpgradeBanner />

      {/* 9. Promo banners: Get Now + Free Shipping */}
      <PromoBanners />

      {/* 10. Newest Arrivals */}
      <NewestArrivalsSection />

      {/* 11. Best Sellers */}
      <BestSellersSection />

      {/* 12. Trending Now */}
      <TrendingSection />

      {/* 13. Category promotional banners */}
      <CategoryPromoBanners />

      {/* 14. Recommended For You — horizontal scroll */}
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
