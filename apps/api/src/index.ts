import Fastify from "fastify";
import type { Format } from "@ebook-reader/shared";

// Type-level import from @ebook-reader/shared proves the workspace resolves.
const DEFAULT_FORMAT: Format = "pdf";

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok", defaultFormat: DEFAULT_FORMAT };
});

async function start(): Promise<void> {
  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
