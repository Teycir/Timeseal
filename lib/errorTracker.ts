// Error Tracking with Winston (MIT License)
import { createLogger, format, transports } from 'winston';

const { combine, timestamp, json, errors } = format;

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'timeseal' },
  transports: [
    // Console output
    new transports.Console({
      format: format.simple(),
    }),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new transports.File({ 
    filename: 'logs/error.log', 
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }));
  
  logger.add(new transports.File({ 
    filename: 'logs/combined.log',
    maxsize: 5242880,
    maxFiles: 5,
  }));
}

export interface ErrorContext {
  sealId?: string;
  ip?: string;
  userId?: string;
  action?: string;
  [key: string]: any;
}

export class ErrorTracker {
  static trackError(error: Error, context?: ErrorContext) {
    logger.error('Application error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }

  static trackWarning(message: string, context?: ErrorContext) {
    logger.warn(message, context);
  }

  static trackInfo(message: string, context?: ErrorContext) {
    logger.info(message, context);
  }

  static trackMetric(metric: string, value: number, context?: ErrorContext) {
    logger.info('Metric', {
      metric,
      value,
      ...context,
    });
  }
}

export default logger;
