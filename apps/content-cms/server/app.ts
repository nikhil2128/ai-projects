import express from "express";
import cors from "cors";
import { requireAuth } from "./auth.js";
import authRouter from "./routes/auth.js";
import modelsRouter from "./routes/models.js";
import entriesRouter from "./routes/entries.js";
import settingsRouter from "./routes/settings.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/auth", authRouter);
app.use("/api/models", requireAuth, modelsRouter);
app.use("/api/entries", requireAuth, entriesRouter);
app.use("/api/settings", requireAuth, settingsRouter);

export default app;
