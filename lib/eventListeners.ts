// Seal Event Listeners - Centralized event handling
import { sealEvents } from './patterns/observer';
import { trackSealCreated, trackSealUnlocked, trackPulseReceived } from './metricsLib';
import { logger } from './logging';

// Setup all event listeners
export function setupSealEventListeners() {
  // Track metrics on seal creation
  sealEvents.on('seal:created', (data) => {
    trackSealCreated();
    logger.audit('seal_created', { sealId: data.sealId, isDMS: data.isDMS });
  });

  // Track metrics on seal unlock
  sealEvents.on('seal:unlocked', (data) => {
    trackSealUnlocked();
    logger.audit('seal_unlocked', { sealId: data.sealId });
  });

  // Track pulse events
  sealEvents.on('pulse:received', (data) => {
    trackPulseReceived();
  });

  // Log seal deletion
  sealEvents.on('seal:deleted', (data) => {
    logger.info('seal_deleted', { sealId: data.sealId });
  });
}
