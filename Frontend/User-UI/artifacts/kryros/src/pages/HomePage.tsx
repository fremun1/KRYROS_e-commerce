import HeroSection from "@/components/home/HeroSection";
import TrustBadges from "@/components/home/TrustBadges";
import CategorySection from "@/components/home/CategorySection";
import FlashSaleSection from "@/components/home/FlashSaleSection";
import UpgradeBanner from "@/components/home/UpgradeBanner";
import PromoBanners from "@/components/home/PromoBanners";
import CategoryPromoBanners from "@/components/home/CategoryPromoBanners";
import FeaturedProductsSection from "@/components/home/FeaturedProductsSection";
import ProductSection from "@/components/home/ProductSection";
import BrandsSection from "@/components/home/BrandsSection";
import RecentlyViewedSection from "@/components/home/RecentlyViewedSection";
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

      {/* 6. Upgrade Your Tech Game banner */}
      <UpgradeBanner />

      {/* 7. Promo banners: Get Now + Free Shipping */}
      <PromoBanners />

      {/* 8. Featured Products — tabbed section */}
      <FeaturedProductsSection />

      {/* 9. Category promotional banners */}
      <CategoryPromoBanners />

      {/* 10. Recently Viewed — only shows if user has browsed products */}
      <RecentlyViewedSection />

      {/* 11. Recommended For You — horizontal scroll */}
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
