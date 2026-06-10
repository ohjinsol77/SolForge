export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "solforge"
      });
    }

    return new Response("SolForge worker is running.", {
      headers: {
        "content-type": "text/plain; charset=utf-8"
      }
    });
  }
};
