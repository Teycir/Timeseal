// Browser Extension Detection
// Warns users about extensions that could access Key A from memory

declare const chrome: any;

export interface SecurityWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
}

export function detectSuspiciousExtensions(): SecurityWarning[] {
  const warnings: SecurityWarning[] = [];
  
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    warnings.push({
      severity: 'medium',
      message: 'Browser extensions detected',
      recommendation: 'Disable extensions or use incognito mode for sensitive seals',
    });
  }
  
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch.toString();
    if (!originalFetch.includes('[native code]')) {
      warnings.push({
        severity: 'high',
        message: 'Fetch API has been modified',
        recommendation: 'Close browser and restart without extensions',
      });
    }
  }
  
  const originalSubtle = crypto.subtle.encrypt.toString();
  if (!originalSubtle.includes('[native code]')) {
    warnings.push({
      severity: 'high',
      message: 'Web Crypto API has been modified',
      recommendation: 'Do not proceed - crypto operations may be compromised',
    });
  }
  
  return warnings;
}
