// components/auth/UrgentLoginTest.tsx
'use client'

import { useState } from 'react'
import { signIn, getProviders } from 'next-auth/react'

export default function UrgentLoginTest() {
  const [result, setResult] = useState(null)
  const [providers, setProviders] = useState(null)

  const checkProviders = async () => {
    const providers = await getProviders()
    console.log("🔧 PROVIDERS DISPONIBLES:", providers)
    setProviders(providers)
  }

  const testWithoutRedirect = async () => {
    console.log("🧪 Test 1: signIn('credentials') avec redirect: false")
    
    const result = await signIn('credentials', {
      email: 'test@example.com', // CHANGEZ par votre email de test
      password: 'votre-password', // CHANGEZ par votre password de test
      redirect: false
    })
    
    console.log("📊 RÉSULTAT:", result)
    setResult(result)
  }

  const testDirectCall = async () => {
    console.log("🧪 Test 2: Appel direct API")
    
    try {
      const response = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: 'test@example.com', // CHANGEZ
          password: 'votre-password', // CHANGEZ
        })
      })
      
      console.log("📡 Response status:", response.status)
      console.log("📡 Response headers:", response.headers)
      
      const text = await response.text()
      console.log("📄 Response body:", text)
    } catch (error) {
      console.error("❌ Erreur:", error)
    }
  }

  const testBadCall = () => {
    console.log("🧪 Test 3: Appel qui reproduit le problème")
    // Ceci va reproduire votre problème
    signIn()
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', margin: '20px' }}>
      <h2>🚨 DIAGNOSTIC URGENT</h2>
      
      <div style={{ marginBottom: '10px' }}>
        <button 
          onClick={checkProviders}
          style={{ 
            padding: '10px 15px', 
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          1. Vérifier providers
        </button>
        
        <button 
          onClick={testWithoutRedirect}
          style={{ 
            padding: '10px 15px', 
            marginRight: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          2. Test credentials
        </button>
        
        <button 
          onClick={testDirectCall}
          style={{ 
            padding: '10px 15px', 
            marginRight: '10px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          3. Test API direct
        </button>
        
        <button 
          onClick={testBadCall}
          style={{ 
            padding: '10px 15px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          4. Reproduire problème
        </button>
      </div>

      {providers && (
        <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '5px' }}>
          <h3>🔧 Providers trouvés:</h3>
          <pre>{JSON.stringify(providers, null, 2)}</pre>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '5px' }}>
          <h3>📊 Résultat test:</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}