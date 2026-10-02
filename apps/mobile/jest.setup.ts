// Native modules without a JS fallback in tests.
jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: jest.fn(),
    functions: { invoke: jest.fn() },
    auth: { getUser: jest.fn(async () => ({ data: { user: null } })) },
    storage: { from: () => ({ createSignedUrl: async () => ({ data: null }) }) },
  },
}));
jest.mock('@/lib/integrity', () => ({
  ensureAttested: jest.fn(),
  integrityHeaders: jest.fn(async () => ({ 'X-Integrity-Platform': 'test' })),
}));
jest.mock('@/lib/analytics', () => ({ track: jest.fn(), identify: jest.fn(), timeBucket: () => '1-6h' }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, Link: Object.assign(({ children }: { children: unknown }) => children, { AppleZoom: ({ children }: { children: unknown }) => children }) }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
