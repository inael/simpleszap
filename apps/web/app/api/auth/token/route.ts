import { getAccessToken } from '@logto/next/server-actions';
import { createLogtoConfig } from '@/lib/logto';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const resource = process.env.LOGTO_API_RESOURCE || 'https://back.simpleszap.com/api';
    const config = createLogtoConfig(request.nextUrl.origin);
    const token = await getAccessToken(config, resource);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ token: null }, { status: 401 });
  }
}
