export async function GET() {
  return Response.json({
    status: 'ok',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'UNDEFINED',
    hostname: process.env.HOSTNAME ?? 'UNDEFINED',
    timestamp: Date.now()
  });
}