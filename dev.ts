// Runner local: arranca a app Express com servidor HTTP.
// Em desenvolvimento usa o middleware do Vite; em producao serve o dist estatico.
// (Na Vercel a app e servida pela funcao serverless em api/, este ficheiro nao corre.)
import path from "path";
import express from "express";
import { buildApp } from "./server";

(async () => {
  const app = buildApp();
  const PORT = Number(process.env.PORT || 6001);

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
})();
