import { join } from "path";

const port = 3000;
const publicDir = join(import.meta.dir, "public");

console.log(`Image detection app listening at http://localhost:${port}`);

export default {
  port,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html for root
    if (path === "/" || path === "") {
      path = "/index.html";
    }

    const filePath = join(publicDir, path);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
};
