import { NextResponse } from 'next/server';

// Endpoint public pour le monitoring - PAS d'authentification
export async function GET() {
  const instanceId = process.env.INSTANCE_ID || 'UNKNOWN';
  const instanceColor = process.env.INSTANCE_COLOR || '#000000';
  
  return NextResponse.json({
    status: 'healthy',
    service: 'dating-app',
    instance: {
      id: instanceId,
      color: instanceColor
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
