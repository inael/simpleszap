import { getLogtoContext } from '@logto/next/server-actions';
import { createLogtoConfig } from '@/lib/logto';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const config = createLogtoConfig(request.nextUrl.origin);
  const context = await getLogtoContext(config, { fetchUserInfo: true });

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
