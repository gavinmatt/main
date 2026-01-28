export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return Response.json({
    ok: true,
    env: {
      arcjetKeyPresent: !!process.env.ARCJET_KEY,
      nodeEnv: process.env.NODE_ENV,
    },
  });
};
