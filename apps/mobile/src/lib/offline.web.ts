import type { Query } from '@tanstack/react-query';

// Web previews skip the device cache.
export const persister = undefined;
export const shouldPersist = (_q: Query) => false;
export const useOffline = () => false;
