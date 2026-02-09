
export default function formatExpireTime(expiresAt) {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}
