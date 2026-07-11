'use client';
import { useState, useRef, useEffect } from 'react';
import AdminShell from '@/components/admin/admin-shell';
import PageHeader from '@/components/admin/page-header';
import { Modal, ConfirmDialog, FormField, ModalFooter } from '@/components/admin/modal';
import { useTheme } from '@/contexts/theme-context';
import {
  Layout, Edit, Eye, Plus, ChevronDown, ChevronUp, Trash2, Upload, X, RefreshCw,
  Image as ImageIcon, Video, Link2, Type, AlignLeft, MousePointer,
  ChevronLeft, ChevronRight, FileText, Mail, MapPin, Clock, Tag, Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import CloudinaryUpload from '@/components/ui/file-upload';
import {
  getCmsPages, getCmsBanners, getCmsSections,
  createCmsBanner, updateCmsBanner, deleteCmsBanner,
  updateCmsSection, createCmsSection, deleteCmsSection, reorderCmsSections, moveCmsSection,
  getCmsSiteConfigs, upsertCmsSiteConfig,
  getBrands, resetSeedCmsSections,
  createCmsPage, updateCmsPage, deleteCmsPage, seedAllCmsPages
} from '@/lib/api';

const SECTION_FIELDS: Record<string, Array<{ key: string; label: string; type: string; options?: string[]; icon?: string }>> = {
  'Hero Banner': [
    { key: 'title', label: 'Banner Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'description', label: 'Description', type: 'textarea', icon: 'align' },
    { key: 'button_text', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'duration', label: 'Display Duration (seconds) — e.g. 10, 30, 60', type: 'text', icon: 'type' },
    { key: 'media', label: 'Banner Image or Video URL', type: 'file' },
  ],
  'Sale Banner': [
    { key: 'title', label: 'Banner Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'discount_text', label: 'Discount Badge (e.g. 50% OFF)', type: 'text', icon: 'type' },
    { key: 'button_text', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'media', label: 'Banner Image', type: 'file' },
  ],
  'Featured Products': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'subheading', label: 'Subheading', type: 'text', icon: 'type' },
    { key: 'product_limit', label: 'Number of Products to Show', type: 'text', icon: 'type' },
    { key: 'sort_by', label: 'Sort By', type: 'select', options: ['Featured', 'Newest', 'Best Selling', 'On Sale'] },
  ],
  'Promotions': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'promo_title', label: 'Promotion Title', type: 'text', icon: 'type' },
    { key: 'promo_text', label: 'Promotion Description', type: 'textarea', icon: 'align' },
    { key: 'button_text', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'media', label: 'Promotion Image', type: 'file' },
  ],
  'Newsletter': [
    { key: 'popup_image', label: 'Popup Image', type: 'file' },
    { key: 'heading', label: 'Popup Heading (e.g. Signup Today!)', type: 'text', icon: 'type' },
    { key: 'subheading', label: 'Subtext (appears above heading)', type: 'text', icon: 'type' },
    { key: 'placeholder', label: 'Email Input Placeholder', type: 'text', icon: 'type' },
    { key: 'button_text', label: 'Button Text (e.g. Submit)', type: 'text', icon: 'mouse' },
    { key: 'footnote', label: 'Footnote Text (below the form)', type: 'text', icon: 'type' },
  ],
  'Company Story': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'content', label: 'Story Content', type: 'textarea', icon: 'align' },
    { key: 'media', label: 'Section Image', type: 'file' },
    { key: 'button_text', label: 'Learn More Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
  ],
  'Team': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'subheading', label: 'Subheading', type: 'text', icon: 'type' },
    { key: 'media', label: 'Team Photo', type: 'file' },
  ],
  'Mission & Vision': [
    { key: 'mission_title', label: 'Mission Title', type: 'text', icon: 'type' },
    { key: 'mission_text', label: 'Mission Statement', type: 'textarea', icon: 'align' },
    { key: 'vision_title', label: 'Vision Title', type: 'text', icon: 'type' },
    { key: 'vision_text', label: 'Vision Statement', type: 'textarea', icon: 'align' },
    { key: 'media', label: 'Section Image', type: 'file' },
  ],
  'Contact Form': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'subheading', label: 'Subheading', type: 'text', icon: 'type' },
    { key: 'email', label: 'Contact Email', type: 'text', icon: 'link' },
    { key: 'phone', label: 'Phone Number', type: 'text', icon: 'type' },
    { key: 'address', label: 'Address', type: 'textarea', icon: 'align' },
  ],
  'Location Map': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'address', label: 'Full Address', type: 'textarea', icon: 'align' },
    { key: 'map_embed_url', label: 'Google Maps Embed URL', type: 'text', icon: 'link' },
  ],
  'Business Hours': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'mon_fri', label: 'Monday – Friday Hours', type: 'text', icon: 'type' },
    { key: 'saturday', label: 'Saturday Hours', type: 'text', icon: 'type' },
    { key: 'sunday', label: 'Sunday / Public Holidays', type: 'text', icon: 'type' },
  ],
  'Terms Text': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'content', label: 'Terms & Conditions Content', type: 'textarea', icon: 'align' },
    { key: 'last_updated', label: 'Last Updated Date', type: 'text', icon: 'type' },
  ],
  'Policy Text': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'content', label: 'Privacy Policy Content', type: 'textarea', icon: 'align' },
    { key: 'last_updated', label: 'Last Updated Date', type: 'text', icon: 'type' },
  ],
  'Promo Banner': [
    { key: 'tag', label: 'Tag Badge (e.g. "UP TO 50% OFF")', type: 'text', icon: 'tag' },
    { key: 'title', label: 'Banner Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle Text', type: 'text', icon: 'type' },
    { key: 'description', label: 'Description', type: 'textarea', icon: 'align' },
    { key: 'href', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'emoji', label: 'Emoji Icon (e.g. 🛒) — used if no image', type: 'text', icon: 'type' },
    { key: 'color_theme', label: 'Color Theme (used if no image)', type: 'select', options: ['Green/Teal', 'Blue', 'Purple', 'Red'] },
    { key: 'image', label: 'Background Image (overrides color)', type: 'file' },
  ],
  'Promo Banners': [
    { key: 'tag', label: 'Tag Badge (e.g. "TECNO" or "UP TO 50% OFF")', type: 'text', icon: 'tag' },
    { key: 'title', label: 'Banner Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle Text', type: 'text', icon: 'type' },
    { key: 'cta', label: 'Button Text (e.g. "Shop Now")', type: 'text', icon: 'mouse' },
    { key: 'href', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'image', label: 'Background Image', type: 'file' },
  ],
  'Products Grid': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'product_limit', label: 'Products to Show', type: 'text', icon: 'type' },
    { key: 'filter_by', label: 'Filter By', type: 'select', options: ['All Products', 'Sale Items', 'Featured', 'New Arrivals'] },
    { key: 'button_text', label: 'View All Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'View All Link', type: 'text', icon: 'link' },
  ],
  'Category Promo Banners': [
    { key: 'tag', label: 'Tag Badge (e.g. MEGA DEAL)', type: 'text', icon: 'tag' },
    { key: 'title', label: 'Banner Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle Text', type: 'text', icon: 'type' },
    { key: 'description', label: 'Description', type: 'textarea', icon: 'align' },
    { key: 'href', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'emoji', label: 'Emoji Icon (e.g. cart) - used if no image', type: 'text', icon: 'type' },
    { key: 'color_theme', label: 'Color Theme (used if no image)', type: 'select', options: ['Green/Teal', 'Blue', 'Purple', 'Red'] },
    { key: 'image', label: 'Background Image (overrides color)', type: 'file' },
  ],
  'Members Banner': [
    { key: 'heading', label: 'Banner Heading', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'button_text', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'media', label: 'Banner Image', type: 'file' },
  ],
  'Shop Filters': [
    { key: 'heading', label: 'Filters Heading', type: 'text', icon: 'type' },
    { key: 'filter_categories', label: 'Filter Categories (comma-separated)', type: 'text', icon: 'type' },
  ],
  'Product Grid': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'product_limit', label: 'Products to Show', type: 'text', icon: 'type' },
    { key: 'filter_by', label: 'Filter By', type: 'select', options: ['All Products', 'Sale Items', 'Featured', 'New Arrivals'] },
    { key: 'button_text', label: 'View All Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'View All Link', type: 'text', icon: 'link' },
  ],
  'Wholesale Hero': [
    { key: 'heading', label: 'Hero Heading', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'description', label: 'Description', type: 'textarea', icon: 'align' },
    { key: 'button_text', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'media', label: 'Hero Image', type: 'file' },
  ],
  'Wholesale Features': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'feature_1_title', label: 'Feature 1 Title', type: 'text', icon: 'type' },
    { key: 'feature_1_text', label: 'Feature 1 Description', type: 'textarea', icon: 'align' },
    { key: 'feature_2_title', label: 'Feature 2 Title', type: 'text', icon: 'type' },
    { key: 'feature_2_text', label: 'Feature 2 Description', type: 'textarea', icon: 'align' },
    { key: 'feature_3_title', label: 'Feature 3 Title', type: 'text', icon: 'type' },
    { key: 'feature_3_text', label: 'Feature 3 Description', type: 'textarea', icon: 'align' },
  ],
  'Get Now Hero': [
    { key: 'heading', label: 'Hero Heading', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'description', label: 'Description', type: 'textarea', icon: 'align' },
    { key: 'button_text', label: 'Apply Now Button Text', type: 'text', icon: 'mouse' },
    { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
    { key: 'media', label: 'Hero Image', type: 'file' },
  ],
  'Get Now Features': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'feature_1_title', label: 'Feature 1 Title', type: 'text', icon: 'type' },
    { key: 'feature_1_text', label: 'Feature 1 Description', type: 'textarea', icon: 'align' },
    { key: 'feature_2_title', label: 'Feature 2 Title', type: 'text', icon: 'type' },
    { key: 'feature_2_text', label: 'Feature 2 Description', type: 'textarea', icon: 'align' },
    { key: 'feature_3_title', label: 'Feature 3 Title', type: 'text', icon: 'type' },
    { key: 'feature_3_text', label: 'Feature 3 Description', type: 'textarea', icon: 'align' },
  ],
  'Page Hero': [
    { key: 'heading', label: 'Page Heading', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'media', label: 'Hero Image', type: 'file' },
  ],
  'FAQ Accordion': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'question', label: 'Question', type: 'text', icon: 'type' },
    { key: 'answer', label: 'Answer', type: 'textarea', icon: 'align' },
  ],
  'Product Gallery': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'layout', label: 'Gallery Layout', type: 'select', options: ['Grid', 'Carousel', 'List'] },
  ],
  'Related Products': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'product_limit', label: 'Number of Products', type: 'text', icon: 'type' },
    { key: 'sort_by', label: 'Sort By', type: 'select', options: ['Same Category', 'Best Selling', 'Newest'] },
  ],
  'Page Content': [
    { key: 'heading', label: 'Page Heading', type: 'text', icon: 'type' },
    { key: 'content', label: 'Page Content', type: 'textarea', icon: 'align' },
    { key: 'last_updated', label: 'Last Updated', type: 'text', icon: 'type' },
  ],
  'Testimonials': [
    { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
    { key: 'subheading', label: 'Subheading', type: 'text', icon: 'type' },
    { key: 'customer_name', label: 'Customer Name', type: 'text', icon: 'type' },
    { key: 'review', label: 'Review Text', type: 'textarea', icon: 'align' },
    { key: 'rating', label: 'Rating (1-5)', type: 'text', icon: 'type' },
    { key: 'media', label: 'Customer Photo', type: 'file' },
  ],
  'Trust Badges': [
    { key: 'badge1_icon', label: 'Badge 1 Icon', type: 'select', options: ['Truck', 'ShieldCheck', 'RefreshCw', 'Star', 'Package', 'CreditCard', 'Lock', 'Headphones', 'Gift', 'CheckCircle', 'Zap', 'Heart', 'Award', 'BadgeCheck', 'ThumbsUp', 'Clock'] },
    { key: 'badge1_title', label: 'Badge 1 Title', type: 'text' },
    { key: 'badge1_subtitle', label: 'Badge 1 Subtitle', type: 'text' },
    { key: 'badge2_icon', label: 'Badge 2 Icon', type: 'select', options: ['Truck', 'ShieldCheck', 'RefreshCw', 'Star', 'Package', 'CreditCard', 'Lock', 'Headphones', 'Gift', 'CheckCircle', 'Zap', 'Heart', 'Award', 'BadgeCheck', 'ThumbsUp', 'Clock'] },
    { key: 'badge2_title', label: 'Badge 2 Title', type: 'text' },
    { key: 'badge2_subtitle', label: 'Badge 2 Subtitle', type: 'text' },
    { key: 'badge3_icon', label: 'Badge 3 Icon', type: 'select', options: ['Truck', 'ShieldCheck', 'RefreshCw', 'Star', 'Package', 'CreditCard', 'Lock', 'Headphones', 'Gift', 'CheckCircle', 'Zap', 'Heart', 'Award', 'BadgeCheck', 'ThumbsUp', 'Clock'] },
    { key: 'badge3_title', label: 'Badge 3 Title', type: 'text' },
    { key: 'badge3_subtitle', label: 'Badge 3 Subtitle', type: 'text' },
    { key: 'badge4_icon', label: 'Badge 4 Icon', type: 'select', options: ['Truck', 'ShieldCheck', 'RefreshCw', 'Star', 'Package', 'CreditCard', 'Lock', 'Headphones', 'Gift', 'CheckCircle', 'Zap', 'Heart', 'Award', 'BadgeCheck', 'ThumbsUp', 'Clock'] },
    { key: 'badge4_title', label: 'Badge 4 Title', type: 'text' },
    { key: 'badge4_subtitle', label: 'Badge 4 Subtitle', type: 'text' },
  ],
  'Flash Sale': [
    { key: 'title', label: 'Section Title — shown in the flash sale header', type: 'text', icon: 'type' },
    { key: 'countdownLabel', label: 'Countdown Label — e.g. Time Left', type: 'text', icon: 'clock' },
    { key: 'endTime', label: 'Sale End Time — ISO 8601 or datetime value used for the countdown', type: 'text', icon: 'clock' },
    { key: 'ctaText', label: 'Button Text — e.g. See All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
  ],
  'Top Selling': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text — e.g. View All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Newest Arrivals': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text — e.g. View All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Best Sellers': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text — e.g. View All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Trending': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text — e.g. View All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Limited Stock Deal': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'discountText', label: 'Discount Label — e.g. Up to 70% Off', type: 'text', icon: 'tag' },
    { key: 'discountPercent', label: 'Discount Percent (number) — e.g. 70', type: 'text', icon: 'tag' },
    { key: 'ctaText', label: 'Button Text — e.g. Shop Now', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Appliances Deal': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text — e.g. View All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Top Express': [
    { key: 'title', label: 'Section Title', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text — e.g. View All', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link — e.g. /shop', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Max Products to Display (default: 8)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Scroll Mode (horizontal scroll on desktop)', type: 'select', options: ['true', 'false'] },
  ],
  'Upgrade Banner': [
    { key: 'title', label: 'Section Title (for admin reference)', type: 'text', icon: 'type' },
    { key: 'images', label: 'Banner Images (comma-separated URLs or use media upload)', type: 'textarea', icon: 'image' },
    { key: 'media', label: 'Fallback: Single image URL (comma-separated for multiple)', type: 'text', icon: 'image' },
    { key: 'autoSlide', label: 'Auto-slide enabled', type: 'select', options: ['true', 'false'] },
    { key: 'interval', label: 'Slide interval in ms (default: 4000)', type: 'text', icon: 'clock' },
  ],
  // ── Shop Layout Blocks (CMS Sections → pageSlug: shop) ─────────────────────────
  'Shop Hero': [
    { key: 'tagline', label: 'Main Heading (tagline)', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link', type: 'text', icon: 'link' },
    { key: 'bgColor', label: 'Background Color / Gradient CSS', type: 'text', icon: 'align' },
    { key: 'imageUrl', label: 'Background Image', type: 'file', icon: 'image' },
  ],
  'Shop Categories': [
    { key: 'mode', label: 'Mode', type: 'select', options: ['carousel', 'grid'] },
  ],
  'Shop Product Shelf': [
    { key: 'sectionSlug', label: 'Section Slug (used for /shop/section/:slug)', type: 'text', icon: 'tag' },
    { key: 'title', label: 'Shelf Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Shelf Subtitle (optional)', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'See All Button Text', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Optional Override Link (leave empty to auto-generate)', type: 'text', icon: 'link' },
    { key: 'limit', label: 'Products to Display (default: 10)', type: 'text', icon: 'type' },
    { key: 'scroll', label: 'Horizontal Scroll', type: 'select', options: ['true', 'false'] },
    { key: 'categorySlug', label: 'Category Slug Filter (optional)', type: 'text', icon: 'tag' },
    { key: 'popularity', label: 'Popularity Filter (optional)', type: 'select', options: ['', 'trending', 'bestseller', 'new', 'hot', 'sale'] },
    { key: 'isFlashSale', label: 'Flash Sale Only', type: 'select', options: ['', 'true', 'false'] },
    { key: 'featured', label: 'Featured Only', type: 'select', options: ['', 'true', 'false'] },
  ],
  'Shop Promo Banner': [
    { key: 'tag', label: 'Tag / Badge (e.g. LIMITED TIME)', type: 'text', icon: 'tag' },
    { key: 'title', label: 'Banner Title', type: 'text', icon: 'type' },
    { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
    { key: 'ctaText', label: 'Button Text', type: 'text', icon: 'mouse' },
    { key: 'ctaLink', label: 'Button Link', type: 'text', icon: 'link' },
    { key: 'bgColor', label: 'Background Color / Gradient CSS', type: 'text', icon: 'align' },
    { key: 'imageUrl', label: 'Background Image', type: 'file', icon: 'image' },
  ],
};
const PAGE_SECTION_NAME: Record<string, string> = {
  ShopHero: 'Shop Hero',
  ShopCategories: 'Shop Categories',
  ShopProductShelf: 'Shop Product Shelf',
  ShopPromoBanner: 'Shop Promo Banner',
  MembersBanner: 'Members Banner',
  ShopFilters: 'Shop Filters',
  ProductGrid: 'Product Grid',
  WholesaleHero: 'Wholesale Hero',
  WholesaleFeatures: 'Wholesale Features',
  GetNowHero: 'Get Now Hero',
  GetNowFeatures: 'Get Now Features',
  PageHero: 'Page Hero',
  FAQAccordion: 'FAQ Accordion',
  ProductGallery: 'Product Gallery',
  RelatedProducts: 'Related Products',
  Testimonials: 'Testimonials',
  SaleBanner: 'Sale Banner',
  ProductsGrid: 'Products Grid',
  PageContent: 'Page Content',
  ContactForm: 'Contact Form',
};
// Reverse: display name → backend type code (fixes "sections split into two")
const SECTION_NAME_TO_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_SECTION_NAME).map(([k, v]) => [v, k])
);
const DEFAULT_FIELDS = [
  { key: 'heading', label: 'Section Heading', type: 'text', icon: 'type' },
  { key: 'subtitle', label: 'Subtitle', type: 'text', icon: 'type' },
  { key: 'content', label: 'Content / Description', type: 'textarea', icon: 'align' },
  { key: 'button_text', label: 'Button Text', type: 'text', icon: 'mouse' },
  { key: 'button_link', label: 'Button Link (URL)', type: 'text', icon: 'link' },
  { key: 'media', label: 'Image / Video Upload', type: 'file' },
];

type SectionData = Record<string, string>;
type SectionItem = { id: string; content: SectionData; status: string; mediaUrl?: string };
type Section = { name: string; items: SectionItem[] };
type CmsPage = { id: string; title: string; slug: string; sections: Section[]; lastEdited: string; status: string };

function getItemPreview(sectionName: string, content: SectionData): string {
  const keys = ['title', 'promo_title', 'heading', 'mission_title', 'content'];
  for (const k of keys) { if (content[k]) return content[k]; }
  return sectionName + ' Item';
}
function getItemSub(content: SectionData): string {
  if (content.button_text && content.button_link) return content.button_text + ' • ' + content.button_link;
  if (content.button_text) return content.button_text;
  if (content.subheading) return content.subheading;
  if (content.subtitle) return content.subtitle;
  return '';
}
function getSectionIconType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('banner') || n.includes('hero')) return 'image';
  if (n.includes('product')) return 'tag';
  if (n.includes('promo')) return 'promo';
  if (n.includes('news') || n.includes('contact') || n.includes('form')) return 'mail';
  if (n.includes('map') || n.includes('location')) return 'map';
  if (n.includes('hour') || n.includes('time')) return 'clock';
  return 'text';
}
function sectionHasMedia(name: string): boolean {
  const fields = SECTION_FIELDS[name] || DEFAULT_FIELDS;
  return fields.some(f => f.type === 'file');
}



const EMPTY_PAGE_FORM = { title: '', slug: '', status: 'Published' };
const ADD_SECTION_NAMES = ['Hero Banner','Promo Banner','Promo Banners','Promotions','Newsletter','Company Story','Team','Mission & Vision','Contact Form','Location Map','Business Hours','Terms Text','Policy Text','Products Grid','Sale Banner','Category Promo Banners','Upgrade Banner','Shop Hero','Shop Categories','Shop Product Shelf','Shop Promo Banner','Members Banner','Shop Filters','Product Grid','Wholesale Hero','Wholesale Features','Get Now Hero','Get Now Features','Page Hero','FAQ Accordion','Product Gallery','Related Products','Testimonials','Flash Sale','Trust Badges','Top Selling','Newest Arrivals','Best Sellers','Trending','Limited Stock Deal','Appliances Deal','Top Express','Custom Section'];

// FileUpload is now the shared CloudinaryUpload component

function ItemFormModal({ sectionName, pageTitle, initialValues, onClose, onSave, isDark, border, textMain, textMuted, surface, isEdit }: {
  sectionName: string; pageTitle: string; initialValues: SectionData;
  onClose: () => void; onSave: (content: SectionData, mediaUrl?: string) => void;
  isDark: boolean; border: string; textMain: string; textMuted: string; surface: string; isEdit: boolean;
}) {
  const fields = SECTION_FIELDS[sectionName] || DEFAULT_FIELDS;
  const [values, setValues] = useState<SectionData>({ ...initialValues });
  const [mediaUrl, setMediaUrl] = useState('');
  const set = (k: string) => (v: string) => setValues(prev => ({ ...prev, [k]: v }));
  const bg = isDark ? '#0D1523' : '#FFFFFF';
  const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: '8px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', outline: 'none', fontFamily: 'var(--font-inter)', boxSizing: 'border-box' };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(3px)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '16px', width: '100%', maxWidth: '560px', maxHeight: '92vh', overflow: 'auto', boxShadow: '0 30px 60px rgba(0,0,0,0.45)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px 14px', borderBottom: `1px solid ${border}` }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: textMain }}>{isEdit ? 'Edit' : 'Add New'} {sectionName}</div>
            <div style={{ fontSize: '11.5px', color: textMuted, marginTop: '2px' }}>{pageTitle} → {sectionName}</div>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '7px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} color={textMuted} /></button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          {fields.map(field => (
            <div key={field.key} style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {field.icon === 'type' && <Type size={10} />}{field.icon === 'align' && <AlignLeft size={10} />}{field.icon === 'mouse' && <MousePointer size={10} />}{field.icon === 'link' && <Link2 size={10} />}{field.icon === 'clock' && <Clock size={10} />}
                {field.label}
              </label>
              {field.type === 'file' ? (
                <CloudinaryUpload value={values[field.key] || ''} onChange={(v) => set(field.key)(v)} onUrlChange={setMediaUrl} isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
              ) : field.type === 'textarea' ? (
                <textarea value={values[field.key] || ''} onChange={e => set(field.key)(e.target.value)} rows={4} placeholder={'Enter ' + field.label.toLowerCase() + '...'} style={{ ...inputStyle, resize: 'vertical' }} />
              ) : field.type === 'select' ? (
                <div style={{ position: 'relative' }}>
                  <select value={values[field.key] || (field.options?.[0] || '')} onChange={e => set(field.key)(e.target.value)} style={{ ...inputStyle, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', paddingRight: '32px' }}>
                    {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><ChevronDown size={13} color={textMuted} /></div>
                </div>
              ) : (
                <input type="text" value={values[field.key] || ''} onChange={e => set(field.key)(e.target.value)} placeholder={'Enter ' + field.label.toLowerCase() + '...'} style={inputStyle} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: `1px solid ${border}` }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '9px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Cancel</button>
            <button onClick={() => { onSave(values, mediaUrl || undefined); onClose(); toast.success((isEdit ? 'Saved: ' : 'Added: ') + sectionName); }} style={{ padding: '10px 20px', borderRadius: '9px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', color: 'white', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isEdit ? 'Save Changes' : <><Plus size={14} /> Add {sectionName}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CMSContent() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? '#0D1523' : '#FFFFFF';
  const border = isDark ? '#1E293B' : '#E2E8F0';
  const textMain = isDark ? '#FFFFFF' : '#0F172A';
  const textMuted = isDark ? '#8E9AAF' : '#64748B';
  const surface = isDark ? '#101826' : '#F1F5F9';
  const accent = '#1FA89A';

  const [data, setData] = useState<CmsPage[]>([]);
  type View = 'pages' | 'sections' | 'items' | 'trusted-brands' | 'brand-banners' | 'wholesale-banners' | 'get-now-banners';


  // ── Load real data from API on mount ─────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [pagesRes, bannersRes, hpSecsRes] = await Promise.all([
          getCmsPages().catch(() => ({ data: [] })),
          getCmsBanners().catch(() => ({ data: [] })),
          getCmsSections('homepage').catch(() => ({ data: [] })),
        ]);
        const apiPages: any[] = Array.isArray(pagesRes.data) ? pagesRes.data : Array.isArray((pagesRes.data as any)?.data) ? (pagesRes.data as any).data : [];
        const banners: any[] = Array.isArray(bannersRes.data) ? bannersRes.data : Array.isArray((bannersRes.data as any)?.data) ? (bannersRes.data as any).data : [];
        const hpSecs: any[] = Array.isArray(hpSecsRes.data) ? hpSecsRes.data : Array.isArray((hpSecsRes.data as any)?.data) ? (hpSecsRes.data as any).data : [];
        if (apiPages.length === 0 && banners.length === 0 && hpSecs.length === 0) return;

        const cmsPages: CmsPage[] = await Promise.all(apiPages.map(async (p: any) => {
          const isHome = p.slug === '/' || p.slug === 'home';
          const secs: Section[] = [];
          if (isHome) {
            if (banners.length > 0) {
              secs.push({ name: 'Hero Banner', items: banners.map((b: any) => ({ id: b.id, content: { title: b.title || '', subtitle: b.subtitle || '', description: '', button_text: b.linkText || '', button_link: b.link || '', media: b.videoUrl || b.image || '', duration: b.duration ? String(b.duration) : '' }, status: b.isActive ? 'Active' : 'Inactive', mediaUrl: b.videoUrl || b.image })) });
            }
            [...hpSecs].sort((a: any, b: any) => (a.order || 0) - (b.order || 0)).forEach((sec: any) => {
              const nm = sec.name || sec.type || 'Section';
              const _rawContent = Object.fromEntries(Object.entries(sec.config || {}).map(([k, v]) => {
                  if (sec.type === 'TrustBadges' && k === 'items' && Array.isArray(v)) {
                    return [k, JSON.stringify(v, null, 2)];
                  }
                  return [k, String(v)];
                }));
              if (sec.type === 'TrustBadges') {
                try {
                  const _rawItems = Array.isArray(sec.config?.items) ? sec.config.items
                    : (typeof _rawContent.items === 'string' ? JSON.parse(_rawContent.items) : []);
                  if (Array.isArray(_rawItems)) {
                    _rawItems.slice(0, 4).forEach((badge: any, i: number) => {
                      _rawContent[`badge${i+1}_icon`] = badge.icon || 'Truck';
                      _rawContent[`badge${i+1}_title`] = badge.title || '';
                      _rawContent[`badge${i+1}_subtitle`] = badge.subtitle || '';
                    });
                  }
                } catch {}
              }
              if (sec.type === 'FlashSale') {
                _rawContent.title = _rawContent.title || String(sec.title || 'Flash Sales');
                _rawContent.countdownLabel = _rawContent.countdownLabel || 'Time Left';
                _rawContent.ctaText = _rawContent.ctaText || String(sec.linkText || 'See All');
                _rawContent.ctaLink = _rawContent.ctaLink || String(sec.link || '/shop');
              }
              const newItem = {
                id: sec.id,
                content: _rawContent,
                status: sec.isActive ? 'Active' : 'Inactive'
              };
              const existing = secs.find(s => s.name === nm);
              if (existing) { existing.items.push(newItem); }
              else { secs.push({ name: nm, items: [newItem] }); }
            });
            const _nlSec = hpSecs.find((s: any) => s.type === 'Newsletter') || banners.find((b: any) => b.type === 'Newsletter');
            if (!secs.find(s => s.name === 'Newsletter')) {
              secs.push({ name: 'Newsletter', items: [{ id: _nlSec?.id ? String(_nlSec.id) : 'nl-placeholder', content: { heading: 'Signup Today!', subheading: 'Want exclusive access to discounts & offers on premium brands?', placeholder: 'Your E-mail', button_text: 'Submit', footnote: '*Limited time offer.', popup_image: '' }, status: 'Active' }] });
            }
          } else {
            try {
              let sr = await getCmsSections(p.slug).catch(() => ({ data: [] }));
              let ss: any[] = Array.isArray(sr.data) ? sr.data : Array.isArray((sr.data as any)?.data) ? (sr.data as any).data : [];
              if (ss.length === 0 && p.slug) {
                await resetSeedCmsSections(p.slug).catch(() => {});
                sr = await getCmsSections(p.slug).catch(() => ({ data: [] }));
                ss = Array.isArray(sr.data) ? sr.data : Array.isArray((sr.data as any)?.data) ? (sr.data as any).data : [];
              }
              const g: Record<string, SectionItem[]> = {};
              ss.forEach((s: any) => {
                const nm = s.name || s.type || 'Section';
                if (!g[nm]) g[nm] = [];
                g[nm].push({ id: s.id, content: Object.fromEntries(Object.entries((s.content || s.config || {})).map(([k, v]) => [k, String(v)])), status: s.isActive ? 'Active' : 'Inactive' });
              });
              Object.entries(g).forEach(([name, items]) => secs.push({ name, items }));
            } catch {}
          }
          return { id: p.id, title: p.title || p.slug, slug: p.slug, lastEdited: p.updatedAt ? String(p.updatedAt).split('T')[0] : '', status: p.status || 'Published', sections: secs };
        }));
        if (cmsPages.length > 0) {
          setData(cmsPages);
        }
        // Load trusted brands from site-config; auto-seed from brands API on first run
        let configs: any[] = [];
        try {
          const cfgRes: any = await getCmsSiteConfigs().catch(() => ({ data: [] }));
          configs = Array.isArray(cfgRes.data) ? cfgRes.data : Array.isArray(cfgRes?.data?.data) ? cfgRes.data.data : [];
          const tb = configs.find((c: any) => c.key === 'trusted-brands');
          if (tb?.value) {
            const parsed = typeof tb.value === 'string' ? JSON.parse(tb.value) : tb.value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTrustedBrands(parsed);
            } else {
              // Key exists but empty — try seeding from brands API
              await seedTrustedBrandsFromAPI();
            }
          } else {
            // Key doesn't exist yet — auto-seed from brands API
            await seedTrustedBrandsFromAPI();
          }
        } catch {}
        // Load Wholesale Page Banners (tag=wholesale)
        try {
          const wbRes = await fetch(`/api/cms/banners?tag=wholesale`).then(r => r.ok ? r.json() : null);
          if (wbRes?.data && Array.isArray(wbRes.data)) {
            setWholesaleBanners(wbRes.data.map((b: any) => ({ id: b.id, title: b.title || '', image: b.image || '', link: b.link || '', linkText: b.linkText || '', isActive: b.isActive !== false, position: b.position || 0 })));
          }
        } catch {}
        // Load Get Now Page Banners (tag=get-now)
        try {
          const gnRes = await fetch(`/api/cms/banners?tag=get-now`).then(r => r.ok ? r.json() : null);
          if (gnRes?.data && Array.isArray(gnRes.data)) {
            setGetNowBanners(gnRes.data.map((b: any) => ({ id: b.id, title: b.title || '', image: b.image || '', link: b.link || '', linkText: b.linkText || '', isActive: b.isActive !== false, position: b.position || 0 })));
          }
        } catch {}
        // Load Shop Members Banner
        try {
          const sm = configs.find((c: any) => c.key === 'shop');
          if (sm?.value) { const v = typeof sm.value === 'string' ? JSON.parse(sm.value) : sm.value; if (v?.membersBanner) setMembersBanner(b => ({ ...b, ...v.membersBanner })); if (v?.heroBanner) setShopHeroBanner(h => ({ ...h, ...v.heroBanner })); }
        } catch {}
        // Load Brand Promotional Banners
        try {
          const bb = configs.find((c: any) => c.key === 'shop-brand-banners');
          if (bb?.value) { const v = typeof bb.value === 'string' ? JSON.parse(bb.value) : bb.value; if (Array.isArray(v)) setBrandBanners(v); }
        } catch {}
        // Load Announcement Bar
        try {
          const ab = configs.find((c: any) => c.key === 'header');
          if (ab?.value) { const v = typeof ab.value === 'string' ? JSON.parse(ab.value) : ab.value; if (v) setAnnouncementBar(b => ({ ...b, ...v })); }
        } catch {}
      } catch {}
    };
    load();
  }, []);

  // ── API helpers (fire-and-forget, local state stays snappy) ──────────
  const _getPageSlug = (pageId: string) => data.find(p => p.id === pageId)?.slug || '/';
  const _isHome = (pageId: string) => { const s = _getPageSlug(pageId); return s === '/' || s === 'home'; };

  const _getTemplateType = (type: string): string => {
    const map: Record<string, string> = {
      HeroSlider: 'BannerSlot', Brands: 'Brands', TrustBadges: 'TrustBadges',
      CategoriesGrid: 'CategoryGrid', FlashSale: 'FlashSale', PromoBanners: 'PromoBanners',
      promo_banners: 'PromoBanner', CategoryPromoBanners: 'CategoryPromoBanners',
      ProductSection: 'ProductSection', RecommendedProducts: 'RecommendedProducts',
      RecentlyViewed: 'RecentlyViewed', UpgradeBanner: 'UpgradeBanner',
      TopSelling: 'TopSelling', NewestArrivals: 'NewestArrivals', BestSellers: 'BestSellers',
      Trending: 'Trending', LimitedStockDeal: 'LimitedStockDeal', AppliancesDeal: 'AppliancesDeal',
      TopExpress: 'TopExpress', Newsletter: 'Newsletter', ProductGrid: 'ProductGrid',
      ShopHero: 'ShopHero', ShopCategories: 'ShopCategories', ShopProductShelf: 'ShopProductShelf',
      ShopPromoBanner: 'ShopPromoBanner', MembersBanner: 'MembersBanner', ShopFilters: 'ShopFilters',
      ProductGrid: 'ProductGrid', WholesaleHero: 'WholesaleHero', WholesaleFeatures: 'WholesaleFeatures',
      GetNowHero: 'GetNowHero', GetNowFeatures: 'GetNowFeatures', PageHero: 'PageHero',
      FAQAccordion: 'FAQAccordion', ProductGallery: 'ProductGallery', RelatedProducts: 'RelatedProducts',
      Testimonials: 'Testimonials', SaleBanner: 'SaleBanner', ProductsGrid: 'ProductsGrid',
      PageContent: 'PageContent', ContactForm: 'ContactForm',
    };
    return map[type] || 'Custom';
  };

  const _getDataSourceId = (type: string): string | null => {
    const map: Record<string, string> = {
      TopSelling: 'top-selling', Trending: 'trending-products', NewestArrivals: 'new-arrivals',
      BestSellers: 'top-selling', FlashSale: 'flash-sales', CategoriesGrid: 'homepage-categories',
      HeroSlider: 'homepage-hero-slider', ShopCategories: 'shop-page-categories',
    };
    return map[type] || null;
  };

  const _getSlotKey = (type: string): string | null => {
    const map: Record<string, string> = {
      HeroSlider: 'homepage-hero-slider', ShopHero: 'shop-page-top',
      GetNowHero: 'get-now-page-top', WholesaleHero: 'wholesale-page-top',
      PromoBanners: 'homepage-mid-page', UpgradeBanner: 'homepage-mid-page',
    };
    return map[type] || null;
  };
  const _apiSave = (itemId: string, pageId: string, secName: string, content: SectionData, mediaUrl?: string) => {
    const _backendType = SECTION_NAME_TO_TYPE[secName] || secName;
    const _templateType = _getTemplateType(_backendType);
    const _dataSourceId = _getDataSourceId(_backendType);
    const _slotKey = _getSlotKey(_backendType);

    if (itemId === 'nl-placeholder' && _isHome(pageId)) {
      createCmsSection({ type: _backendType, pageSlug: 'homepage', templateType: _templateType, dataSourceId: _dataSourceId || undefined, slotKey: _slotKey || undefined, name: secName, config: { ...content, ...(mediaUrl ? { media: mediaUrl } : {}) }, isActive: true })
        .then((res: any) => {
          const newId = res?.data?.id || (res?.data as any)?.data?.id;
          if (newId) setData(d => d.map(p => p.id !== pageId ? p : { ...p, sections: p.sections.map(s => s.name !== 'Newsletter' ? s : { ...s, items: s.items.map(i => i.id === 'nl-placeholder' ? { ...i, id: String(newId) } : i) }) }));
        })
        .catch(() => toast.error('Newsletter save failed'));
      return;
    }

    const isHome = _isHome(pageId);
    const pageSlug = isHome ? 'homepage' : _getPageSlug(pageId);

    if (isHome && secName === 'Hero Banner') {
      const _mUrl = mediaUrl || content.media || content.image || '';
      const _isVid = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(_mUrl) || _mUrl.startsWith('data:video/') || /youtu\.?be/.test(_mUrl);
      const _dur = content.duration ? parseInt(content.duration) : undefined;
      updateCmsBanner(itemId, { title: content.title, subtitle: content.subtitle, ...(_isVid ? { videoUrl: _mUrl, mediaType: 'video', image: '' } : { image: _mUrl, mediaType: 'image', videoUrl: '' }), link: content.button_link, linkText: content.button_text, ...(_dur ? { duration: _dur } : {}) }).catch(() => toast.error('Banner save failed'));
      return;
    }

    const finalConfig: any = { ...content, ...(mediaUrl ? { media: mediaUrl } : {}) };
    if (secName === 'Trust Badges') {
      const items = [];
      for (let i = 1; i <= 4; i++) {
        if (finalConfig[`badge${i}_title`]) {
          items.push({
            icon: finalConfig[`badge${i}_icon`] || 'Truck',
            title: finalConfig[`badge${i}_title`],
            subtitle: finalConfig[`badge${i}_subtitle`] || '',
          });
        }
      }
      if (items.length > 0) {
        finalConfig.items = items;
      }
    }

    const _isRealId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(itemId);
    if (!_isRealId) {
      const payload: any = { type: _backendType, pageSlug, templateType: _templateType, dataSourceId: _dataSourceId || undefined, slotKey: _slotKey || undefined, name: secName, config: finalConfig, isActive: true };
      if (isHome) {
        payload.title = content.title || _backendType;
        if (secName === 'Flash Sale') { payload.linkText = content.ctaText || 'See All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Top Selling') { payload.linkText = content.ctaText || 'View All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Newest Arrivals') { payload.linkText = content.ctaText || 'View All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Best Sellers') { payload.linkText = content.ctaText || 'View All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Trending') { payload.linkText = content.ctaText || 'View All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Limited Stock Deal') { payload.linkText = content.ctaText || 'Shop Now'; payload.link = content.ctaLink || '/shop'; if (content.discountPercent) finalConfig.discountPercent = Number(content.discountPercent); if (content.discountText) finalConfig.discountText = content.discountText; }
        else if (secName === 'Appliances Deal') { payload.linkText = content.ctaText || 'View All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Top Express') { payload.linkText = content.ctaText || 'View All'; payload.link = content.ctaLink || '/shop'; }
        else if (secName === 'Upgrade Banner') {
          payload.title = content.title || 'Upgrade Banner';
          if (content.images) finalConfig.images = content.images.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }
      createCmsSection(payload)
        .then((res: any) => {
          const newId = res?.data?.id || (res?.data as any)?.data?.id;
          if (newId) setData(d => d.map(p => p.id !== pageId ? p : { ...p, sections: p.sections.map(s => s.name !== secName ? s : { ...s, items: s.items.map(i => i.id === itemId ? { ...i, id: String(newId) } : i) }) }));
        })
        .catch(() => toast.error('Section create failed'));
    } else {
      updateCmsSection(itemId, { templateType: _templateType, dataSourceId: _dataSourceId || undefined, slotKey: _slotKey || undefined, config: finalConfig, isActive: true })
        .then(() => {
          setData(prev => prev.map(p => p.id !== pageId ? p : {
            ...p,
            sections: p.sections.map(s => s.name !== secName ? s : {
              ...s,
              items: s.items.map(i => i.id !== itemId ? i : { ...i, content: finalConfig })
            })
          }));
          toast.success('Section saved successfully');
        })
        .catch(() => toast.error('Section save failed'));
    }
  };
  // Reset & re-seed all sections for a non-home page (clears duplicates)
  const handleResetSections = async (pageId: string) => {
    const pg = data.find(p => p.id === pageId);
    if (!pg || _isHome(pageId)) return;
    if (!confirm('This will reset all sections for "' + pg.title + '" to defaults. Continue?')) return;
    try {
      toast('Resetting sections...', { icon: '🔄' });
      await resetSeedCmsSections(pg.slug);
      const sr = await getCmsSections(pg.slug).catch(() => ({ data: [] }));
      const ss: any[] = Array.isArray(sr.data) ? sr.data : Array.isArray((sr.data as any)?.data) ? (sr.data as any).data : [];
      const g: Record<string, { id: string; content: Record<string, string>; status: string }[]> = {};
      ss.forEach((s: any) => {
        const nm = PAGE_SECTION_NAME[s.type] || s.type || 'Section';
        if (!g[nm]) g[nm] = [];
        g[nm].push({ id: s.id, content: Object.fromEntries(Object.entries((s.config || {})).map(([k, v]) => [k, String(v)])), status: s.isActive ? 'Active' : 'Inactive' });
      });
      const newSections = Object.entries(g).map(([name, items]) => ({ name, items }));
      setData(d => d.map(p => p.id !== pageId ? p : { ...p, sections: newSections }));
      toast.success('Sections reset to defaults!');
    } catch {
      toast.error('Reset failed — please try again');
    }
  };

  const HP_SECTION_TYPE: Record<string, string> = {
    'Hero Slider': 'HeroSlider', 'Featured Brands': 'Brands', 'Trust Badges': 'TrustBadges',
    'Category Section': 'CategoriesGrid',
    'Flash Sale': 'FlashSale', 'Promo Banners': 'PromoBanners', 'Promo Banner': 'promo_banners',
    'Category Promo Banners': 'CategoryPromoBanners', 'Products Section': 'ProductSection',
    'What You Viewed': 'RecentlyViewed', 'Recently Viewed': 'RecentlyViewed', 'Upgrade Banner': 'UpgradeBanner',
    'Top Selling': 'TopSelling', 'Newest Arrivals': 'NewestArrivals',
    'Best Sellers': 'BestSellers', 'Trending': 'Trending',
    'Limited Stock Deal': 'LimitedStockDeal', 'Appliances Deal': 'AppliancesDeal',
    'Top Express': 'TopExpress',
    'Recommended For You': 'RecommendedProducts',
  };
  const _apiCreate = (pageId: string, secName: string, content: SectionData, mediaUrl?: string) => {
    if (_isHome(pageId)) {
      if (secName === 'Hero Banner') {
        const _mUrlC = mediaUrl || content.media || '';
        const _isVidC = /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i.test(_mUrlC) || _mUrlC.startsWith('data:video/') || /youtu\.?be/.test(_mUrlC);
        const _durC = content.duration ? parseInt(content.duration) : undefined;
        createCmsBanner({ title: content.title, subtitle: content.subtitle, ...(_isVidC ? { videoUrl: _mUrlC, mediaType: 'video' } : { image: _mUrlC, mediaType: 'image' }), link: content.button_link, linkText: content.button_text, isActive: true, ...(_durC ? { duration: _durC } : {}) }).catch(() => {});
      } else {
        const _backendType = SECTION_NAME_TO_TYPE[secName] || secName;
        const _templateType = _getTemplateType(_backendType);
        const _dataSourceId = _getDataSourceId(_backendType);
        const _slotKey = _getSlotKey(_backendType);
        const _payload: any = { type: _backendType, pageSlug: 'homepage', templateType: _templateType, dataSourceId: _dataSourceId || undefined, slotKey: _slotKey || undefined, config: { ...content, ...(mediaUrl ? { media: mediaUrl } : {}) }, isActive: true, name: secName };
        if (secName === 'Flash Sale') {
          _payload.title = content.title || 'Flash Sales';
          _payload.linkText = content.ctaText || 'See All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Top Selling') {
          _payload.title = content.title || 'Top Selling Items';
          _payload.linkText = content.ctaText || 'View All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Newest Arrivals') {
          _payload.title = content.title || 'Newest Arrivals';
          _payload.linkText = content.ctaText || 'View All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Best Sellers') {
          _payload.title = content.title || 'Best Sellers';
          _payload.linkText = content.ctaText || 'View All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Trending') {
          _payload.title = content.title || 'Trending Now';
          _payload.linkText = content.ctaText || 'View All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Limited Stock Deal') {
          _payload.title = content.title || 'Limited Stock Deal';
          _payload.linkText = content.ctaText || 'Shop Now';
          _payload.link = content.ctaLink || '/shop';
          if (content.discountPercent) _payload.config.discountPercent = Number(content.discountPercent);
          if (content.discountText) _payload.config.discountText = content.discountText;
        } else if (secName === 'Appliances Deal') {
          _payload.title = content.title || 'Appliances Deal';
          _payload.linkText = content.ctaText || 'View All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Top Express') {
          _payload.title = content.title || 'Top Express';
          _payload.linkText = content.ctaText || 'View All';
          _payload.link = content.ctaLink || '/shop';
        } else if (secName === 'Upgrade Banner') {
          _payload.title = content.title || 'Upgrade Banner';
          if (content.images) {
            _payload.config.images = content.images.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
          if (content.media) {
            _payload.config.media = content.media;
          }
        }
        createCmsSection(_payload).catch(() => toast.error('Section create failed'));
      }
    } else {
      const _backendType = SECTION_NAME_TO_TYPE[secName] || secName;
      const _templateType = _getTemplateType(_backendType);
      const _dataSourceId = _getDataSourceId(_backendType);
      const _slotKey = _getSlotKey(_backendType);
      const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const _existing = data.find(p => p.id === pageId)?.sections.find(s => s.name === secName)?.items.find(i => _UUID_RE.test(i.id));
      if (_existing) {
        updateCmsSection(_existing.id, { templateType: _templateType, dataSourceId: _dataSourceId || undefined, slotKey: _slotKey || undefined, config: { ...content, ...(mediaUrl ? { media: mediaUrl } : {}) } as any, isActive: true }).catch(() => toast.error('Section save failed'));
      } else {
        createCmsSection({ type: _backendType, pageSlug: _getPageSlug(pageId), templateType: _templateType, dataSourceId: _dataSourceId || undefined, slotKey: _slotKey || undefined, name: secName, config: { ...content, ...(mediaUrl ? { media: mediaUrl } : {}) } as any, isActive: true }).catch(() => toast.error('Section create failed'));
      }
    }
  };
  const _apiDelete = (itemId: string, pageId: string, secName: string) => {
    if (_isHome(pageId)) {
      if (secName === 'Hero Banner') { deleteCmsBanner(itemId).catch(() => {}); }
      else { deleteCmsSection(itemId).catch(() => {}); }
    } else { deleteCmsSection(itemId).catch(() => {}); }
  };
  const _apiToggle = (itemId: string, pageId: string, secName: string, active: boolean) => {
    if (_isHome(pageId)) {
      if (secName === 'Hero Banner') { updateCmsBanner(itemId, { isActive: active }).catch(() => {}); }
      else { updateCmsSection(itemId, { isActive: active }).catch(() => {}); }
    } else { updateCmsSection(itemId, { isActive: active }).catch(() => {}); }
  };
  const [view, setView] = useState<View>('pages');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const toggleSection = (secName: string) => {
    setSelectedSectionName(secName);
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(secName)) next.delete(secName); else next.add(secName);
      return next;
    });
  };
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedSectionName, setSelectedSectionName] = useState<string | null>(null);

  const selectedPage = selectedPageId ? data.find(p => p.id === selectedPageId) ?? null : null;
  const selectedSection = selectedPage && selectedSectionName
    ? selectedPage.sections.find(s => s.name === selectedSectionName) ?? null : null;

  const openPage = (pageId: string) => { setSelectedPageId(pageId); setView('sections'); };
  const openSection = (sectionName: string) => {
    setSelectedSectionName(sectionName);
    setView('items');
    // Badge fields are now expanded at data-load time — no direct mutation needed here.
  };
  const goBack = () => {
    if (view === 'trusted-brands' || view === 'brand-banners' || view === 'wholesale-banners' || view === 'get-now-banners') { setView('sections'); }
    else if (view === 'items') { setView('sections'); setSelectedSectionName(null); }
    else if (view === 'sections') { setView('pages'); setSelectedPageId(null); }
  };

  const [addPageOpen, setAddPageOpen] = useState(false);
  const [editPage, setEditPage] = useState<CmsPage | null>(null);
  const [viewPage, setViewPage] = useState<CmsPage | null>(null);
  const [deletePage, setDeletePage] = useState<CmsPage | null>(null);
  const [pageForm, setPageForm] = useState({ ...EMPTY_PAGE_FORM });
  const pfp = (k: string) => (v: string) => setPageForm(f => ({ ...f, [k]: v }));

  const [addSectionPage, setAddSectionPage] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState('Hero Banner');
  const [customSectionName, setCustomSectionName] = useState('');

  const [addingItem, setAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<SectionItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<SectionItem | null>(null);

  // ── Trusted Brands ──────────────────────────────────────────────────────────────────────
  type TrustedBrand = { id: string; name: string; logo: string; slug: string };
  const [trustedBrands, setTrustedBrands] = useState<TrustedBrand[]>([]);
  const [tbOpen, setTbOpen] = useState(false);
  const [tbEditIdx, setTbEditIdx] = useState<number | null>(null);
  const [tbForm, setTbForm] = useState({ name: '', logo: '', slug: '' });
  const [tbSaving, setTbSaving] = useState(false);
  const [tbDeleteIdx, setTbDeleteIdx] = useState<number | null>(null);
  const toTbSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  // ── Wholesale Page Banners (tag-filtered) ───────────────────────────────────
  type PageBanner = { id: string; title: string; image: string; link?: string; linkText?: string; isActive: boolean; position: number };
  const [wholesaleBanners, setWholesaleBanners] = useState<PageBanner[]>([]);
  const [wholesaleBannersOpen, setWholesaleBannersOpen] = useState(false);
  const [wholesaleBannersSaving, setWholesaleBannersSaving] = useState(false);
  const [wbEditIdx, setWbEditIdx] = useState<number | null>(null);
  const [wbDeleteIdx, setWbDeleteIdx] = useState<number | null>(null);
  const defaultWbForm = { title: '', image: '', link: '', linkText: '' };
  const [wbForm, setWbForm] = useState<Omit<PageBanner, 'id' | 'isActive' | 'position'>>(defaultWbForm);
  // ── Get Now Page Banners (tag-filtered) ─────────────────────────────────────
  const [getNowBanners, setGetNowBanners] = useState<PageBanner[]>([]);
  const [getNowBannersOpen, setGetNowBannersOpen] = useState(false);
  const [getNowBannersSaving, setGetNowBannersSaving] = useState(false);
  const [gnEditIdx, setGnEditIdx] = useState<number | null>(null);
  const [gnDeleteIdx, setGnDeleteIdx] = useState<number | null>(null);
  const defaultGnForm = { title: '', image: '', link: '', linkText: '' };
  const [gnForm, setGnForm] = useState<Omit<PageBanner, 'id' | 'isActive' | 'position'>>(defaultGnForm);
  // ── Shop Members Banner ──────────────────────────────────────────────────────
  const [membersBanner, setMembersBanner] = useState({ tag: 'KRYROS Members', title: 'Extra 5% Off', subtitle: 'On selected products', ctaText: 'Join Now', ctaLink: '/register', imageUrl: '' });
  const [membersBannerOpen, setMembersBannerOpen] = useState(false);
  const [membersBannerSaving, setMembersBannerSaving] = useState(false);
  // ── Shop Hero Banner (general, always shown at top of shop) ───────────────
  const [shopHeroBanner, setShopHeroBanner] = useState({ tagline: 'Shop the Best Deals', subtitle: 'Quality tech, unbeatable prices', bgColor: 'linear-gradient(135deg, #0D9488 0%, #0a7c72 100%)', ctaText: 'Explore Now', ctaLink: '/shop', imageUrl: '' });
  const [shopHeroBannerOpen, setShopHeroBannerOpen] = useState(false);
  const [shopHeroBannerSaving, setShopHeroBannerSaving] = useState(false);
  // ── Brand Promotional Banners (shop page) ─────────────────────────────────
  type BrandBanner = { id: string; slug: string; tagline: string; description: string; bgColor: string; accentColor: string; buttonText: string; buttonLink: string; imageUrl: string };
  const [brandBanners, setBrandBanners] = useState<BrandBanner[]>([]);
  const [bbOpen, setBbOpen] = useState(false);
  const [bbSaving, setBbSaving] = useState(false);
  const [bbEditIdx, setBbEditIdx] = useState<number | null>(null);
  const [bbDeleteIdx, setBbDeleteIdx] = useState<number | null>(null);
  const defaultBbForm = { slug: '', tagline: '', description: '', bgColor: '#1FA89A', accentColor: '#FFFFFF', buttonText: 'Shop Brand', buttonLink: '', imageUrl: '' };
  const [bbForm, setBbForm] = useState<Omit<BrandBanner,'id'>>(defaultBbForm);
  // ── Announcement Bar (Header) ────────────────────────────────────────────────
  const [announcementBar, setAnnouncementBar] = useState({ announcementEnabled: false, announcementText: '', announcementCta: '', announcementCtaLink: '', announcementBgColor: '', announcementTextColor: '' });
  const [announcementBarOpen, setAnnouncementBarOpen] = useState(false);
  const [announcementBarSaving, setAnnouncementBarSaving] = useState(false);

  // ── Seed trusted brands from existing brands API ────────────────────────────
  const seedTrustedBrandsFromAPI = async () => {
    try {
      const res: any = await getBrands().catch(() => null);
      if (!res) return;
      const brandsData: any[] = Array.isArray(res.data) ? res.data
        : Array.isArray(res?.data?.data) ? res.data.data
        : Array.isArray(res) ? res : [];
      if (brandsData.length === 0) return;
      const seeded = brandsData
        .filter((b: any) => b.isActive !== false)
        .map((b: any) => ({
          id: 'tb-' + String(b.id ?? b._id ?? Date.now()),
          name: String(b.name ?? ''),
          logo: String(b.logo ?? b.imageUrl ?? b.image ?? ''),
          slug: String(b.slug ?? ''),
        }));
      if (seeded.length > 0) {
        // Save to CMS site-config so it persists
        await upsertCmsSiteConfig('trusted-brands', seeded);
        setTrustedBrands(seeded);
        toast.success(`Imported ${seeded.length} brands to Trusted Brands`);
      }
    } catch { /* silent — user can add manually */ }
  };

  // ── Trusted Brands handlers ──────────────────────────────────────────────────────────────────────────
  const saveTrustedBrands = async (brands: TrustedBrand[]) => {
    setTbSaving(true);
    try {
      await upsertCmsSiteConfig('trusted-brands', brands);
      setTrustedBrands(brands);
      toast.success('Trusted brands saved');
    } catch { toast.error('Failed to save trusted brands'); }
    setTbSaving(false);
  };
  const saveBrandBanners = async (banners: BrandBanner[]) => {
    try {
      await upsertCmsSiteConfig('shop-brand-banners', banners);
      setBrandBanners(banners);
      toast.success('Brand banners saved');
    } catch { toast.error('Failed to save brand banners'); }
  };

  // ── Wholesale Banners CRUD ──────────────────────────────────────────────────
  const saveWholesaleBanner = async (banner: any) => {
    setWholesaleBannersSaving(true);
    try {
      if (wbEditIdx !== null) {
        await updateCmsBanner(banner.id, { title: banner.title, image: banner.image, link: banner.link || null, linkText: banner.linkText || null, tag: 'wholesale', position: banner.position });
        setWholesaleBanners(prev => prev.map((b, i) => i === wbEditIdx ? banner : b));
        toast.success('Banner updated');
      } else {
        const res = await createCmsBanner({ title: banner.title, image: banner.image, link: banner.link || null, linkText: banner.linkText || null, tag: 'wholesale', isActive: true, position: wholesaleBanners.length });
        const newBanner = { id: res.data.id, title: banner.title, image: banner.image, link: banner.link || '', linkText: banner.linkText || '', isActive: true, position: wholesaleBanners.length };
        setWholesaleBanners(prev => [...prev, newBanner]);
        toast.success('Banner added');
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    setWholesaleBannersSaving(false);
  };
  const handleWbSave = () => {
    if (!wbForm.title.trim()) { toast.error('Banner title required'); return; }
    if (!wbForm.image.trim()) { toast.error('Banner image required'); return; }
    const banner: PageBanner = {
      id: wbEditIdx !== null ? wholesaleBanners[wbEditIdx].id : 'wb-' + Date.now(),
      title: wbForm.title.trim(),
      image: wbForm.image,
      link: wbForm.link || '',
      linkText: wbForm.linkText || '',
      isActive: true,
      position: wbEditIdx !== null ? wholesaleBanners[wbEditIdx].position : wholesaleBanners.length,
    };
    saveWholesaleBanner(banner);
    setWholesaleBannersOpen(false); setWbEditIdx(null); setWbForm(defaultWbForm);
  };
  const handleWbDelete = () => {
    if (wbDeleteIdx === null) return;
    const b = wholesaleBanners[wbDeleteIdx];
    setWholesaleBanners(prev => prev.filter((_, i) => i !== wbDeleteIdx));
    setWbDeleteIdx(null);
    if (b.id && !b.id.startsWith('wb-')) deleteCmsBanner(b.id).catch(() => {});
    toast.success('Banner deleted');
  };
  const handleWbToggle = (idx: number) => {
    const b = wholesaleBanners[idx];
    const ns = !b.isActive;
    setWholesaleBanners(prev => prev.map((item, i) => i === idx ? { ...item, isActive: ns } : item));
    toast.success('Set to ' + (ns ? 'Active' : 'Inactive'));
    if (b.id && !b.id.startsWith('wb-')) updateCmsBanner(b.id, { isActive: ns }).catch(() => {});
  };

  // ── Get Now Banners CRUD ────────────────────────────────────────────────────
  const saveGetNowBanner = async (banner: any) => {
    setGetNowBannersSaving(true);
    try {
      if (gnEditIdx !== null) {
        await updateCmsBanner(banner.id, { title: banner.title, image: banner.image, link: banner.link || null, linkText: banner.linkText || null, tag: 'get-now', position: banner.position });
        setGetNowBanners(prev => prev.map((b, i) => i === gnEditIdx ? banner : b));
        toast.success('Banner updated');
      } else {
        const res = await createCmsBanner({ title: banner.title, image: banner.image, link: banner.link || null, linkText: banner.linkText || null, tag: 'get-now', isActive: true, position: getNowBanners.length });
        const newBanner = { id: res.data.id, title: banner.title, image: banner.image, link: banner.link || '', linkText: banner.linkText || '', isActive: true, position: getNowBanners.length };
        setGetNowBanners(prev => [...prev, newBanner]);
        toast.success('Banner added');
      }
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Save failed'); }
    setGetNowBannersSaving(false);
  };
  const handleGnSave = () => {
    if (!gnForm.title.trim()) { toast.error('Banner title required'); return; }
    if (!gnForm.image.trim()) { toast.error('Banner image required'); return; }
    const banner: PageBanner = {
      id: gnEditIdx !== null ? getNowBanners[gnEditIdx].id : 'gn-' + Date.now(),
      title: gnForm.title.trim(),
      image: gnForm.image,
      link: gnForm.link || '',
      linkText: gnForm.linkText || '',
      isActive: true,
      position: gnEditIdx !== null ? getNowBanners[gnEditIdx].position : getNowBanners.length,
    };
    saveGetNowBanner(banner);
    setGetNowBannersOpen(false); setGnEditIdx(null); setGnForm(defaultGnForm);
  };
  const handleGnDelete = () => {
    if (gnDeleteIdx === null) return;
    const b = getNowBanners[gnDeleteIdx];
    setGetNowBanners(prev => prev.filter((_, i) => i !== gnDeleteIdx));
    setGnDeleteIdx(null);
    if (b.id && !b.id.startsWith('gn-')) deleteCmsBanner(b.id).catch(() => {});
    toast.success('Banner deleted');
  };
  const handleGnToggle = (idx: number) => {
    const b = getNowBanners[idx];
    const ns = !b.isActive;
    setGetNowBanners(prev => prev.map((item, i) => i === idx ? { ...item, isActive: ns } : item));
    toast.success('Set to ' + (ns ? 'Active' : 'Inactive'));
    if (b.id && !b.id.startsWith('gn-')) updateCmsBanner(b.id, { isActive: ns }).catch(() => {});
  };
  const handleTbSave = () => {
    if (!tbForm.name.trim()) { toast.error('Brand name required'); return; }
    const brand: TrustedBrand = {
      id: tbEditIdx !== null ? trustedBrands[tbEditIdx].id : 'tb-' + Date.now(),
      name: tbForm.name.trim(),
      logo: tbForm.logo,
      slug: tbForm.slug || toTbSlug(tbForm.name),
    };
    const updated = tbEditIdx !== null
      ? trustedBrands.map((b, i) => i === tbEditIdx ? brand : b)
      : [...trustedBrands, brand];
    saveTrustedBrands(updated);
    setTbOpen(false); setTbEditIdx(null); setTbForm({ name: '', logo: '', slug: '' });
  };
  const handleTbDelete = () => {
    if (tbDeleteIdx === null) return;
    saveTrustedBrands(trustedBrands.filter((_, i) => i !== tbDeleteIdx));
    setTbDeleteIdx(null);
  };

  const handleAddPage = async () => {
    if (!pageForm.title.trim()) { toast.error('Title required'); return; }
    try {
      const res = await createCmsPage({ title: pageForm.title, slug: pageForm.slug, status: pageForm.status });
      const newPage = { id: res.data.id, ...pageForm, sections: [], lastEdited: new Date().toISOString().split('T')[0] };
      setData(d => [...d, newPage]);
      toast.success('Page added');
      setAddPageOpen(false);
    } catch {
      toast.error('Failed to add page');
    }
  };
  const handleEditPage = async () => {
    if (!editPage) return;
    try {
      await updateCmsPage(editPage.id, { title: pageForm.title, slug: pageForm.slug, status: pageForm.status });
      setData(d => d.map(p => p.id === editPage.id ? { ...p, ...pageForm, lastEdited: new Date().toISOString().split('T')[0] } : p));
      toast.success('Page updated');
      setEditPage(null);
    } catch {
      toast.error('Failed to update page');
    }
  };
  const handleDeletePage = async () => {
    if (!deletePage) return;
    try {
      await deleteCmsPage(deletePage.id);
      setData(d => d.filter(p => p.id !== deletePage.id));
      toast.success('Page deleted');
      setDeletePage(null);
      if (selectedPageId === deletePage.id) { setView('pages'); setSelectedPageId(null); }
    } catch {
      toast.error('Failed to delete page');
    }
  };
  const handleSeedAllPages = async () => {
    try {
      await seedAllCmsPages();
      toast.success('Default pages seeded');
      const pagesRes = await getCmsPages();
      const apiPages = Array.isArray(pagesRes.data) ? pagesRes.data : (pagesRes.data as any)?.data || [];
      setData(apiPages);
    } catch {
      toast.error('Failed to seed pages');
    }
  };
  const handleAddSection = () => {
    if (!addSectionPage) return;
    const name = newSectionName === 'Custom Section' ? customSectionName.trim() : newSectionName;
    if (!name) { toast.error('Section name required'); return; }
    setData(d => d.map(p => p.id === addSectionPage ? { ...p, sections: [...p.sections, { name, items: [] }], lastEdited: new Date().toISOString().split('T')[0] } : p));
    _apiCreate(addSectionPage, name, {}, undefined);
    toast.success('"' + name + '" added'); setAddSectionPage(null); setCustomSectionName('');
  };
  const handleDeleteSection = (pageId: string, sectionName: string) => {
    setData(d => d.map(p => p.id !== pageId ? p : { ...p, sections: p.sections.filter(s => s.name !== sectionName), lastEdited: new Date().toISOString().split('T')[0] }));
    toast.success('Section removed');
    if (selectedSectionName === sectionName) { setView('sections'); setSelectedSectionName(null); }
  };
  const handleMoveSection = async (pageId: string, sectionName: string, direction: 'up' | 'down') => {
    const page = data.find(p => p.id === pageId);
    if (!page) return;
    const idx = page.sections.findIndex(s => s.name === sectionName);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= page.sections.length) return;
    const newSections = [...page.sections];
    [newSections[idx], newSections[newIdx]] = [newSections[newIdx], newSections[idx]];
    const idsInOrder = newSections.map(s => s.items[0]?.id).filter(Boolean);
    try {
      await moveCmsSection(page.sections[idx].items[0]?.id || '', direction, page.slug);
      setData(d => d.map(p => p.id !== pageId ? p : { ...p, sections: newSections }));
      toast.success('Section moved');
    } catch {
      toast.error('Move failed');
    }
  };
  const handleAddItem = (content: SectionData, mediaUrl?: string) => {
    if (!selectedPageId || !selectedSectionName) return;
    const item: SectionItem = { id: 'item_' + Date.now(), content, status: 'Active', mediaUrl };
    setData(d => d.map(p => p.id !== selectedPageId ? p : { ...p, lastEdited: new Date().toISOString().split('T')[0], sections: p.sections.map(s => s.name !== selectedSectionName ? s : { ...s, items: [...s.items, item] }) }));
    _apiCreate(selectedPageId, selectedSectionName, content, mediaUrl);
  };
  const handleSaveItem = (content: SectionData, mediaUrl?: string) => {
    if (!selectedPageId || !selectedSectionName || !editingItem) return;
    setData(d => d.map(p => p.id !== selectedPageId ? p : { ...p, lastEdited: new Date().toISOString().split('T')[0], sections: p.sections.map(s => s.name !== selectedSectionName ? s : { ...s, items: s.items.map(i => i.id !== editingItem.id ? i : { ...i, content, mediaUrl: mediaUrl || i.mediaUrl }) }) }));
    _apiSave(editingItem.id, selectedPageId, selectedSectionName, content, mediaUrl);
  };
  const handleDeleteItem = () => {
    if (!deletingItem || !selectedPageId || !selectedSectionName) return;
    _apiDelete(deletingItem.id, selectedPageId, selectedSectionName);
    setData(d => d.map(p => p.id !== selectedPageId ? p : { ...p, lastEdited: new Date().toISOString().split('T')[0], sections: p.sections.map(s => s.name !== selectedSectionName ? s : { ...s, items: s.items.filter(i => i.id !== deletingItem.id) }) }));
    toast.success('Deleted'); setDeletingItem(null);
  };
  const handleToggleItem = (itemId: string, cur: string, secNameOverride?: string, pageIdOverride?: string) => {
    const sn = secNameOverride ?? selectedSectionName;
    const pid = pageIdOverride ?? selectedPageId;
    if (!pid || !sn) return;
    const ns = cur === 'Active' ? 'Inactive' : 'Active';
    setData(d => d.map(p => p.id !== pid ? p : { ...p, lastEdited: new Date().toISOString().split('T')[0], sections: p.sections.map(s => s.name !== sn ? s : { ...s, items: s.items.map(i => i.id !== itemId ? i : { ...i, status: ns }) }) }));
    toast.success('Set to ' + ns);
    _apiToggle(itemId, pid, sn, ns === 'Active');
  };


  const Breadcrumb = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
      <button onClick={() => { setView('pages'); setSelectedPageId(null); setSelectedSectionName(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: view === 'pages' ? textMain : textMuted, fontSize: '13px', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-inter)' }}>
        <Layout size={14} /> CMS & Pages
      </button>
      {selectedPage && <><ChevronRight size={13} color={textMuted} />
        <button onClick={() => { if (view === 'items') { setView('sections'); setSelectedSectionName(null); } }} style={{ background: 'none', border: 'none', cursor: view === 'items' ? 'pointer' : 'default', color: view === 'items' ? textMuted : textMain, fontSize: '13px', fontWeight: 600, padding: 0, fontFamily: 'var(--font-inter)' }}>
          {selectedPage.title}
        </button>
      </>}
      {selectedSection && <><ChevronRight size={13} color={textMuted} /><span style={{ fontSize: '13px', fontWeight: 600, color: textMain }}>{selectedSection.name}</span></>}
    </div>
  );

  const iconMap = (type: string) => {
    const map: Record<string, React.ReactNode> = {
      image: <ImageIcon size={18} color={accent} />, tag: <Tag size={18} color="#6366f1" />,
      mail: <Mail size={18} color="#FFC107" />, map: <MapPin size={18} color="#f59e0b" />,
      clock: <Clock size={18} color="#8b5cf6" />, text: <FileText size={18} color="#64748b" />, promo: <Eye size={18} color="#ec4899" />,
    };
    return map[type] || map.text;
  };

  const pageModalFields = (
    <>
      <FormField label="Page Title" value={pageForm.title} onChange={pfp('title')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. About Us" />
      <FormField label="Slug / URL" value={pageForm.slug} onChange={pfp('slug')} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. /about" />
      <FormField label="Status" value={pageForm.status} onChange={pfp('status')} options={['Published', 'Draft']} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
    </>
  );

  return (
    <div>
      {/* ── PAGES VIEW ── */}
      {view === 'pages' && (
        <div>
          <PageHeader title="CMS & Pages" subtitle="Manage your website pages and content" icon={Layout} onAdd={() => { setPageForm({ ...EMPTY_PAGE_FORM }); setAddPageOpen(true); }} addLabel="New Page" />
          <button onClick={handleSeedAllPages} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '9px', color: textMuted, fontSize: '13px', fontWeight: 600, padding: '9px 14px', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>
            <RefreshCw size={13} /> Seed Default Pages
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }} className="sg">
            {[{ label: 'Total Pages', val: String(data.length), color: accent },
              { label: 'Published', val: String(data.filter(p => p.status === 'Published').length), color: accent },
              { label: 'Total Items', val: String(data.reduce((a, p) => a + p.sections.reduce((b, s) => b + s.items.length, 0), 0)), color: '#6366f1' }
            ].map(s => (
              <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: textMuted, marginBottom: '6px' }}>{s.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.map(page => (
              <div key={page.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '14px 16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onClick={() => openPage(page.id)} onMouseEnter={e => (e.currentTarget.style.borderColor = accent)} onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(31,168,154,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    <Layout size={17} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: textMain, fontSize: '14.5px' }}>{page.title}</span>
                      <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: page.status === 'Published' ? 'rgba(31,168,154,0.12)' : 'rgba(255,193,7,0.12)', color: page.status === 'Published' ? accent : '#FFC107' }}>{page.status}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: textMuted, display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <code style={{ fontSize: '11px', color: accent, background: 'rgba(31,168,154,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{page.slug}</code>
                      <span>{page.sections.length} sections</span>
                      <span>Edited {page.lastEdited}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }} onClick={e => e.stopPropagation()}>
                      <button onClick={e => { e.stopPropagation(); setPageForm({ title: page.title, slug: page.slug, status: page.status }); setEditPage(page); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(31,168,154,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: accent, fontFamily: 'var(--font-inter)' }}>
                        <Edit size={11} /> Edit
                      </button>
                      <button onClick={e => { e.stopPropagation(); setViewPage(page); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(99,102,241,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: '#6366f1', fontFamily: 'var(--font-inter)' }}>
                        <Eye size={11} /> View
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeletePage(page); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: '#ef4444', fontFamily: 'var(--font-inter)' }}>
                        <Trash2 size={11} /> Delete
                      </button>
                    </div>
                  </div>
                  <ChevronRight size={16} color={textMuted} style={{ flexShrink: 0, marginTop: '10px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTIONS VIEW ── */}
      {view === 'sections' && selectedPage && (
        <div>
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: textMain, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-inter)', marginBottom: '10px' }}>
                <ChevronLeft size={14} /> Back to Pages
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>{selectedPage.title}</h2>
              <p style={{ fontSize: '13px', color: textMuted, margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <code style={{ fontSize: '11px', color: accent, background: 'rgba(31,168,154,0.1)', padding: '1px 7px', borderRadius: '4px' }}>{selectedPage.slug}</code>
                <span>{selectedPage.sections.length} sections</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!_isHome(selectedPage.id) && (
                <button onClick={() => handleResetSections(selectedPage.id)} title="Reset sections to defaults (clears duplicates)" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '9px', color: textMuted, fontSize: '13px', fontWeight: 600, padding: '9px 14px', cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>
                  <RefreshCw size={13} /> Reset Sections
                </button>
              )}
              <button onClick={() => { setAddSectionPage(selectedPage.id); setNewSectionName('Hero Banner'); setCustomSectionName(''); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-inter)', boxShadow: '0 4px 12px rgba(31,168,154,0.25)' }}>
                <Plus size={15} /> Add Section
              </button>
            </div>
          </div>
          {selectedPage.sections.length === 0 && !_isHome(selectedPage.id) ? (
            <div style={{ padding: '48px 20px', background: card, border: `1px dashed ${border}`, borderRadius: '12px', textAlign: 'center', color: textMuted }}>
              <Layout size={32} color={textMuted} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No sections yet</div>
              <div style={{ fontSize: '12.5px' }}>Click &quot;Add Section&quot; to start building this page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedPage.sections.map((sec, idx) => {
                const active = sec.items.filter(i => i.status === 'Active').length;
                return (
                  <div key={idx} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                    onClick={() => openSection(sec.name)} onMouseEnter={e => (e.currentTarget.style.borderColor = accent)} onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {iconMap(getSectionIconType(sec.name))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>{sec.name}</div>
                      <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                        <span>{sec.items.length} {sec.items.length === 1 ? 'item' : 'items'}</span>
                        {sec.items.length > 0 && <span style={{ color: accent, fontWeight: 600 }}>{active} active</span>}
                        {sectionHasMedia(sec.name) && <span style={{ color: '#6366f1' }}>has media</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); handleMoveSection(selectedPage.id, sec.name, 'up'); }} style={{ width: '28px', height: '28px', borderRadius: '7px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ChevronUp size={12} color={textMuted} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleMoveSection(selectedPage.id, sec.name, 'down'); }} style={{ width: '28px', height: '28px', borderRadius: '7px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <ChevronDown size={12} color={textMuted} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (confirm('Remove "' + sec.name + '" section?')) handleDeleteSection(selectedPage.id, sec.name); }} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(239,68,68,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Trash2 size={12} color="#ef4444" />
                      </button>
                      <ChevronRight size={16} color={textMuted} />
                    </div>
                  </div>
                );
              })}
              {/* ── Trusted Brands Section Card (homepage only) ── */}
              {_isHome(selectedPage.id) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setView('trusted-brands')}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Award size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Trusted Brands</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                      <span>{trustedBrands.length} {trustedBrands.length === 1 ? 'item' : 'items'}</span>
                      {trustedBrands.length > 0 && <span style={{ color: accent, fontWeight: 600 }}>{trustedBrands.length} active</span>}
                      {trustedBrands.length > 0 && <span style={{ color: '#6366f1' }}>has logo</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} color={textMuted} />
                </div>
              )}
              {/* ── Shop Hero Banner Card (shop page only) ── */}
              {(selectedPage?.slug === 'shop' || selectedPage?.id?.toLowerCase?.().includes('shop')) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setShopHeroBannerOpen(true)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Shop Hero Banner</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px' }}>{shopHeroBanner.tagline} · Always visible at top</div>
                  </div>
                  <Edit size={14} color={textMuted} />
                </div>
              )}
              {/* ── Shop Members Banner Card (shop page only) ── */}
              {(selectedPage?.slug === 'shop' || selectedPage?.id?.toLowerCase?.().includes('shop')) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setMembersBannerOpen(true)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Tag size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Members Banner</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px' }}>{membersBanner.title} · {membersBanner.subtitle}</div>
                  </div>
                  <Edit size={14} color={textMuted} />
                </div>
              )}
              {/* ── Brand Promo Banners Card (shop page only) ── */}
              {(selectedPage?.slug === 'shop' || selectedPage?.id?.toLowerCase?.().includes('shop')) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setView('brand-banners')}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Brand Promo Banners</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px' }}>{brandBanners.length} banner{brandBanners.length !== 1 ? 's' : ''} configured</div>
                  </div>
                  <ChevronRight size={16} color={textMuted} />
                </div>
              )}
              {/* ── Wholesale Page Banners Card (wholesale page only) ── */}
              {(selectedPage?.slug === 'wholesale' || selectedPage?.id?.toLowerCase?.().includes('wholesale')) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setView('wholesale-banners')}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Wholesale Page Banners</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                      <span>{wholesaleBanners.length} banner{wholesaleBanners.length !== 1 ? 's' : ''}</span>
                      {wholesaleBanners.length > 0 && <span style={{ color: accent, fontWeight: 600 }}>{wholesaleBanners.filter(b => b.isActive).length} active</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} color={textMuted} />
                </div>
              )}
              {/* ── Get Now Page Banners Card (get-now page only) ── */}
              {(selectedPage?.slug === 'get-now' || selectedPage?.id?.toLowerCase?.().includes('get-now') || selectedPage?.id?.toLowerCase?.().includes('bnpl')) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setView('get-now-banners')}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Get Now Page Banners</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                      <span>{getNowBanners.length} banner{getNowBanners.length !== 1 ? 's' : ''}</span>
                      {getNowBanners.length > 0 && <span style={{ color: accent, fontWeight: 600 }}>{getNowBanners.filter(b => b.isActive).length} active</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} color={textMuted} />
                </div>
              )}
              {/* ── Announcement Bar Card (homepage only) ── */}
              {_isHome(selectedPage.id) && (
                <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => setAnnouncementBarOpen(true)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '11px', background: 'rgba(31,168,154,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={18} color={accent} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>Announcement Bar</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px' }}>{announcementBar.announcementEnabled ? 'Enabled' : 'Disabled'} - {announcementBar.announcementText || 'No text'}</div>
                  </div>
                  <Edit size={14} color={textMuted} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TRUSTED BRANDS VIEW ── */}
      {view === 'trusted-brands' && selectedPage && (
        <div>
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: textMain, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-inter)', marginBottom: '10px' }}>
                <ChevronLeft size={14} /> Back to {selectedPage.title}
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>Trusted Brands</h2>
              <p style={{ fontSize: '13px', color: textMuted, margin: '3px 0 0' }}>Homepage logo section — {trustedBrands.length} brand{trustedBrands.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setTbForm({ name: '', logo: '', slug: '' }); setTbEditIdx(null); setTbOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-inter)', boxShadow: '0 4px 12px rgba(31,168,154,0.25)' }}>
              <Plus size={15} /> Add Brand
            </button>
          </div>
          {trustedBrands.length === 0 ? (
            <div style={{ padding: '48px 20px', background: card, border: `1px dashed ${border}`, borderRadius: '12px', textAlign: 'center', color: textMuted }}>
              <Award size={32} color={textMuted} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No trusted brands yet</div>
              <div style={{ fontSize: '12.5px' }}>Click &quot;Add Brand&quot; to add homepage logo entries.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {trustedBrands.map((brand, idx) => (
                <div key={brand.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: isDark ? '#1e2a35' : '#f0f9ff', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {brand.logo ? <img src={brand.logo} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} onError={(e: any) => { e.target.style.display = 'none'; }} /> : <Award size={18} color={accent} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>{brand.name}</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                      <code style={{ fontSize: '11px', color: accent, background: 'rgba(31,168,154,0.1)', padding: '1px 6px', borderRadius: '4px' }}>/shop#brand-{brand.slug}</code>
                      <span style={{ color: '#6366f1' }}>has logo</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => { setTbForm({ name: brand.name, logo: brand.logo, slug: brand.slug }); setTbEditIdx(idx); setTbOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(31,168,154,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: accent, fontFamily: 'var(--font-inter)' }}>
                      <Edit size={11} /> Edit
                    </button>
                    <button onClick={() => setTbDeleteIdx(idx)} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} color='#ef4444' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WHOLESALE BANNERS VIEW ── */}
      {view === 'wholesale-banners' && selectedPage && (
        <div>
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: textMain, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-inter)', marginBottom: '10px' }}>
                <ChevronLeft size={14} /> Back to {selectedPage.title}
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>Wholesale Page Banners</h2>
              <p style={{ fontSize: '13px', color: textMuted, margin: '3px 0 0' }}>Jumia-style horizontal banner slider — {wholesaleBanners.length} banner{wholesaleBanners.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setWbForm(defaultWbForm); setWbEditIdx(null); setWholesaleBannersOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-inter)', boxShadow: '0 4px 12px rgba(31,168,154,0.25)' }}>
              <Plus size={15} /> Add Banner
            </button>
          </div>
          {wholesaleBanners.length === 0 ? (
            <div style={{ padding: '48px 20px', background: card, border: `1px dashed ${border}`, borderRadius: '12px', textAlign: 'center', color: textMuted }}>
              <ImageIcon size={32} color={textMuted} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No banners yet</div>
              <div style={{ fontSize: '12.5px' }}>Click "Add Banner" to create a Jumia-style image banner for the wholesale page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {wholesaleBanners.map((banner, idx) => (
                <div key={banner.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '80px', height: '56px', borderRadius: '10px', background: isDark ? '#1e2a35' : '#f0f9ff', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {banner.image ? <img src={banner.image} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover', padding: '2px' }} onError={(e: any) => { e.target.style.display = 'none'; }} /> : <ImageIcon size={18} color={accent} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>{banner.title}</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                      {banner.link && <code style={{ fontSize: '11px', color: accent, background: 'rgba(31,168,154,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{banner.link}</code>}
                      {banner.linkText && <span>{banner.linkText}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleWbToggle(idx)} style={{ height: '28px', paddingInline: '10px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, fontFamily: 'var(--font-inter)', background: banner.isActive ? 'rgba(31,168,154,0.1)' : 'rgba(100,116,139,0.1)', color: banner.isActive ? accent : '#8E9AAF' }}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => { setWbForm({ title: banner.title, image: banner.image, link: banner.link || '', linkText: banner.linkText || '' }); setWbEditIdx(idx); setWholesaleBannersOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(31,168,154,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: accent, fontFamily: 'var(--font-inter)' }}>
                      <Edit size={11} /> Edit
                    </button>
                    <button onClick={() => setWbDeleteIdx(idx)} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} color='#ef4444' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GET NOW BANNERS VIEW ── */}
      {view === 'get-now-banners' && selectedPage && (
        <div>
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: textMain, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-inter)', marginBottom: '10px' }}>
                <ChevronLeft size={14} /> Back to {selectedPage.title}
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>Get Now Page Banners</h2>
              <p style={{ fontSize: '13px', color: textMuted, margin: '3px 0 0' }}>Jumia-style horizontal banner slider — {getNowBanners.length} banner{getNowBanners.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setGnForm(defaultGnForm); setGnEditIdx(null); setGetNowBannersOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-inter)', boxShadow: '0 4px 12px rgba(31,168,154,0.25)' }}>
              <Plus size={15} /> Add Banner
            </button>
          </div>
          {getNowBanners.length === 0 ? (
            <div style={{ padding: '48px 20px', background: card, border: `1px dashed ${border}`, borderRadius: '12px', textAlign: 'center', color: textMuted }}>
              <ImageIcon size={32} color={textMuted} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No banners yet</div>
              <div style={{ fontSize: '12.5px' }}>Click "Add Banner" to create a Jumia-style image banner for the Get Now page.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {getNowBanners.map((banner, idx) => (
                <div key={banner.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '80px', height: '56px', borderRadius: '10px', background: isDark ? '#1e2a35' : '#f0f9ff', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                    {banner.image ? <img src={banner.image} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover', padding: '2px' }} onError={(e: any) => { e.target.style.display = 'none'; }} /> : <ImageIcon size={18} color={accent} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>{banner.title}</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px' }}>
                      {banner.link && <code style={{ fontSize: '11px', color: accent, background: 'rgba(31,168,154,0.1)', padding: '1px 6px', borderRadius: '4px' }}>{banner.link}</code>}
                      {banner.linkText && <span>{banner.linkText}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleGnToggle(idx)} style={{ height: '28px', paddingInline: '10px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, fontFamily: 'var(--font-inter)', background: banner.isActive ? 'rgba(31,168,154,0.1)' : 'rgba(100,116,139,0.1)', color: banner.isActive ? accent : '#8E9AAF' }}>
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => { setGnForm({ title: banner.title, image: banner.image, link: banner.link || '', linkText: banner.linkText || '' }); setGnEditIdx(idx); setGetNowBannersOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(31,168,154,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: accent, fontFamily: 'var(--font-inter)' }}>
                      <Edit size={11} /> Edit
                    </button>
                    <button onClick={() => setGnDeleteIdx(idx)} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} color='#ef4444' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BRAND BANNERS VIEW ── */}
      {view === 'brand-banners' && selectedPage && (
        <div>
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: textMain, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-inter)', marginBottom: '10px' }}>
                <ChevronLeft size={14} /> Back to {selectedPage.title}
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>Brand Promo Banners</h2>
              <p style={{ fontSize: '13px', color: textMuted, margin: '3px 0 0' }}>Shop page brand promotional banners — {brandBanners.length} banner{brandBanners.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setBbForm(defaultBbForm); setBbEditIdx(null); setBbOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-inter)', boxShadow: '0 4px 12px rgba(31,168,154,0.25)' }}>
              <Plus size={15} /> Add Banner
            </button>
          </div>
          {brandBanners.length === 0 ? (
            <div style={{ padding: '48px 20px', background: card, border: `1px dashed ${border}`, borderRadius: '12px', textAlign: 'center', color: textMuted }}>
              <ImageIcon size={32} color={textMuted} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No brand banners yet</div>
              <div style={{ fontSize: '12.5px' }}>Click &quot;Add Banner&quot; to create a brand promotional banner.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {brandBanners.map((bb, idx) => (
                <div key={bb.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accent)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = border)}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: bb.bgColor || '#1FA89A', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ImageIcon size={18} color={bb.accentColor || '#fff'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: textMain, fontSize: '14px' }}>{bb.tagline || bb.slug}</div>
                    <div style={{ fontSize: '12px', color: textMuted, marginTop: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <code style={{ fontSize: '11px', color: accent, background: 'rgba(31,168,154,0.1)', padding: '1px 6px', borderRadius: '4px' }}>/{bb.slug}</code>
                      {bb.description && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>{bb.description}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => { setBbForm({ slug: bb.slug, tagline: bb.tagline, description: bb.description, bgColor: bb.bgColor, accentColor: bb.accentColor, buttonText: bb.buttonText, buttonLink: bb.buttonLink, imageUrl: bb.imageUrl || '' }); setBbEditIdx(idx); setBbOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '5px', height: '28px', paddingInline: '10px', borderRadius: '7px', background: 'rgba(31,168,154,0.1)', border: 'none', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: accent, fontFamily: 'var(--font-inter)' }}>
                      <Edit size={11} /> Edit
                    </button>
                    <button onClick={() => setBbDeleteIdx(idx)} style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(239,68,68,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={12} color='#ef4444' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ITEMS VIEW ── */}
      {view === 'items' && selectedPage && selectedSection && (
        <div>
          <Breadcrumb />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <button onClick={goBack} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', color: textMain, fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-inter)', marginBottom: '10px' }}>
                <ChevronLeft size={14} /> Back to Sections
              </button>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: textMain, margin: 0 }}>{selectedSection.name}</h2>
              <p style={{ fontSize: '13px', color: textMuted, margin: '3px 0 0' }}>{selectedPage.title} — {selectedSection.items.length} {selectedSection.items.length === 1 ? 'item' : 'items'}</p>
            </div>
            <button onClick={() => setAddingItem(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#1FA89A,#27B9AF)', border: 'none', borderRadius: '9px', color: 'white', fontSize: '13.5px', fontWeight: 600, padding: '9px 16px', cursor: 'pointer', fontFamily: 'var(--font-inter)', boxShadow: '0 4px 12px rgba(31,168,154,0.25)' }}>
              <Plus size={15} /> Add New {selectedSection.name}
            </button>
          </div>
          {selectedSection.items.length === 0 ? (
            <div style={{ padding: '48px 20px', background: card, border: `1px dashed ${border}`, borderRadius: '12px', textAlign: 'center', color: textMuted }}>
              <ImageIcon size={32} color={textMuted} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>No items yet</div>
              <div style={{ fontSize: '12.5px' }}>Click &quot;Add New {selectedSection.name}&quot; to upload your first item.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '14px' }} className="items-grid">
              {selectedSection.items.map(item => {
                const hasMedia = sectionHasMedia(selectedSection.name);
                return (
                  <div key={item.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {hasMedia && (
                      <div style={{ height: '160px', background: surface, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                        {item.mediaUrl ? (
                          (() => {
                            const ytMatch = item.mediaUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([-\w]{11})/);
                            const ytId = ytMatch?.[1];
                            if (ytId) return <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
                            if (item.mediaUrl?.match(/\.(mp4|mov|avi|webm|ogg|m4v)(\?.*)?$/i)) return <video src={item.mediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
                            return <img src={item.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />;
                          })()
                        ) : item.content.media ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(31,168,154,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ImageIcon size={22} color={accent} />
                            </div>
                            <span style={{ fontSize: '11px', color: textMuted, wordBreak: 'break-all' }}>{item.content.media}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
                            <ImageIcon size={36} color={textMuted} />
                            <span style={{ fontSize: '11.5px', color: textMuted }}>No image uploaded</span>
                          </div>
                        )}
                        <div style={{ position: 'absolute', top: 8, right: 8 }}>
                          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: item.status === 'Active' ? 'rgba(31,168,154,0.9)' : 'rgba(100,116,139,0.85)', color: 'white' }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '12px 14px', flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: textMain, lineHeight: 1.3, marginBottom: '4px' }}>
                        {getItemPreview(selectedSection.name, item.content)}
                      </div>
                      {getItemSub(item.content) && (
                        <div style={{ fontSize: '12px', color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getItemSub(item.content)}
                        </div>
                      )}
                      {!hasMedia && (
                        <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: item.status === 'Active' ? 'rgba(31,168,154,0.12)' : 'rgba(100,116,139,0.12)', color: item.status === 'Active' ? accent : '#8E9AAF' }}>
                          {item.status}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', padding: '0 14px 14px' }}>
                      <button onClick={() => setEditingItem(item)} style={{ flex: 1, height: '34px', borderRadius: '8px', background: 'rgba(31,168,154,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', cursor: 'pointer', fontSize: '12.5px', fontWeight: 600, color: accent, fontFamily: 'var(--font-inter)' }}>
                        <Edit size={13} /> Edit
                      </button>
                      <button onClick={() => handleToggleItem(item.id, item.status)} style={{ flex: 1, height: '34px', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, fontFamily: 'var(--font-inter)', background: item.status === 'Active' ? 'rgba(100,116,139,0.1)' : 'rgba(31,168,154,0.1)', color: item.status === 'Active' ? '#8E9AAF' : accent }}>
                        {item.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setDeletingItem(item)} style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={13} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      <Modal open={addPageOpen} onClose={() => setAddPageOpen(false)} title="Add New Page">
        {pageModalFields}
        <ModalFooter onClose={() => setAddPageOpen(false)} onSubmit={handleAddPage} loading={false} submitLabel="Add Page" isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      <Modal open={!!editPage} onClose={() => setEditPage(null)} title={'Edit: ' + (editPage?.title ?? '')}>
        {pageModalFields}
        <ModalFooter onClose={() => setEditPage(null)} onSubmit={handleEditPage} loading={false} submitLabel="Save Changes" isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      <Modal open={!!viewPage} onClose={() => setViewPage(null)} title="Page Details">
        {viewPage && <>
          <FormField label="Title" value={viewPage.title} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Slug" value={viewPage.slug} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Status" value={viewPage.status} readOnly isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <button onClick={() => setViewPage(null)} style={{ width: '100%', padding: '10px', borderRadius: '9px', background: isDark ? '#1E293B' : '#F1F5F9', border: `1px solid ${border}`, color: textMain, fontSize: '13.5px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-inter)' }}>Close</button>
        </>}
      </Modal>
      <ConfirmDialog open={!!deletePage} onClose={() => setDeletePage(null)} onConfirm={handleDeletePage} loading={false} title="Delete Page" message={'Delete "' + deletePage?.title + '" permanently?'} />
      <Modal open={!!addSectionPage} onClose={() => setAddSectionPage(null)} title="Add Section">
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Section Type</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ADD_SECTION_NAMES.map(name => (
              <button key={name} onClick={() => setNewSectionName(name)} style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-inter)', background: newSectionName === name ? accent : surface, border: `1px solid ${newSectionName === name ? accent : border}`, color: newSectionName === name ? 'white' : textMuted }}>{name}</button>
            ))}
          </div>
        </div>
        {newSectionName === 'Custom Section' && (
          <FormField label="Custom Section Name" value={customSectionName} onChange={setCustomSectionName} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} placeholder="e.g. Testimonials" />
        )}
        <ModalFooter onClose={() => setAddSectionPage(null)} onSubmit={handleAddSection} loading={false} submitLabel="Add Section" isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      {addingItem && selectedSection && selectedPage && (
        <ItemFormModal sectionName={selectedSection.name} pageTitle={selectedPage.title} initialValues={{}} onClose={() => setAddingItem(false)} onSave={handleAddItem} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} isEdit={false} />
      )}
      {editingItem && selectedSection && selectedPage && (
        <ItemFormModal sectionName={selectedSection.name} pageTitle={selectedPage.title} initialValues={editingItem.content} onClose={() => setEditingItem(null)} onSave={handleSaveItem} isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} isEdit={true} />
      )}
      <ConfirmDialog open={!!deletingItem} onClose={() => setDeletingItem(null)} onConfirm={handleDeleteItem} loading={false} title="Delete Item" message={'Delete "' + (deletingItem ? getItemPreview(selectedSection?.name || '', deletingItem.content) : '') + '" permanently?'} />
      {/* ── Trusted Brands Modal ── */}
      <Modal open={tbOpen} onClose={() => { setTbOpen(false); setTbEditIdx(null); }} title={tbEditIdx !== null ? 'Edit Brand' : 'Add Trusted Brand'}>
        <FormField label="Brand Name *" value={tbForm.name} onChange={(v) => setTbForm(f => ({ ...f, name: v, ...(tbEditIdx === null ? { slug: toTbSlug(v) } : {}) }))} placeholder="e.g. Samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: textMuted, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Brand Logo</label>
          <CloudinaryUpload value={tbForm.logo} onChange={(v) => setTbForm(f => ({ ...f, logo: v }))} isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <FormField label="Shop Scroll Anchor" value={tbForm.slug} onChange={(v) => setTbForm(f => ({ ...f, slug: v }))} placeholder="e.g. samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <p style={{ fontSize: '11px', color: textMuted, marginTop: '4px', marginBottom: 0 }}>When clicked on homepage → auto-scrolls to /shop#brand-{tbForm.slug || '...'}</p>
        </div>
        <ModalFooter onClose={() => { setTbOpen(false); setTbEditIdx(null); }} onSubmit={handleTbSave} loading={tbSaving} submitLabel={tbEditIdx !== null ? 'Save Changes' : 'Add Brand'} isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      <ConfirmDialog open={tbDeleteIdx !== null} onClose={() => setTbDeleteIdx(null)} onConfirm={handleTbDelete} loading={tbSaving} title="Delete Brand" message={tbDeleteIdx !== null ? `Delete "${trustedBrands[tbDeleteIdx]?.name}" from trusted brands?` : 'Delete this brand?'} />
      {/* ── Shop Members Banner Modal ── */}
      <Modal open={membersBannerOpen} onClose={() => setMembersBannerOpen(false)} title="Shop Members Banner">
        <FormField label="Tag / Label (e.g. KRYROS Members)" value={membersBanner.tag} onChange={(v) => setMembersBanner(b => ({ ...b, tag: v }))} placeholder="KRYROS Members" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Title (e.g. Extra 5% Off)" value={membersBanner.title} onChange={(v) => setMembersBanner(b => ({ ...b, title: v }))} placeholder="Extra 5% Off" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Subtitle" value={membersBanner.subtitle} onChange={(v) => setMembersBanner(b => ({ ...b, subtitle: v }))} placeholder="On selected products" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Button Text" value={membersBanner.ctaText} onChange={(v) => setMembersBanner(b => ({ ...b, ctaText: v }))} placeholder="Join Now" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Button Link" value={membersBanner.ctaLink} onChange={(v) => setMembersBanner(b => ({ ...b, ctaLink: v }))} placeholder="/register" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>

        <div>
          <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Banner Image <span style={{ fontWeight: 400 }}>(optional — overrides background color)</span></div>
          <CloudinaryUpload value={membersBanner.imageUrl || ''} onChange={(v) => setMembersBanner(b => ({ ...b, imageUrl: v }))} isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
        </div>
        <ModalFooter onClose={() => setMembersBannerOpen(false)} onSubmit={async () => { setMembersBannerSaving(true); try { await upsertCmsSiteConfig('shop', { membersBanner, heroBanner: shopHeroBanner }); toast.success('Members Banner saved'); setMembersBannerOpen(false); } catch { toast.error('Save failed'); } setMembersBannerSaving(false); }} loading={membersBannerSaving} submitLabel="Save Banner" isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      {/* ── Shop Hero Banner Modal ── */}
      <Modal open={shopHeroBannerOpen} onClose={() => setShopHeroBannerOpen(false)} title="Shop Hero Banner">
        <p style={{ fontSize: '11.5px', color: textMuted, marginBottom: '14px' }}>This banner always appears at the very top of the Shop page — no brand selection needed. Customers see it immediately when they open the shop.</p>
        <FormField label="Tagline (main heading)" value={shopHeroBanner.tagline} onChange={(v) => setShopHeroBanner(h => ({ ...h, tagline: v }))} placeholder="Shop the Best Deals" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Subtitle" value={shopHeroBanner.subtitle} onChange={(v) => setShopHeroBanner(h => ({ ...h, subtitle: v }))} placeholder="Quality tech, unbeatable prices" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Button Text" value={shopHeroBanner.ctaText} onChange={(v) => setShopHeroBanner(h => ({ ...h, ctaText: v }))} placeholder="Explore Now" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Button Link" value={shopHeroBanner.ctaLink} onChange={(v) => setShopHeroBanner(h => ({ ...h, ctaLink: v }))} placeholder="/shop" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>

        <div>
          <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Banner Image <span style={{ fontWeight: 400 }}>(optional — overrides background color)</span></div>
          <CloudinaryUpload value={shopHeroBanner.imageUrl || ''} onChange={(v) => setShopHeroBanner(h => ({ ...h, imageUrl: v }))} isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
        </div>
        <ModalFooter onClose={() => setShopHeroBannerOpen(false)} onSubmit={async () => { setShopHeroBannerSaving(true); try { await upsertCmsSiteConfig('shop', { membersBanner, heroBanner: shopHeroBanner }); toast.success('Shop Hero Banner saved'); setShopHeroBannerOpen(false); } catch { toast.error('Save failed'); } setShopHeroBannerSaving(false); }} loading={shopHeroBannerSaving} submitLabel="Save Banner" isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      {/* ── Wholesale Banner Add/Edit Modal ── */}
      <Modal open={wholesaleBannersOpen} onClose={() => { setWholesaleBannersOpen(false); setWbEditIdx(null); }} title={wbEditIdx !== null ? 'Edit Banner' : 'Add Wholesale Banner'}>
        <FormField label="Banner Title *" value={wbForm.title} onChange={(v) => setWbForm(f => ({ ...f, title: v }))} placeholder="e.g. Flash Sale — Up to 40% Off" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <p style={{ fontSize: '11px', color: textMuted, marginTop: '-8px', marginBottom: '12px' }}>This is used as alt-text and internal reference — the banner itself is image-only.</p>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Banner Image * (16:9 recommended, e.g. 1024x576px)</div>
          <CloudinaryUpload value={wbForm.image} onChange={(v) => setWbForm(f => ({ ...f, image: v }))} accept="image/*" folder="kryros/banners" isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Click Link (optional)" value={wbForm.link || ''} onChange={(v) => setWbForm(f => ({ ...f, link: v }))} placeholder="/shop" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Button Text (optional)" value={wbForm.linkText || ''} onChange={(v) => setWbForm(f => ({ ...f, linkText: v }))} placeholder="Shop Now" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <ModalFooter onClose={() => { setWholesaleBannersOpen(false); setWbEditIdx(null); }} onSubmit={handleWbSave} loading={wholesaleBannersSaving} submitLabel={wbEditIdx !== null ? 'Save Changes' : 'Add Banner'} isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      <ConfirmDialog open={wbDeleteIdx !== null} onClose={() => setWbDeleteIdx(null)} onConfirm={handleWbDelete} loading={false} title="Delete Banner" message={wbDeleteIdx !== null ? `Delete "${wholesaleBanners[wbDeleteIdx]?.title}" from wholesale banners?` : 'Delete this banner?'} />
      {/* ── Get Now Banner Add/Edit Modal ── */}
      <Modal open={getNowBannersOpen} onClose={() => { setGetNowBannersOpen(false); setGnEditIdx(null); }} title={gnEditIdx !== null ? 'Edit Banner' : 'Add Get Now Banner'}>
        <FormField label="Banner Title *" value={gnForm.title} onChange={(v) => setGnForm(f => ({ ...f, title: v }))} placeholder="e.g. Get Now — Pay in 3 Months" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <p style={{ fontSize: '11px', color: textMuted, marginTop: '-8px', marginBottom: '12px' }}>This is used as alt-text and internal reference — the banner itself is image-only.</p>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Banner Image * (16:9 recommended, e.g. 1024x576px)</div>
          <CloudinaryUpload value={gnForm.image} onChange={(v) => setGnForm(f => ({ ...f, image: v }))} accept="image/*" folder="kryros/banners" isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="Click Link (optional)" value={gnForm.link || ''} onChange={(v) => setGnForm(f => ({ ...f, link: v }))} placeholder="/register" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="Button Text (optional)" value={gnForm.linkText || ''} onChange={(v) => setGnForm(f => ({ ...f, linkText: v }))} placeholder="Apply Now" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        <ModalFooter onClose={() => { setGetNowBannersOpen(false); setGnEditIdx(null); }} onSubmit={handleGnSave} loading={getNowBannersSaving} submitLabel={gnEditIdx !== null ? 'Save Changes' : 'Add Banner'} isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      <ConfirmDialog open={gnDeleteIdx !== null} onClose={() => setGnDeleteIdx(null)} onConfirm={handleGnDelete} loading={false} title="Delete Banner" message={gnDeleteIdx !== null ? `Delete "${getNowBanners[gnDeleteIdx]?.title}" from Get Now banners?` : 'Delete this banner?'} />
      {/* ── Announcement Bar Modal ── */}
      <Modal open={announcementBarOpen} onClose={() => setAnnouncementBarOpen(false)} title="Announcement Bar">
        <p style={{ fontSize: '11.5px', color: textMuted, marginBottom: '14px' }}>This bar appears at the very top of the header on all pages. Leave text empty to hide it.</p>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: textMain, cursor: 'pointer' }}>
            <input type="checkbox" checked={announcementBar.announcementEnabled} onChange={(e) => setAnnouncementBar(b => ({ ...b, announcementEnabled: e.target.checked }))} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            Enable Announcement Bar
          </label>
        </div>
        <FormField label="Announcement Text" value={announcementBar.announcementText} onChange={(v) => setAnnouncementBar(b => ({ ...b, announcementText: v }))} placeholder="e.g. Free Delivery on all orders over $100" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <FormField label="CTA Text (e.g. Learn More)" value={announcementBar.announcementCta} onChange={(v) => setAnnouncementBar(b => ({ ...b, announcementCta: v }))} placeholder="Learn More" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
          <FormField label="CTA Link" value={announcementBar.announcementCtaLink} onChange={(v) => setAnnouncementBar(b => ({ ...b, announcementCtaLink: v }))} placeholder="/track" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        </div>
        {/* ── Color Pickers ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: textMain, marginBottom: '6px' }}>Background Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={announcementBar.announcementBgColor || '#27B9AF'} onChange={(e) => setAnnouncementBar(b => ({ ...b, announcementBgColor: e.target.value }))} style={{ width: '40px', height: '36px', border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
              <input type="text" value={announcementBar.announcementBgColor} onChange={(e) => setAnnouncementBar(b => ({ ...b, announcementBgColor: e.target.value }))} placeholder="#27B9AF" style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${border}`, background: surface, color: textMain, fontSize: '12px', outline: 'none' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: textMain, marginBottom: '6px' }}>Text Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="color" value={announcementBar.announcementTextColor || '#FFFFFF'} onChange={(e) => setAnnouncementBar(b => ({ ...b, announcementTextColor: e.target.value }))} style={{ width: '40px', height: '36px', border: `1px solid ${border}`, borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
              <input type="text" value={announcementBar.announcementTextColor} onChange={(e) => setAnnouncementBar(b => ({ ...b, announcementTextColor: e.target.value }))} placeholder="#FFFFFF" style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: `1px solid ${border}`, background: surface, color: textMain, fontSize: '12px', outline: 'none' }} />
            </div>
          </div>
        </div>
        {/* ── Live Preview ── */}
        <div style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: textMuted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Preview</label>
          <div style={{ borderRadius: '6px', overflow: 'hidden', border: `1px solid ${border}` }}>
            <div style={{ backgroundColor: announcementBar.announcementBgColor || '#27B9AF', color: announcementBar.announcementTextColor || '#FFFFFF', padding: '7px 14px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{announcementBar.announcementText || 'Your announcement text appears here'}</span>
              {announcementBar.announcementCta && <span style={{ fontWeight: 600, opacity: 0.9 }}>{announcementBar.announcementCta} ›</span>}
            </div>
          </div>
        </div>
        <ModalFooter onClose={() => setAnnouncementBarOpen(false)} onSubmit={async () => { setAnnouncementBarSaving(true); try { await upsertCmsSiteConfig('header', announcementBar); toast.success('Announcement Bar saved'); setAnnouncementBarOpen(false); } catch { toast.error('Save failed'); } setAnnouncementBarSaving(false); }} loading={announcementBarSaving} submitLabel="Save" isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      {/* ── Brand Banner Add/Edit Modal ── */}
      <Modal open={bbOpen} onClose={() => setBbOpen(false)} title={bbEditIdx !== null ? 'Edit Brand Banner' : 'Add Brand Banner'}>
        <FormField label="Brand Slug (e.g. samsung)" value={bbForm.slug} onChange={(v) => setBbForm(f => ({ ...f, slug: v }))} placeholder="samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Tagline (e.g. Innovate Your World)" value={bbForm.tagline} onChange={(v) => setBbForm(f => ({ ...f, tagline: v }))} placeholder="Innovate Your World" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Description" value={bbForm.description} onChange={(v) => setBbForm(f => ({ ...f, description: v }))} placeholder="Short brand description..." isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Background Color</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={bbForm.bgColor} onChange={(e) => setBbForm(f => ({ ...f, bgColor: e.target.value }))} style={{ width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', padding: '2px' }} />
              <input type="text" value={bbForm.bgColor} onChange={(e) => setBbForm(f => ({ ...f, bgColor: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '12px', outline: 'none' }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Accent Color</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={bbForm.accentColor} onChange={(e) => setBbForm(f => ({ ...f, accentColor: e.target.value }))} style={{ width: '36px', height: '36px', borderRadius: '6px', border: `1px solid ${border}`, cursor: 'pointer', padding: '2px' }} />
              <input type="text" value={bbForm.accentColor} onChange={(e) => setBbForm(f => ({ ...f, accentColor: e.target.value }))} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: surface, border: `1px solid ${border}`, color: textMain, fontSize: '12px', outline: 'none' }} />
            </div>
          </div>
        </div>
        <FormField label="Button Text" value={bbForm.buttonText} onChange={(v) => setBbForm(f => ({ ...f, buttonText: v }))} placeholder="Shop Brand" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />
        <FormField label="Button Link (e.g. /shop?brand=samsung)" value={bbForm.buttonLink} onChange={(v) => setBbForm(f => ({ ...f, buttonLink: v }))} placeholder="/shop?brand=samsung" isDark={isDark} border={border} textMain={textMain} textMuted={textMuted} surface={surface} />

        <div>
          <div style={{ fontSize: '12px', color: textMuted, fontWeight: 600, marginBottom: '6px' }}>Banner Image <span style={{ fontWeight: 400 }}>(optional — overrides background color)</span></div>
          <CloudinaryUpload value={bbForm.imageUrl || ''} onChange={(v) => setBbForm(f => ({ ...f, imageUrl: v }))} isDark={isDark} border={border} surface={surface} textMuted={textMuted} />
        </div>
        <ModalFooter onClose={() => setBbOpen(false)} onSubmit={async () => {
          setBbSaving(true);
          try {
            const banner: BrandBanner = { id: bbEditIdx !== null ? brandBanners[bbEditIdx].id : `bb-${Date.now()}`, ...bbForm };
            const updated = bbEditIdx !== null ? brandBanners.map((b, i) => i === bbEditIdx ? banner : b) : [...brandBanners, banner];
            await saveBrandBanners(updated);
            setBbOpen(false);
          } catch { toast.error('Failed to save banner'); }
          setBbSaving(false);
        }} loading={bbSaving} submitLabel={bbEditIdx !== null ? 'Save Changes' : 'Add Banner'} isDark={isDark} border={border} textMain={textMain} />
      </Modal>
      <ConfirmDialog open={bbDeleteIdx !== null} onClose={() => setBbDeleteIdx(null)} onConfirm={async () => { const updated = brandBanners.filter((_, i) => i !== bbDeleteIdx); await saveBrandBanners(updated); setBbDeleteIdx(null); }} loading={bbSaving} title="Delete Brand Banner" message={bbDeleteIdx !== null ? `Delete "${brandBanners[bbDeleteIdx]?.tagline || brandBanners[bbDeleteIdx]?.slug}" banner?` : 'Delete this banner?'} />
      <style>{`.sg{} @media(max-width:768px){.sg{grid-template-columns:1fr!important;}.items-grid{grid-template-columns:1fr!important;}}`}</style>
    </div>
  );
}

export default function CMSPagesPage() { return <AdminShell><CMSContent /></AdminShell>; }
