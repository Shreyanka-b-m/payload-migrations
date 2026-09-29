'use client';
import { jsx as _jsx } from "react/jsx-runtime";
export const DownloadCell = ({ rowData }) => {
    const filename = rowData?.filename ||
        (rowData?.name?.endsWith('.zip') ? rowData.name : null);
    if (!filename) {
        return (_jsx("span", { style: { color: '#888', fontSize: '12px', fontStyle: 'italic' }, children: "No file attached" }));
    }
    const downloadUrl = `/api/migration/download/${encodeURIComponent(filename)}`;
    return (_jsx("div", { style: { display: 'flex', gap: '8px', alignItems: 'center' }, children: _jsx("a", { href: downloadUrl, target: "_blank", rel: "noopener noreferrer", download: filename, style: {
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
            }, children: "\uD83D\uDCE5 Download Archive" }) }));
};
export default DownloadCell;
