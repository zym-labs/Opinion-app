// Android app links. ANDROID_CERT_SHA256 (comma-separated) is the signing certificate fingerprint from EAS / Play.
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  return Response.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: 'app.opinion.mobile', sha256_cert_fingerprints: fingerprints },
    },
  ]);
}
