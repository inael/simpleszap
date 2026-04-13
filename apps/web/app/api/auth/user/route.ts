import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { NextResponse } from 'next/server';

export async function GET() {
  const context = await getLogtoContext(logtoConfig, { fetchUserInfo: true });

  if (!context.isAuthenticated) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const roles: string[] = (context.userInfo as any)?.roles?.map((r: any) => r.name || r) ?? [];

  return NextResponse.json({
    authenticated: true,
    user: {
      sub: context.claims?.sub ?? null,
      name: context.userInfo?.name ?? context.claims?.name ?? null,
      email: context.userInfo?.email ?? context.claims?.email ?? null,
      picture: context.userInfo?.picture ?? context.claims?.picture ?? null,
      roles,
    },
  });
}
