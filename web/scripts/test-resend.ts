import { Resend } from 'resend';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

if (!apiKey) {
    console.error('RESEND_API_KEY is not defined');
    process.exit(1);
}

const resend = new Resend(apiKey);

async function testResend() {
    console.log('Testing Resend with API Key:', apiKey.substring(0, 10) + '...');
    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: 'web5mnauel@gmail.com', // User's email from request
            subject: 'DepMi Resend Integration Test',
            html: '<p>Resend integration is <strong>working</strong>!</p>'
        });

        if (error) {
            console.error('Resend Error:', error);
        } else {
            console.log('Success! Email sent. ID:', data?.id);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testResend();
