import { renderLegal } from '@/lib/legal';

export const metadata = { title: 'Community guidelines · Opinion' };

export default async function Guidelines() {
  return <div dangerouslySetInnerHTML={{ __html: await renderLegal('COMMUNITY_GUIDELINES.md') }} />;
}
