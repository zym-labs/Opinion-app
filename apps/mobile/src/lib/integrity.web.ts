// Web previews have no device integrity APIs.
export async function ensureAttested(_userId: string) {}

export async function integrityHeaders(_userId: string, _body: string): Promise<Record<string, string>> {
  return { 'X-Integrity-Platform': 'web' };
}
