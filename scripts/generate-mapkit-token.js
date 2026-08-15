// Signs a long-lived ES256 JWT for MapKit JS. No dependencies — uses Node's built-in crypto.
// Usage: node scripts/generate-mapkit-token.js <path-to-AuthKey.p8> <KEY_ID> <TEAM_ID> [validDays=270]
//
// The MapKit key itself (generated in the Apple Developer Portal under
// Certificates, Identifiers & Profiles > Keys) should be domain-restricted to
// lukesanabria.com — that restriction, not this token's secrecy, is the real
// access control. Paste the printed token into places.js as MAPKIT_JWT.

const fs = require('fs');
const crypto = require('crypto');

const [, , keyPath, keyId, teamId, daysArg] = process.argv;

if (!keyPath || !keyId || !teamId) {
    console.error('Usage: node scripts/generate-mapkit-token.js <path-to-AuthKey.p8> <KEY_ID> <TEAM_ID> [validDays=270]');
    process.exit(1);
}

const days = parseInt(daysArg || '270', 10);
const privateKey = fs.readFileSync(keyPath, 'utf8');

function base64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const now = Math.floor(Date.now() / 1000);
const payload = { iss: teamId, iat: now, exp: now + days * 86400 };

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363'
});

const token = `${signingInput}.${base64url(signature)}`;

console.log(token);
console.log(`\nExpires: ${new Date((now + days * 86400) * 1000).toISOString()}`);
