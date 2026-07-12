interface TestimonialsSectionProps {
  title?: string;
  subtitle?: string;
  items?: Array<{
    rating?: number;
    customer_name?: string;
    review?: string;
    customer_image?: string;
  }>;
}

export default function TestimonialsSection({
  title,
  subtitle,
  items,
}: TestimonialsSectionProps) {
  const testimonials = items || [
    { rating: 5, customer_name: 'Happy Customer', review: 'Great products and fast delivery!' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {title && <h3 className="text-xl font-black text-center mb-4">{title}</h3>}
      {subtitle && <p className="text-center text-muted-foreground mb-6">{subtitle}</p>}
      <div className="space-y-4">
        {testimonials.map((t, i) => (
          <div key={i} className="bg-card border rounded-2xl p-6">
            {t.rating && <p className="text-xs text-muted-foreground mb-2">Rating: {t.rating}/5</p>}
            <p className="text-sm font-bold mb-1">{t.customer_name || 'Customer'}</p>
            <p className="text-xs text-muted-foreground italic">"{t.review || ''}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}
