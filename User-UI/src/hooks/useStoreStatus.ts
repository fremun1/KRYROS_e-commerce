import { useState, useEffect } from "react";
import { fetchStoreStatus } from "@/lib/api";

let globalStoreStatus: any = null;
let globalPromise: Promise<any> | null = null;
const listeners = new Set<(status: any) => void>();

export function useStoreStatus() {
  const [status, setStatus] = useState(globalStoreStatus);

  useEffect(() => {
    if (globalStoreStatus) {
      setStatus(globalStoreStatus);
      return;
    }

    const listener = (newStatus: any) => setStatus(newStatus);
    listeners.add(listener);

    if (!globalPromise) {
      globalPromise = fetchStoreStatus().then((res) => {
        globalStoreStatus = res;
        listeners.forEach((l) => l(res));
        listeners.clear();
        return res;
      });
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return status;
}
