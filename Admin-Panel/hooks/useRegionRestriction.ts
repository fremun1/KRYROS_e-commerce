"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export function useRegionRestriction() {
  const [blocked, setBlocked] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("Access from your region is not permitted");
  const [userCountry, setUserCountry] = useState<string | null>(null);

  // Fetch setting from backend AND check user's region
  useEffect(() => {
    let cancelled = false;
    const checkRegion = async () => {
      try {
        // First check if region restriction is enabled
        const settingsRes = await api.get("/api/settings");
        const settings = Array.isArray(settingsRes.data?.data) ? settingsRes.data.data : [];
        
        const enabledSetting = settings.find((s: any) => s.key === "admin_region_restriction_enabled");
        const blockedCountriesSetting = settings.find((s: any) => s.key === "admin_blocked_countries");
        
        const enabled = enabledSetting?.value === "true";
        
        if (!enabled) {
          if (!cancelled) {
            setLoaded(true);
            setBlocked(false);
          }
          return;
        }

        // Region restriction is enabled - now check user's actual region via backend
        const checkRes = await api.get("/api/bff/check-region");
        const checkData = checkRes.data;
        
        if (!cancelled) {
          setLoaded(true);
          
          if (checkData.blocked) {
            setBlocked(true);
            setUserCountry(checkData.countryCode);
            const blockedCountries = checkData.blockedCountries || [];
            setMessage(
              `Access from ${checkData.countryName} (${checkData.countryCode}) is not permitted. ` +
              `Blocked regions: ${blockedCountries.join(', ')}. ` +
              `If you believe this is an error, contact your administrator.`
            );
          } else {
            setBlocked(false);
            setUserCountry(checkData.countryCode);
          }
        }
      } catch (error) {
        console.warn('[RegionRestriction] Check failed:', error);
        // On error, don't block - fail open for safety
        if (!cancelled) {
          setLoaded(true);
          setBlocked(false);
        }
      }
    };
    
    checkRegion();
    return () => { cancelled = true; };
  }, []);

  return { blocked, loaded, message, userCountry };
}