'use client'

import React from 'react'

export const SizeCell: React.FC<any> = ({ cellData }) => {
  if (cellData === undefined || cellData === null || cellData === '') {
    return <span style={{ color: '#888', fontSize: '12px' }}>-</span>
  }

  const bytes = Number(cellData)
  if (isNaN(bytes) || bytes === 0) return <span>0 Bytes</span>

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]

  return <span style={{ fontWeight: 500 }}>{formatted}</span>
}

export default SizeCell
