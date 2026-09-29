'use client';
import { jsx as _jsx } from "react/jsx-runtime";
export const SizeCell = ({ cellData }) => {
    if (cellData === undefined || cellData === null || cellData === '') {
        return _jsx("span", { style: { color: '#888', fontSize: '12px' }, children: "-" });
    }
    const bytes = Number(cellData);
    if (isNaN(bytes) || bytes === 0)
        return _jsx("span", { children: "0 Bytes" });
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    return _jsx("span", { style: { fontWeight: 500 }, children: formatted });
};
export default SizeCell;
