import { runMigrations } from "@specific-dev/framework";
import { logger } from "../lib/logger.js";

runMigrations({ logger })
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
