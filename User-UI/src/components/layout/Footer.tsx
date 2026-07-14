export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-4 px-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-1">
        <img
          src="/kryros-logo.png"
          alt="KRYROS"
          className="w-7 h-7 object-contain"
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
