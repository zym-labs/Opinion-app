import { renderLegal } from '@/lib/legal';

export const metadata = { title: 'Terms of service · Opinion' };

export default async function Terms() {
  return <div dangerouslySetInnerHTML={{ __html: await renderLegal('TERMS.md') }} />;
}
