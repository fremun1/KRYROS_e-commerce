'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface FlashSalesProduct {
  id: string;
  name: string;
  price: number;
  discount: number;
  stock: number;
  image: string;
}

interface Category {
  id: string;
  name: string;
  image: string;
}

export default function FlashSales() {
  const [timeLeft, setTimeLeft] = useState({
    hours: 1,
    minutes: 14,
    seconds: 5,
  });

  // Sample featured products - replace with real data
  const featuredProducts: FlashSalesProduct[] = [
    {
      id: '1',
      name: 'EASYPIE 20000mAh Ultra...',
      price: 7100,
      discount: 51,
      stock: 50,
      image: '/product1.jpg',
    },
    {
      id: '2',
      name: 'Nexus 16 Inches Standi...',
      price: 24500,
      discount: 21,
      stock: 20,
      image: '/product2.jpg',
    },
    {
      id: '3',
      name: 'LESIA L176 1...',
      price: 7382,
      discount: 0,
      stock: 20,
      image: '/product3.jpg',
    },
  ];

  const categories: Category[] = [
    { id: '1', name: 'Phones &\nTablets', image: '/cat1.jpg' },
    { id: '2', name: 'Appliances\ndeals', image: '/cat2.jpg' },
    { id: '3', name: 'TV & Audio', image: '/cat3.jpg' },
    { id: '4', name: 'Sneakers', image: '/cat4.jpg' },
    { id: '5', name: 'Fashion', image: '/cat5.jpg' },
    { id: '6', name: 'Home & Office', image: '/cat6.jpg' },
    { id: '7', name: 'Beverages\ndeals', image: '/cat7.jpg' },
    { id: '8', name: 'Pay Small\nSmall', image: '/cat8.jpg' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else if (hours > 0) {
          hours--;
          minutes = 59;
          seconds = 59;
        } else {
          // Reset or handle completion
          hours = 1;
          minutes = 14;
          seconds = 5;
        }

        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (value: number) => String(value).padStart(2, '0');

  return (
    <section className="w-full bg-white">
      {/* Header with red background */}
      <div className="bg-[#C1304B] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🏷️</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Flash Sales</h2>
          </div>
          <a
            href="#"
            className="text-white hover:text-gray-100 transition text-sm sm:text-base font-medium flex items-center gap-1"
          >
            See All <ChevronRight size={20} />
          </a>
        </div>

        {/* Timer Section */}
        <div className="mt-3 flex items-center gap-2 sm:gap-3">
          <span className="text-white text-sm sm:text-base font-medium">TIME LEFT:</span>
          <div className="flex items-center gap-1 sm:gap-2 font-bold">
            <span className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded">
              {formatTime(timeLeft.hours)}h
            </span>
            <span className="text-white">:</span>
            <span className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded">
              {formatTime(timeLeft.minutes)}m
            </span>
            <span className="text-white">:</span>
            <span className="text-white text-lg sm:text-xl bg-white/20 px-2 sm:px-3 py-1 rounded">
              {formatTime(timeLeft.seconds)}s
            </span>
          </div>
        </div>
      </div>

      {/* Featured Products Grid */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {featuredProducts.map((product) => (
            <div key={product.id} className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition">
              {/* Product Image Container */}
              <div className="relative bg-white aspect-square overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">[Product Image]</span>
                </div>

                {/* Discount Badge */}
                {product.discount > 0 && (
                  <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded text-sm sm:text-base font-bold">
                    -{product.discount}%
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-medium text-gray-800 mb-2 line-clamp-2">
                  {product.name}
                </h3>

                {/* Price */}
                <div className="mb-2">
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    ₦{product.price.toLocaleString()}
                  </p>
                </div>

                {/* Stock Indicator */}
                <div className="mb-2">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">
                    {product.stock} items left
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all"
                      style={{ width: `${(product.stock / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {categories.map((category) => (
            <a
              key={category.id}
              href="#"
              className="group relative overflow-hidden rounded-lg aspect-square cursor-pointer"
            >
              {/* Category Image Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
                <span className="text-gray-500 text-xs text-center px-2">[Category Image]</span>
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition" />

              {/* Category Name */}
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white text-center font-semibold text-sm sm:text-base leading-snug whitespace-pre-line">
                  {category.name}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
