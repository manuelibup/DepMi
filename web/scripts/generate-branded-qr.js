const QRCode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const CORAL = '#FF5C38';
const QR_SIZE = 1000; // Larger for better quality, will scale down if needed
const URL = 'https://depmi.com';
const OUTPUT_PATH = path.join(__dirname, '../public/depmi-qr-code.png');
const LOGO_PATH = path.join(__dirname, '../public/depmi-logo.svg');

async function generateBrandedQR() {
    try {
        console.log('Generating QR code for:', URL);

        // 1. Generate the base QR code as a buffer (using dark coral and white)
        const qrBuffer = await QRCode.toBuffer(URL, {
            width: QR_SIZE,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: {
                dark: CORAL,
                light: '#FFFFFF'
            }
        });

        const logoSize = QR_SIZE * 0.22;
        const pad = 30; // Scale pad with QR_SIZE (original was 8 for 280, so (8/280)*1000 approx 28-30)
        const innerRadius = logoSize / 2 + pad;
        const centerX = QR_SIZE / 2;
        const centerY = QR_SIZE / 2;

        // 2. Create the overlay SVG (White circle + Coral ring + Logo)
        // We'll read the logo SVG and embed it or just composite it separately.
        // Embedding it in a larger SVG is easier for alignment.
        
        const overlaySvg = `
            <svg width="${QR_SIZE}" height="${QR_SIZE}" viewBox="0 0 ${QR_SIZE} ${QR_SIZE}" xmlns="http://www.w3.org/2000/svg">
                <!-- White background circle -->
                <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="white" />
                <!-- Coral border ring -->
                <circle cx="${centerX}" cy="${centerY}" r="${innerRadius}" fill="none" stroke="${CORAL}" stroke-width="10" />
            </svg>
        `;

        // 3. Perform composition
        // Layers: QR Code (base) -> Overlay SVG (circle/ring) -> Logo SVG (center)
        
        const logoBuffer = fs.readFileSync(LOGO_PATH);
        
        await sharp(qrBuffer)
            .composite([
                {
                    input: Buffer.from(overlaySvg),
                    top: 0,
                    left: 0
                },
                {
                    input: await sharp(logoBuffer)
                        .resize(Math.round(logoSize), Math.round(logoSize))
                        .toBuffer(),
                    top: Math.round(centerY - logoSize / 2),
                    left: Math.round(centerX - logoSize / 2)
                }
            ])
            .toFile(OUTPUT_PATH);

        console.log('Successfully generated branded QR code at:', OUTPUT_PATH);
        return OUTPUT_PATH;
    } catch (err) {
        console.error('Error generating branded QR code:', err);
    }
}

generateBrandedQR();
