import { mkdir, writeFile } from 'node:fs/promises';

const output = new URL('../dist/ForgiaAvventuriero/browser/', import.meta.url);
const candidate = process.env.URL || process.env.SITE_URL || process.env.DEPLOY_PRIME_URL || '';
const siteUrl = candidate ? new URL(candidate) : null;
const securityFolder = new URL('.well-known/', output);
const securityExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

const robots = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /crea/',
  ...(siteUrl ? [`Sitemap: ${new URL('/sitemap.xml', siteUrl).href}`] : []),
  '',
].join('\n');

const sitemap = siteUrl
  ? `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${escapeXml(new URL('/', siteUrl).href)}</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${escapeXml(new URL('/legal.html', siteUrl).href)}</loc>
    <changefreq>yearly</changefreq>
    <priority>0.2</priority>
  </url>
</urlset>
`
  : `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>
`;

await mkdir(securityFolder, { recursive: true });
await Promise.all([
  writeFile(new URL('robots.txt', output), robots, 'utf8'),
  writeFile(new URL('sitemap.xml', output), sitemap, 'utf8'),
  writeFile(
    new URL('security.txt', securityFolder),
    [
      `Contact: ${process.env.SECURITY_CONTACT || (siteUrl ? new URL('/security.html', siteUrl).href : 'http://localhost/security.html')}`,
      'Preferred-Languages: it, en',
      ...(siteUrl
        ? [
            `Policy: ${new URL('/legal.html', siteUrl).href}`,
            `Canonical: ${new URL('/.well-known/security.txt', siteUrl).href}`,
          ]
        : []),
      `Expires: ${securityExpiry}`,
      '',
    ].join('\n'),
    'utf8',
  ),
]);

console.log(
  siteUrl
    ? `Metadati pubblici generati per ${siteUrl.origin}.`
    : 'Metadati pubblici generati senza URL canonico (impostare URL o SITE_URL).',
);

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
