'use client'

import { useState, useEffect } from 'react'
import InstanceIndicator from '@/components/InstanceIndicator'

export default function LoadTestPage() {
  const [results, setResults] = useState([])
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState({ app1: 0, app2: 0 })

  const runTest = async (count = 10) => {
    setIsRunning(true)
    setResults([])
    setStats({ app1: 0, app2: 0 })
    
    for (let i = 0; i < count; i++) {
      try {
        const response = await fetch('/api/test-session', {
          cache: 'no-store'
        })
        const data = await response.json()
        
        setResults(prev => [...prev, data])
        setStats(prev => ({
          ...prev,
          [data.instance.toLowerCase().replace('-', '')]: prev[data.instance.toLowerCase().replace('-', '')] + 1
        }))
        
        // Petit délai entre les requêtes
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error('Test error:', error)
      }
    }
    
    setIsRunning(false)
  }

  const clearCookies = () => {
    document.cookie.split(";").forEach(cookie => {
      const eqPos = cookie.indexOf("=")
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <InstanceIndicator />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test de Load Balancing</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => runTest(20)}
              disabled={isRunning}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isRunning ? 'Test en cours...' : 'Lancer 20 requêtes'}
            </button>
            
            <button
              onClick={clearCookies}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Effacer les cookies
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">APP-1</h3>
              <div className="text-3xl font-bold text-red-500">{stats.app1}</div>
              <div className="text-sm text-gray-600">
                {stats.app1 > 0 && `${((stats.app1 / (stats.app1 + stats.app2)) * 100).toFixed(1)}%`}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-semibold mb-2">APP-2</h3>
              <div className="text-3xl font-bold text-teal-500">{stats.app2}</div>
              <div className="text-sm text-gray-600">
                {stats.app2 > 0 && `${((stats.app2 / (stats.app1 + stats.app2)) * 100).toFixed(1)}%`}
              </div>
            </div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded text-sm ${
                  result.instance === 'APP-1' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-teal-100 text-teal-800'
                }`}
              >
                <span className="font-semibold">{result.instance}</span>
                {' - '}
                <span>Visite #{result.visits}</span>
                {' - '}
                <span className="text-xs">{new Date(result.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}