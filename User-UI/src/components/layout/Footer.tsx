export default function Footer() {
  return (
    // Hidden on mobile — MobileBottomNav serves as the mobile footer
    <footer className="hidden md:block border-t border-border bg-background py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-2">
        <img
          src="/kryros-logo.png"
          alt="KRYROS"
          className="w-10 h-10 object-contain"
          loading="lazy"
          decoding="async"
        />
        <p className="text-xs text-muted-foreground">
          © 2026 KRYROS. All Rights Reserved.
        </p>
        <p className="text-[10px] text-muted-foreground/60">
          Worldwide Shopping
        </p>
      </div>
    </footer>
  );
}
