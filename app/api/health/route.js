import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const instanceId = process.env.INSTANCE_ID || 'UNKNOWN';
    const instanceColor = process.env.INSTANCE_COLOR || '#000000';
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      instance: {
        id: instanceId,
        color: instanceColor,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        env: process.env.NODE_ENV || 'unknown'
      },
      message: `Health check OK from ${instanceId}`
    };
    
    return NextResponse.json(healthStatus, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Instance-ID': instanceId,
        'X-Instance-Color': instanceColor,
        'X-Health-Status': 'healthy'
      }
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      instance: {
        id: process.env.INSTANCE_ID || 'UNKNOWN'
      },
      error: {
        message: error.message
      }
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

export async function HEAD() {
  const instanceId = process.env.INSTANCE_ID || 'UNKNOWN';
  
  return new Response(null, {
    status: 200,
    headers: {
      'X-Instance-ID': instanceId,
      'X-Health-Status': 'healthy'
    }
  });
}
