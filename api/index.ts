import { app } from "./app";

// Express apps are just (req, res) => void handlers, which is exactly what
// Vercel's Node.js runtime expects — no adapter needed.
export default app;
