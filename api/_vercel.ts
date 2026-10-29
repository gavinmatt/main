// Request/response types for Vercel Node functions, matching @vercel/node's
// definitions. Defined locally so we don't need @vercel/node (and its pinned,
// vulnerable undici/path-to-regexp/esbuild) installed just for types.
// The leading underscore keeps Vercel from deploying this file as a function.
import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequest = IncomingMessage & {
  query: { [key: string]: string | string[] };
  cookies: { [key: string]: string };
  body: any;
};

export type VercelResponse = ServerResponse & {
  send: (body: any) => VercelResponse;
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};
