// Resumes onboarding at the first unfinished step (STAGE2 §3).
import { Redirect } from 'expo-router';

import { useMe } from '@/lib/queries';

export default function OnboardingIndex() {
  const { data: me } = useMe();
  switch (me?.onboarding_step) {
    case 'age_verified':
      return <Redirect href="/terms" />;
    case 'terms_accepted':
      return <Redirect href="/categories" />;
    case 'categories_chosen':
    case 'communities_done':
      return <Redirect href="/communities" />;
    default:
      return <Redirect href="/age" />;
  }
}
