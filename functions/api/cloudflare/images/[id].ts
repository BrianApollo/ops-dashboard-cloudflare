/**
 * Cloudflare Images Proxy — /api/cloudflare/images/:id
 *
 * Deletes an image from Cloudflare Images using the server-side API token.
 * The token NEVER reaches the browser.
 */

import { authenticateRequest } from '../../../lib/auth';

interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_IMAGES_API_TOKEN: string;
  JWT_SECRET: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const imageId = params.id as string;
  if (!imageId) {
    return jsonResponse({ error: 'Missing image id' }, 400);
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_IMAGES_API_TOKEN) {
    return jsonResponse(
      { error: 'Server is missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_IMAGES_API_TOKEN' },
      500
    );
  }

  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${encodeURIComponent(imageId)}`;

  const cfResponse = await fetch(cfUrl, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`,
    },
  });

  // 404 is acceptable — image already gone, treat as success.
  if (cfResponse.status === 404) {
    return jsonResponse({ success: true, alreadyDeleted: true });
  }

  const responseText = await cfResponse.text();
  return new Response(responseText, {
    status: cfResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
