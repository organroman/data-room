import "dotenv/config";
import { app } from "../server/app";

// Runs the Express app as a plain long-lived server for fast local iteration
// (paired with the Vite proxy in vite.config.ts). Production always goes
// through api/index.ts instead, which imports the same app.
const port = process.env.API_PORT ?? 3001;
app.listen(port, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
