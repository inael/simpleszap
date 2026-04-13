import { getAccessToken } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const resource = process.env.LOGTO_API_RESOURCE || 'https://back.simpleszap.com/api';
    const token = await getAccessToken(logtoConfig, resource);
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ token: null }, { status: 401 });
  }
}
