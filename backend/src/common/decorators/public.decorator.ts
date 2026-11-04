import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible — the global JwtAuthGuard will skip it.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
