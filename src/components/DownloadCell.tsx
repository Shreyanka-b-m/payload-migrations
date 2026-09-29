'use client'

import React from 'react'

export const DownloadCell: React.FC<any> = ({ rowData }) => {
  const filename =
    rowData?.filename ||
    (rowData?.name?.endsWith('.zip') ? rowData.name : null)

  if (!filename) {
    return (
      <span style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
        No file attached
      </span>
    )
  }

  const downloadUrl = `/api/migration/download/${encodeURIComponent(filename)}`

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={filename}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          backgroundColor: '#0070f3',
          color: '#ffffff',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 600,
          textDecoration: 'none',
          cursor: 'pointer',
        }}
      >
        📥 Download Archive
      </a>
    </div>
  )
}

export default DownloadCell
