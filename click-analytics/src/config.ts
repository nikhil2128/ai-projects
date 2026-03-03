import path from "path";

export const config = {
  port: parseInt(process.env.PORT || "3400", 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, "..", "data", "clicks.db"),
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],
  defaultQueryLimit: 20,
  maxQueryLimit: 500,
};
