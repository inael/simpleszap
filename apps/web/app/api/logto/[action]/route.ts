import LogtoClient from '@logto/next/server-actions';
import { createLogtoConfig } from '@/lib/logto';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const config = createLogtoConfig(request.nextUrl.origin);
  const client = new LogtoClient(config);
  const baseUrl = config.baseUrl;

  if (action === 'sign-in') {
    const { url, newCookie } = await client.handleSignIn({
      redirectUri: `${baseUrl}/api/logto/sign-in-callback`,
    });
    const response = new Response(null, {
      status: 307,
      headers: { Location: url },
    });
    if (newCookie) {
      response.headers.append('Set-Cookie', newCookie);
    }
    return response;
  }

  if (action === 'sign-in-callback') {
    await client.handleSignInCallback(request.nextUrl.href);
    redirect('/dashboard');
  }

  if (action === 'sign-up') {
    const { url, newCookie } = await client.handleSignIn({
      redirectUri: `${baseUrl}/api/logto/sign-in-callback`,
      interactionMode: 'signUp',
    });
    const response = new Response(null, {
      status: 307,
      headers: { Location: url },
    });
    if (newCookie) {
      response.headers.append('Set-Cookie', newCookie);
    }
    return response;
  }

  if (action === 'sign-out') {
    const url = await client.handleSignOut(baseUrl);
    return new Response(null, {
      status: 307,
      headers: { Location: url },
    });
  }

  return new Response('Not found', { status: 404 });
}
