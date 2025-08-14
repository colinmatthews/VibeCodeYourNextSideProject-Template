import { PostHog } from 'posthog-node';

let singleton: PostHog | null = null;

function getClient(): PostHog | null {
  if (singleton) return singleton;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  singleton = new PostHog(key, {
    host: process.env.POSTHOG_HOST,
    enableExceptionAutocapture: true,
  });
  return singleton;
}

export const posthog = getClient();

export function logEvent(event: string, properties: Record<string, any> = {}) {
  try {
    if (!posthog) return;
    posthog.capture({
      distinctId: properties.userId || 'anonymous',
      event,
      properties,
    });
  } catch {}
}

export function logSecurity(event: string, properties: Record<string, any> = {}) {
  logEvent(`security.${event}`, properties);
}

