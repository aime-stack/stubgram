import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

// Logger configuration for use with Fastify and standalone
export const loggerConfig = {
  level: process.env.LOG_LEVEL || "info",
  ...(isDevelopment
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
            singleLine: false,
          },
        },
      }
    : {}),
};

// Create the logger with appropriate configuration
export const logger = pino(loggerConfig);
