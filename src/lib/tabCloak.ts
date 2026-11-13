export const TAB_CLOAK_KEY = "polytrack_tab_cloak";
export const DEFAULT_PAGE_TITLE = '"Education" Games';
export const CUSTOM_FAVICON_ID = "custom-tab-favicon";

export interface TabCloakSettings {
  enabled: boolean;
  title: string;
  iconUrl: string;
  customIcon: boolean;
}

export function loadTabCloakSettings(): TabCloakSettings {
  try {
    const settings = JSON.parse(localStorage.getItem(TAB_CLOAK_KEY) || "null");
    return {
      enabled: settings?.enabled === true,
      title: typeof settings?.title === "string" ? settings.title : "",
      iconUrl: typeof settings?.iconUrl === "string" ? settings.iconUrl : "",
      customIcon: settings?.customIcon === true,
    };
  } catch {
    return { enabled: false, title: "", iconUrl: "", customIcon: false };
  }
}

export function applyTabCloak(settings: TabCloakSettings) {
  const title = settings.title.trim();
  document.title = settings.enabled && title ? title : DEFAULT_PAGE_TITLE;

  let customIcon = document.getElementById(CUSTOM_FAVICON_ID) as HTMLLinkElement | null;
  const iconUrl = settings.enabled && settings.customIcon ? settings.iconUrl.trim() : "";
  if (!iconUrl) {
    customIcon?.remove();
    return;
  }

  try {
    const parsed = new URL(iconUrl, window.location.href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      customIcon.remove();
      return;
    }
    if (!customIcon) {
      customIcon = document.createElement("link");
      customIcon.id = CUSTOM_FAVICON_ID;
      customIcon.rel = "icon";
      document.head.appendChild(customIcon);
    }
    customIcon.href = parsed.href;
  } catch {
    customIcon?.remove();
  }
}

export function saveTabCloakSettings(settings: TabCloakSettings) {
  try {
    localStorage.setItem(TAB_CLOAK_KEY, JSON.stringify(settings));
  } catch {
    // The change still applies for the current page if storage is unavailable.
  }
  applyTabCloak(settings);
}
