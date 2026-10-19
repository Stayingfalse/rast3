/**
 * Personal email providers. These can't belong to an organisation: someone
 * signing up with one is pointed to a community or friends group instead
 * (owner, 18 Oct). Keep in step with the list in the
 * 20261019040000_onboarding_cleanup migration.
 */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "outlook.com", "outlook.co.uk", "hotmail.com", "hotmail.co.uk", "live.com",
  "live.co.uk", "msn.com", "windowslive.com",
  "yahoo.com", "yahoo.co.uk", "ymail.com", "rocketmail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "aol.co.uk",
  "protonmail.com", "proton.me", "pm.me",
  "gmx.com", "gmx.co.uk", "gmx.net", "mail.com", "zoho.com", "fastmail.com",
  "hey.com", "tutanota.com", "tuta.io", "yandex.com", "qq.com", "163.com",
  "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net",
  "ntlworld.com", "blueyonder.co.uk", "tiscali.co.uk", "orange.net",
]);

export const emailDomain = (email: string) =>
  email.trim().toLowerCase().split("@")[1] ?? "";

export const isPublicEmailDomain = (domain: string) =>
  PUBLIC_EMAIL_DOMAINS.has(domain.trim().toLowerCase());
