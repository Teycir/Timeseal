// Error Tracking - Environment-aware logging
// Uses Winston (MIT) in development, console in production (Cloudflare Workers)

export interface ErrorContext {
  sealId?: string;
  ip?: string;
  userId?: string;
  action?: string;
  component?: string;
  eventType?: string;
  [key: string]: any;
}

// Check if we're in Cloudflare Workers environment
const isCloudflareWorkers =
  typeof globalThis.caches !== "undefined" && typeof process === "undefined";

// Lazy-load Winston only in Node.js environment
let winstonLogger: any = null;

async function getLogger() {
  if (isCloudflareWorkers) {
    return null; // Use console in Workers
  }

  if (!winstonLogger) {
    try {
      const { createLogger, format, transports } = await import("winston");
      const { combine, timestamp, json, errors } = format;

      winstonLogger = createLogger({
        level: process.env.LOG_LEVEL || "info",
        format: combine(errors({ stack: true }), timestamp(), json()),
        defaultMeta: { service: "timeseal" },
        transports: [
          new transports.Console({
            format: format.simple(),
          }),
        ],
      });

      // Add file transport in production Node.js
      if (process.env.NODE_ENV === "production") {
        winstonLogger.add(
          new transports.File({
            filename: "logs/error.log",
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        );

        winstonLogger.add(
          new transports.File({
            filename: "logs/combined.log",
            maxsize: 5242880,
            maxFiles: 5,
          }),
        );
      }
    } catch (error) {
      console.warn(
        "[ErrorTracker] Winston not available, falling back to console",
      );
      return null;
    }
  }

  return winstonLogger;
}

export class ErrorTracker {
  static trackError(error: Error, context?: ErrorContext) {
    getLogger()
      .then(logger => {
        const errorData = {
          message: error.message,
          stack: error.stack,
          name: error.name,
          ...context,
          timestamp: new Date().toISOString(),
        };

        if (logger) {
          logger.error("Application error", errorData);
        } else {
          console.error("[ErrorTracker]", errorData);
        }
      })
      .catch(logError => {
        console.error("[ErrorTracker] Failed to log error:", logError);
        console.error("[ErrorTracker] Original error:", error);
      });
  }

  static trackWarning(message: string, context?: ErrorContext) {
    getLogger()
      .then(logger => {
        if (logger) {
          logger.warn(message, context);
        } else {
          console.warn("[ErrorTracker]", message, context);
        }
      })
      .catch(logError => {
        console.error("[ErrorTracker] Failed to log warning:", logError);
        console.warn("[ErrorTracker] Original warning:", message, context);
      });
  }

  static trackInfo(message: string, context?: ErrorContext) {
    getLogger()
      .then(logger => {
        if (logger) {
          logger.info(message, context);
        } else {
          console.log("[ErrorTracker]", message, context);
        }
      })
      .catch(logError => {
        console.error("[ErrorTracker] Failed to log info:", logError);
        console.log("[ErrorTracker] Original info:", message, context);
      });
  }

  static trackMetric(
    metric: string,
    value: number,
    context?: ErrorContext,
  ) {
    getLogger()
      .then(logger => {
        const metricData = {
          metric,
          value,
          ...context,
          timestamp: new Date().toISOString(),
        };

        if (logger) {
          logger.info("Metric", metricData);
        } else {
          console.log("[ErrorTracker] Metric:", metricData);
        }
      })
      .catch(logError => {
        console.error("[ErrorTracker] Failed to log metric:", logError);
        console.log("[ErrorTracker] Original metric:", metric, value, context);
      });
  }
}
