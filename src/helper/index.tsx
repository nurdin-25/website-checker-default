/* eslint-disable @typescript-eslint/no-explicit-any */
// ---- Helpers ----
import type { WebsiteListWithStatusInterface } from "../data/website";

function classifyClient(res?: { status: number; data?: WebsiteListWithStatusInterface }, err?: any):
  { bool: boolean; mode: "online" | "protected" | "offline" } {

  // Cek response/data lebih detail
  const extract = (x: any) => {
    if (!x) return undefined;
    if (typeof x === "object" && x.status) {
      if (typeof x.status === "boolean") return x.status ? "ONLINE" : "OFFLINE";
      if (typeof x.status === "string") return x.status.toUpperCase();
    }
    if (typeof x === "string") return x.toUpperCase();
    return undefined;
  };

  const val =
    extract(res?.data) ??
    extract(res) ??
    extract(err?.response?.data) ??
    extract(err?.response);

  if (val === "ONLINE") return { bool: true, mode: "online" };
  if (val === "ONLINE_PROTECTED" || val === "PROTECTED") return { bool: true, mode: "protected" };
  if (val === "OFFLINE") return { bool: false, mode: "offline" };

  // fallback berdasarkan HTTP code dari /check
  const code = res?.status ?? err?.response?.status ?? 0;
  if (code === 403 || code === 503) return { bool: true, mode: "protected" };
  if (code >= 100 && code <= 599) return { bool: true, mode: "online" };
  return { bool: false, mode: "offline" };
}

function isServerOnlineFromAxiosResponse(r?: { status?: number }) {
  return typeof r?.status === "number" && r.status >= 200 && r.status < 500;
}

export {
    classifyClient,
    isServerOnlineFromAxiosResponse,
}