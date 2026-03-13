#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Generate VAPID keys for Web Push notifications.
 * Usage: node scripts/generate-vapid-keys.js
 *
 * Copy the output into your .env.local file.
 */

const webPush = require("web-push");

const vapidKeys = webPush.generateVAPIDKeys();

console.log("# --- VAPID Keys for Web Push Notifications ---");
console.log("# Add these to your .env.local file:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:admin@salessystem.com`);
console.log("\n# --- End VAPID Keys ---");
