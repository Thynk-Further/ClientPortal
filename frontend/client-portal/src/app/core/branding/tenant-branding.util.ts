export function applyTenantCssVariables(
  cssVariables: Readonly<Record<string, string>>,
): void {
  const root = document.documentElement;

  for (const [name, value] of Object.entries(cssVariables)) {
    root.style.setProperty(name, value);
  }
}

export function shouldRedirectToCustomDomain(
  customDomain: string,
  customDomainEnabled: boolean,
  currentHost: string,
): boolean {
  if (!customDomainEnabled) {
    return false;
  }

  const normalizedDomain = customDomain.trim().toLowerCase();
  const normalizedHost = currentHost.trim().toLowerCase();

  if (normalizedDomain === '' || normalizedHost === normalizedDomain) {
    return false;
  }

  return normalizedHost !== normalizedDomain;
}

export function buildCustomDomainUrl(customDomain: string): string {
  const protocol = window.location.protocol;
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `${protocol}//${customDomain.trim().toLowerCase()}${path}`;
}
