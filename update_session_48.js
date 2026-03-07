const fs = require('fs');

const logsContent = `
---

## Session 48 — Mar 7, 2026 — Multi-media DMs & Advanced Social Loops
**Agent:** Antigravity (Claude 3.7 Sonnet)
**Human:** Manuel

### What was done:
- **Multi-media Messaging Engine:** Revamped the DM system to support more than just text.
    - **Schema Update:** Added \`MessageType\` enum (TEXT, IMAGE, AUDIO, STICKER) and \`mediaUrl\` field to the \`Message\` model.
    - **Cloudinary Integration:** Enabled direct-to-Cloudinary uploads for images and voice notes within the chat view.
    - **Audio Support:** Integrated a native \`VoiceRecorder\` component for sending audio messages.
    - **Sticker Support:** Initial scaffolding for stickers/emojis with interactive tray.
- **Linked Product Ecosystem:**
    - **Referral Notifications:** Comments now parse \`[product:id]\` syntax. When a user links a product, the store owner is automatically notified via a \`MENTION\` alert.
    - **Author Context:** Comments now include \`avatarUrl\` in the author payload for better personality in the feed.
- **Premium Sharing Experience:**
    - **Share Sheet:** Ported the custom multi-platform share sheet (WhatsApp, X, Facebook, Copy Link) to the \`ProductCard\`.
    - **UX Polish:** Added Escape-key listeners and click-away dismissal for the share overlay.
- **Social Notification Loops:**
    - **Likes & Saves:** Implemented backend triggers to notify store owners whenever their product is Liked or Saved to a Wishlist.
- **Bug Fixes:** Resolved the "User ID is required" error in the product detail enclave by ensuring \`ownerId\` is always selected in the Prisma product query.

### Outcome:
Direct Messaging is now a rich, multi-media experience. The "mention" loop is closed, allowing vendors to be notified when their products are discussed/linked, significantly increasing the "sticky" nature of the platform.
`;

const tipsContent = `
---

## 🎙️ 17. Multi-media DMs: Handling Blobs & Cloudinary Signatures

*This tip was added after implementing multi-media support (Audio/Images) in the chat engine.*

- **The Issue**: Sending local audio blobs or image files requires a multi-step handshake.
- **The Fix**: 
    1. Capture the media (e.g., \`VoiceRecorder\` blob or \`CloudinaryUploader\` file).
    2. Fetch a temporary signature from \`/api/upload/sign\`.
    3. Upload directly to Cloudinary from the client to keep Vercel functions lean.
    4. Pass the resulting \`secure_url\` to your \`POST /api/messages\` handler.
- **Pro Tip**: Use an \`optimisticSend\` pattern where the UI clears immediately, but keep a \`sending\` state to prevent double-posts of large media files.

## 🔗 18. Regex Parsing for Store Owner Notifications

*This tip was added after building the product-linking notification system.*

- **The Pattern**: When parsing text for mentions like \`[product:id]\`, use \`Array.from(new Set<string>(text.match(/regex/g)?.map(...)))\` to ensure you only notify a store owner *once* per comment, even if their product is linked multiple times.
- **The Query**: Use \`prisma.product.findMany({ where: { id: { in: ids } }, select: { store: { select: { ownerId: true } } } })\` for a high-performance, single-query lookup of all notification targets.
`;

// Updating agent.md (Data Architecture & Roadmap)
let agentPath = 'c:\\\\Users\\\\web5Manuel\\\\OneDrive\\\\Documents\\\\DepMi\\\\agent.md';
let agentData = fs.readFileSync(agentPath, 'utf8');

// Update Message model description
agentData = agentData.replace(/- **Message** — .*/, '- **Message** — `{ id, conversationId, senderId, text?, type, mediaUrl?, read, createdAt }`. Supports multi-media: TEXT, IMAGE, AUDIO, STICKER.');

// Mark Phase 4 as complete
agentData = agentData.replace(/### \*\*Phase 4: Social Connectivity \(Week 7\)\*\*/, '### **Phase 4: Social Connectivity (Week 7)** ✅ *Complete.*');

fs.writeFileSync(agentPath, agentData);

// Updating task.md
let taskPath = 'c:\\\\Users\\\\web5Manuel\\\\.gemini\\\\antigravity\\\\brain\\\\1b463276-a4c9-4867-9af5-bce3018d52ee\\\\task.md';
let taskData = fs.readFileSync(taskPath, 'utf8');

// Mark current tasks as complete
taskData = taskData.replace('- [x] Build the frontend `<CommentSection />` UI logic to utilize the new `Comment` schema.', '- [x] Build the frontend `<CommentSection />` UI logic (Mentions, Product Links, Notifications).');
taskData += '\\n- [x] Implement Multi-media Direct Messaging (Images, Audio, Stickers).';
taskData += '\\n- [x] Integrate custom ShareSheet for ProductCards.';
taskData += '\\n- [/] Phase 5: Financial Settlements & Escalated Trust (Next Priority).';

fs.writeFileSync(taskPath, taskData);

// Appending logs and tips
fs.appendFileSync('c:\\\\Users\\\\web5Manuel\\\\OneDrive\\\\Documents\\\\DepMi\\\\logs.md', logsContent);
fs.appendFileSync('c:\\\\Users\\\\web5Manuel\\\\OneDrive\\\\Documents\\\\DepMi\\\\tips.md', tipsContent);

console.log('Documentation updated successfully.');
