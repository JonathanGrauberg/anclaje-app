// Cron para desarrollo: llama a las tareas programadas cada 5 minutos.
//   npm run cron   (con `npm run dev` corriendo)
import "dotenv/config";

const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("Falta CRON_SECRET en .env");
  process.exit(1);
}

async function tick() {
  for (const job of ["recordatorios", "resumen"]) {
    try {
      const res = await fetch(`${base}/api/cron/${job}`, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });
      console.log(new Date().toLocaleTimeString("es-AR"), job, res.status, await res.text());
    } catch (e) {
      console.error(job, e.message);
    }
  }
}

await tick();
setInterval(tick, 5 * 60_000);
