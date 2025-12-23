import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';

export const app = await createApplication();
app.withDatabase(schema);

// Add your routes here
// Example:
// app.fastify.get('/example', async () => {
//   return app.db.select().from(schema.users);
// });

await app.run();
