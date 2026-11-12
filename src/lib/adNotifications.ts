// The notification ads (Monetag) are loaded by an inline snippet in index.html so they start
// before React does. This module is the single place the app reads and changes that preference.

export const NOTIFICATION_ADS_KEY = "polytrack_notification_ads";
export const NOTIFICATION_AD_SCRIPT_ID = "notification-ads";

const AD_ZONE = "12241725";
const AD_SRC = "https://nap5k.com/tag.min.js";

/** Ads are on by default; only an explicit "off" turns them off. */
export function areNotificationAdsBlocked(): boolean {
  try {
    return localStorage.getItem(NOTIFICATION_ADS_KEY) === "off";
  } catch {
    return false;
  }
}

/** Stores the preference and loads or removes the ad script for the current page. */
export function setNotificationAdsBlocked(blocked: boolean) {
  try {
    localStorage.setItem(NOTIFICATION_ADS_KEY, blocked ? "off" : "on");
  } catch {
    // Storage can be unavailable in private mode; the choice still applies until reload.
  }

  const existing = document.getElementById(NOTIFICATION_AD_SCRIPT_ID) as HTMLScriptElement | null;

  if (blocked) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const script = document.createElement("script");
  script.id = NOTIFICATION_AD_SCRIPT_ID;
  script.dataset.zone = AD_ZONE;
  script.src = AD_SRC;
  (document.body || document.documentElement).appendChild(script);
}
