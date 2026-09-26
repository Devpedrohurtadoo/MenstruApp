#!/usr/bin/env node
// Generates a VAPID key pair for Web Push. Paste the output into Netlify's environment variables
// (or into a local .env for development). Never commit the private key.
import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:privacy@your-domain.example');
