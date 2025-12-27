export function buildUniqueEmail(prefix: string, domain = 'example.com'): string {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return `${prefix}+${stamp}@${domain}`;
}
