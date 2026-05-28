import { createApp } from "./app";
import { createDatabase } from "./db";

const port = Number(process.env.PORT ?? 4100);
const database = createDatabase();
const app = createApp(database);

const server = app.listen(port, () => {
  console.log(`Work journal API listening on http://localhost:${port}`);
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
