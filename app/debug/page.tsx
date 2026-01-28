'use client';

import { useEffect, useState } from 'react';

export default function DebugPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setHealthData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Health check failed:', err);
        setLoading(false);
      });
  }, []);

  const testLoadBalancing = async () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        results.push(data.instance.id);
      } catch (err) {
        results.push('ERROR');
      }
    }
    alert(`Load balancing test: ${results.join(' → ')}`);
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔧 Debug Page - Load Balancing Test</h1>
      
      {healthData ? (
        <div style={{ 
          background: healthData.instance.color, 
          color: 'white', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h2>✅ Current Instance: {healthData.instance.id}</h2>
          <p><strong>Status:</strong> {healthData.status}</p>
          <p><strong>Timestamp:</strong> {healthData.timestamp}</p>
          <p><strong>Uptime:</strong> {Math.round(healthData.instance.uptime)}s</p>
          <p><strong>Memory:</strong> {Math.round(healthData.instance.memory.heapUsed / 1024 / 1024)}MB</p>
          <p><strong>PID:</strong> {healthData.instance.pid}</p>
          <p><strong>Environment:</strong> {healthData.instance.env}</p>
        </div>
      ) : (
        <div style={{ background: '#f44336', color: 'white', padding: '15px', borderRadius: '8px' }}>
          <h2>❌ Health Check Failed</h2>
          <p>Cannot connect to /api/health</p>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>🧪 Load Balancing Test</h3>
        <button 
          onClick={testLoadBalancing}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test 5 Requests
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>🔗 Available Links</h3>
        <ul>
          <li><a href="/api/health" target="_blank">/api/health - Health Check</a></li>
          <li><a href="/" target="_blank">/ - Main Page (might redirect)</a></li>
          <li><a href="/auth/login" target="_blank">/auth/login - Login Page</a></li>
          <li><a href="http://localhost:8080" target="_blank">Traefik Dashboard</a></li>
          <li><a href="http://localhost:3001" target="_blank">App1 Direct</a></li>
          <li><a href="http://localhost:3002" target="_blank">App2 Direct</a></li>
          <li><a href="http://localhost:3003" target="_blank">App3 Direct</a></li>
        </ul>
      </div>

      <div>
        <h3>🔄 Actions</h3>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Refresh Page
        </button>
        
        <button 
          onClick={() => {
            fetch('/api/health')
              .then(res => res.json())
              .then(data => setHealthData(data));
          }}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            background: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Refresh Health Data
        </button>
      </div>

      <div style={{ marginTop: '30px', fontSize: '12px', color: '#666' }}>
        <p>This debug page bypasses authentication and middleware to test load balancing.</p>
      </div>
    </div>
  );
}
