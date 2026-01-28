import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    pong: true,
    instance: process.env.INSTANCE_ID || 'UNKNOWN',
    time: new Date().toISOString()
  });
}
