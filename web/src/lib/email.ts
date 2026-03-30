/**
 * Branded transactional email templates for DepMi.
 * All functions are non-throwing — errors are logged but never propagate.
 */
import { resend } from './resend';

const FROM = process.env.RESEND_FROM_EMAIL || 'DepMi <security@depmi.com>';
const APP_URL = process.env.NEXTAUTH_URL || 'https://depmi.com';

function escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Shared HTML layout ────────────────────────────────────────────────────────

function layout(body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#141414;border-radius:16px;border:1px solid #222;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,var(--primary) 0%,#FF8264 100%);padding:28px 32px">
            <span style="font-size:1.5rem;font-weight:800;color:#000;letter-spacing:-0.5px">DepMi</span>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:32px;color:#e8e8e8">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #222;font-size:0.75rem;color:#555;text-align:center">
            © ${new Date().getFullYear()} DepMi · <a href="${APP_URL}" style="color:var(--primary);text-decoration:none">depmi.com</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function btn(label: string, href: string): string {
    return `<a href="${href}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:var(--primary);color:#000;font-weight:700;font-size:0.95rem;border-radius:10px;text-decoration:none">${label}</a>`;
}

// ─── Welcome email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, displayName: string): Promise<void> {
    const safeName = escHtml(displayName);
    try {
        await resend.emails.send({
            from: FROM,
            to,
            subject: `Welcome to DepMi, ${safeName}!`,
            html: layout(`
                <h2 style="margin:0 0 8px;font-size:1.4rem;color:#fff">Welcome, ${safeName}!</h2>
                <p style="margin:0 0 24px;color:#aaa;line-height:1.6">
                    You just joined Africa's marketplace built on <strong style="color:var(--primary)">trust</strong>.
                    Here's what you can do on DepMi:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td style="padding:14px 16px;background:#1a1a1a;border-radius:10px;margin-bottom:10px">
                            <span style="color:var(--primary);font-weight:700">🔍 Search & discover</span>
                            <p style="margin:4px 0 0;color:#999;font-size:0.875rem">Find products from verified sellers across Nigeria.</p>
                        </td>
                    </tr>
                    <tr><td style="height:10px"></td></tr>
                    <tr>
                        <td style="padding:14px 16px;background:#1a1a1a;border-radius:10px">
                            <span style="color:var(--primary);font-weight:700">📋 Post a request</span>
                            <p style="margin:4px 0 0;color:#999;font-size:0.875rem">Tell sellers what you need — they come to you with offers.</p>
                        </td>
                    </tr>
                    <tr><td style="height:10px"></td></tr>
                    <tr>
                        <td style="padding:14px 16px;background:#1a1a1a;border-radius:10px">
                            <span style="color:var(--primary);font-weight:700">🏪 Open your store</span>
                            <p style="margin:4px 0 0;color:#999;font-size:0.875rem">List products and get paid securely with escrow protection.</p>
                        </td>
                    </tr>
                </table>
                ${btn('Explore DepMi →', APP_URL)}
            `),
        });
    } catch (err) {
        console.error('[email] sendWelcomeEmail failed:', err);
    }
}

// ─── Waitlist: confirmation on join ───────────────────────────────────────────

export async function sendWaitlistConfirmEmail(to: string): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM,
            to,
            subject: "You're on the DepMi waitlist!",
            html: layout(`
                <h2 style="margin:0 0 8px;font-size:1.4rem;color:#fff">You're in line!</h2>
                <p style="color:#aaa;line-height:1.6;margin:0 0 16px">
                    Thanks for joining the DepMi waitlist. We're putting the finishing touches on
                    Africa's most trusted marketplace and you'll be among the first to know when we launch.
                </p>
                <div style="padding:16px;background:#1a1a1a;border-radius:10px;border-left:3px solid var(--primary)">
                    <p style="margin:0;color:#ccc;font-size:0.9rem">
                        We'll send you a personal invite with early access as soon as we're ready.
                        Keep an eye on this inbox!
                    </p>
                </div>
            `),
        });
    } catch (err) {
        console.error('[email] sendWaitlistConfirmEmail failed:', err);
    }
}

// ─── Waitlist: launch blast ────────────────────────────────────────────────────

export async function sendWaitlistLaunchEmail(to: string): Promise<void> {
    try {
        await resend.emails.send({
            from: FROM,
            to,
            subject: "DepMi is live — your wait is over! 🎉",
            html: layout(`
                <h2 style="margin:0 0 8px;font-size:1.4rem;color:#fff">We're live. Finally.</h2>
                <p style="color:#aaa;line-height:1.6;margin:0 0 16px">
                    You signed up for the DepMi waitlist and today's the day.
                    DepMi is officially open — Africa's marketplace built on trust, escrow, and community.
                </p>
                <p style="color:#aaa;line-height:1.6;margin:0 0 24px">
                    You're one of the first. Create your account now and start exploring —
                    search for products, post what you need, or open your own store.
                </p>
                <div style="padding:16px;background:#1a1a1a;border-radius:10px;border-left:3px solid var(--primary)">
                    <p style="margin:0;color:#ccc;font-size:0.9rem">
                        <strong style="color:var(--primary)">Early access perk:</strong> Your account gets a
                        head-start — be among the first sellers and buyers in your city.
                    </p>
                </div>
                ${btn('Create My Account →', `${APP_URL}/register`)}
            `),
        });
    } catch (err) {
        console.error('[email] sendWaitlistLaunchEmail failed:', err);
    }
}
