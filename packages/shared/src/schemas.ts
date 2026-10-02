import { z } from 'zod';

import { LIMITS } from './constants.ts';

export const emailSchema = z.email().max(254);

export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');

export const birthYearSchema = z
  .number()
  .int()
  .min(1900)
  .refine((y) => new Date().getFullYear() - y >= LIMITS.minAge, 'Opinion is for people 18 and over');

export const reasonSchema = (required: boolean) =>
  required
    ? z.string().trim().min(LIMITS.reasonMin).max(LIMITS.reasonMax)
    : z.string().trim().max(LIMITS.reasonMax).optional();
