// iOS universal links: /p/* and /i/* open the app. APPLE_TEAM_ID is set at deploy time.
export function GET() {
  const appID = `${process.env.APPLE_TEAM_ID ?? 'TEAMID'}.app.opinion.mobile`;
  return Response.json({
    applinks: { details: [{ appIDs: [appID], components: [{ '/': '/p/*' }, { '/': '/i/*' }, { '/': '/f/*' }, { '/': '/room/*' }] }] },
  });
}
