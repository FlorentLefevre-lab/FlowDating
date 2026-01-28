'use client'

import { useEffect, useState } from 'react'

export default function InstanceIndicator() {
  const [instanceInfo, setInstanceInfo] = useState(null)

  useEffect(() => {
    fetch('/api/instance-info')
      .then(res => res.json())
      .then(data => setInstanceInfo(data))
  }, [])

  if (!instanceInfo) return null

  return (
    <div 
      className="fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white"
      style={{ backgroundColor: instanceInfo.color }}
    >
      <div className="text-sm font-bold">Instance: {instanceInfo.id}</div>
      <div className="text-xs">PID: {instanceInfo.pid}</div>
      <div className="text-xs">Port: {instanceInfo.port}</div>
    </div>
  )
}