import express from "express";
import cors from "cors";
import modelsRouter from "./routes/models.js";
import entriesRouter from "./routes/entries.js";
import settingsRouter from "./routes/settings.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/models", modelsRouter);
app.use("/api/entries", entriesRouter);
app.use("/api/settings", settingsRouter);

export default app;
