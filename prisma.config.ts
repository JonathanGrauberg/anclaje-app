import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // El CLI (migraciones, seed) usa la conexión DIRECTA si existe: con Neon, las migraciones no
  // pueden ir por el pooler. La app en runtime usa DATABASE_URL (pooled) desde src/lib/db.ts.
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || env("DATABASE_URL"),
  },
});
