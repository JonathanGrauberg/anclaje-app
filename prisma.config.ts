import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // El CLI (migraciones, seed) usa la conexión DIRECTA si existe: con Neon, las migraciones no
  // pueden ir por el pooler. La integración de Neon en Vercel la crea como DATABASE_URL_UNPOOLED.
  // La app en runtime usa DATABASE_URL (pooled) desde src/lib/db.ts.
  datasource: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || env("DATABASE_URL"),
  },
});
