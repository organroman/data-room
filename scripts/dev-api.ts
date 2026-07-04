import "dotenv/config";
import { app } from "../api/app";

// Runs the Express app as a plain long-lived server for fast local iteration
// (paired with the Vite proxy in vite.config.ts). Lives outside /api so Vercel
// doesn't pick it up as its own serverless function — production always goes
// through api/index.ts instead.
const port = process.env.API_PORT ?? 3001;
app.listen(port, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
