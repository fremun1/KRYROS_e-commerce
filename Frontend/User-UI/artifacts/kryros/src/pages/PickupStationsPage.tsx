import { useState, useEffect } from "react";
import { Search, MapPin, Clock, Navigation, Package, ChevronRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { API_BASE } from "@/lib/api";
import AccountLayout from "@/components/layout/AccountLayout";

interface Station {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
  phone: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  image: string;
  isActive: boolean;
}

const benefits = [
  { icon: Clock, title: "Save Time", desc: "Skip delivery wait and pick up when it suits you." },
  { icon: Package, title: "Secure & Safe", desc: "Your orders are stored securely until you pick them up." },
  { icon: Navigation, title: "No Delivery Fees", desc: "Pick up for free from any of our stations." },
  { icon: Clock, title: "Flexible Hours", desc: "Extended hours to fit your busy schedule." },
];

function normalizeStation(s: any, i: number): Station {
  const addressParts = [s.address, s.city, s.state, s.country].filter(Boolean);
  return {
    id: s.id,
    name: s.name,
    address: addressParts.join(", ") || "",
    city: s.city || "",
    hours: s.openingHours || "",
    phone: s.phone || "",
    description: s.description || "",
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    image: s.image || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&q=80",
    isActive: s.isActive !== false,
  };
}

export default function PickupStationsPage() {
  const [searchQ, setSearchQ] = useState("");
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/pickup-stations?active=true`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        if (!cancelled) {
          setStations(list.filter((s: any) => s.isActive !== false).map(normalizeStation));
        }
      } catch {
        // leave stations empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = stations.filter((s) =>
    !searchQ ||
    s.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    s.address.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <AccountLayout>
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground">Pickup Stations</h1>
          <p className="text-muted-foreground text-xs mt-1 leading-5">
            Choose a pickup station near you and collect<br />your orders quickly and easily.
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/30 rounded-2xl px-3 py-2.5 flex items-start gap-2 cursor-pointer min-w-[155px] hover:border-primary/50 transition-colors">
          <div className="flex-1">
            <p className="text-[10px] font-bold text-primary mb-0.5">Fast & Convenient</p>
            <p className="text-[9px] text-muted-foreground leading-snug">Pick up your orders at your<br />convenience, anytime.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by city, area or station name..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <button className="w-12 h-12 bg-card border border-border rounded-xl flex items-center justify-center hover:border-primary/50 transition-colors flex-shrink-0">
          <Navigation className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Map - Lusaka, Zambia (Leaflet via srcdoc, no X-Frame-Options block) */}
      <div className="rounded-2xl overflow-hidden mb-5 border border-border" style={{ height: 220 }}>
        <iframe
          title="KRYROS Pickup Stations Map"
          srcDoc={`<!DOCTYPE html>
<html>
<head>
<meta charset=\"utf-8\" />
<style>
  body{margin:0;padding:0;overflow:hidden;}
  #map{width:100%;height:220px;}
</style>
<link rel=\"stylesheet\" href=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.css\" />
<script src=\"https://unpkg.com/leaflet@1.9.4/dist/leaflet.js\"></script>
</head>
<body>
<div id=\"map\"></div>
<script>
  var map = L.map('map', { zoomControl: true, scrollWheelZoom: false, attributionControl: false }).setView([-15.4167, 28.2833], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ''
  }).addTo(map);
  var icon = L.divIcon({
    html: '<div style=\"background:#0ea5e9;width:14px;height:14px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);\"></div>',
    iconSize: [14, 14], iconAnchor: [7, 7]
  });
  L.marker([-15.4167, 28.2833], { icon: icon }).addTo(map).bindPopup('<b>KRYROS Pickup Station</b><br>Lusaka, Zambia').openPopup();
</script>
</body>
</html>`}
          style={{ width: "100%", height: "100%", border: "none" }}
          loading="lazy"
        />
      </div>

      {/* Nearby stations */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground">Nearby Pickup Stations</h2>
        <span className="text-xs text-muted-foreground cursor-pointer flex items-center gap-0.5">Sort by: Nearest <span className="text-[10px]">▼</span></span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <MapPin className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-bold text-foreground">No pickup stations found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {searchQ ? "No stations match your search" : "No pickup stations are available yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {filtered.map((station, i) => (
            <motion.div
              key={station.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-all"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                <img src={station.image} alt={station.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-xs truncate mb-0.5">{station.name}</p>
                <div className="flex items-start gap-1 mb-0.5">
                  <MapPin className="w-2.5 h-2.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] text-muted-foreground leading-snug">{station.address}</p>
                </div>
                {station.hours && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <Clock className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                    <p className="text-[9px] text-green-600">{station.hours}</p>
                  </div>
                )}
                {station.phone && (
                  <p className="text-[9px] text-muted-foreground">📞 {station.phone}</p>
                )}
                {station.description && (
                  <p className="text-[9px] text-muted-foreground italic truncate">{station.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="px-2.5 py-1 bg-green-500/10 text-green-600 border border-green-500/20 rounded-lg text-[9px] font-bold">
                  Active
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* How pickup works */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3 mb-5 cursor-pointer hover:border-primary/40 transition-colors">
        <Package className="w-8 h-8 text-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="font-bold text-foreground text-sm">How Pickup Works</p>
          <p className="text-xs text-muted-foreground">Choose a station, place your order, and we'll notify you when it's ready for pickup.</p>
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 border border-primary/40 text-primary rounded-xl text-xs font-bold flex-shrink-0">
          Learn More <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Why Choose Pickup */}
      <h2 className="text-sm font-bold text-foreground mb-3">Why Choose Pickup?</h2>
      <div className="grid grid-cols-4 gap-2">
        {benefits.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center text-center p-2 bg-card border border-border rounded-xl">
            <Icon className="w-4 h-4 text-primary mb-1.5" />
            <p className="text-[9px] font-bold text-foreground leading-tight mb-0.5">{title}</p>
            <p className="text-[8px] text-muted-foreground leading-tight">{desc}</p>
          </div>
        ))}
      </div>
    </div>
    </AccountLayout>
  );
}
