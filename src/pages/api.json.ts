export const prerender = false;

import type { APIRoute } from "astro";
import aj from "arcjet:client";

export const GET: APIRoute = async ({ request }) => {
  const decision = await aj.protect(request, { requested: 5 });

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return Response.json(
        { error: "Too Many Requests" },
        { status: 429 },
      );
    }

    if (decision.reason.isBot()) {
      return Response.json(
        { error: "No bots allowed" },
        { status: 403 },
      );
    }

    return Response.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  return Response.json({ message: "Hello world" });
};
