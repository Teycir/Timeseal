/**
 * Centralized Configuration Management
 * Eliminates hardcoded URLs and provides environment-aware configuration
 */

export interface AppConfig {
  appUrl: string;
  allowedOrigins: string[];
  isDevelopment: boolean;
  isProduction: boolean;
}

let cachedConfig: AppConfig | null = null;

/**
 * Gets application configuration from environment variables
 * Falls back to sensible defaults for development
 */
export function getAppConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isProduction = process.env.NODE_ENV === 'production';

  // Get app URL from environment or use default
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 (isDevelopment ? 'http://localhost:3000' : '');

  if (!appUrl && isProduction) {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production');
  }

  // Build allowed origins list
  const allowedOrigins = [
    appUrl,
    ...(isDevelopment ? [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ] : []),
  ].filter(Boolean);

  cachedConfig = {
    appUrl,
    allowedOrigins,
    isDevelopment,
    isProduction,
  };

  return cachedConfig;
}

/**
 * Resets cached configuration (useful for testing)
 */
export function resetAppConfig(): void {
  cachedConfig = null;
}

/**
 * Validates if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Allow requests without origin (same-origin)
  
  const config = getAppConfig();
  const normalizedOrigin = origin.replace(/\/$/, '');
  
  return config.allowedOrigins.some(allowed => {
    const normalizedAllowed = allowed.replace(/\/$/, '');
    return normalizedOrigin === normalizedAllowed;
  });
}

/**
 * Validates if a referer is allowed
 */
export function isRefererAllowed(referer: string | null): boolean {
  if (!referer) return true; // Allow requests without referer
  
  const config = getAppConfig();
  const normalizedReferer = referer.split('?')[0]?.replace(/\/$/, '');
  
  return config.allowedOrigins.some(allowed => {
    const normalizedAllowed = allowed.replace(/\/$/, '');
    return normalizedReferer === normalizedAllowed ||
           normalizedReferer?.startsWith(normalizedAllowed + '/');
  });
}
