import { renderLegal } from '@/lib/legal';

export const metadata = { title: 'Privacy policy · Opinion' };

export default async function Privacy() {
  return <div dangerouslySetInnerHTML={{ __html: await renderLegal('PRIVACY_POLICY.md') }} />;
}
