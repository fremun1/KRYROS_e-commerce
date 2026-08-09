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
        // Region restriction is enabled - check user's actual region via backend BFF directly.
        // The backend /check-region endpoint will automatically determine if region restriction is enabled.
        const checkRes = await api.get("/api/bff/check-region");
        const checkData = checkRes.data;
        
        if (!cancelled) {
          setLoaded(true);
          
          if (checkData.blocked) {
            setBlocked(true);
            setUserCountry(checkData.countryCode || null);
            const blockedCountries = checkData.blockedCountries || [];
            setMessage(
              `Access from ${checkData.countryName || 'Unknown'} (${checkData.countryCode || '??'}) is not permitted. ` +
              `Blocked regions: ${blockedCountries.join(', ')}. ` +
              `If you believe this is an error, contact your administrator.`
            );
          } else {
            setBlocked(false);
            setUserCountry(checkData.countryCode || null);
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