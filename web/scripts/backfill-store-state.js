/**
 * One-time backfill: populate Store.storeState from the existing Store.location field.
 *
 * Location examples:
 *   "Uyo, Akwa Ibom"         → "Akwa Ibom"
 *   "Lagos Island, Lagos"    → "Lagos"
 *   "Abuja, FCT"             → "FCT"
 *   "Port Harcourt, Rivers"  → "Rivers"
 *
 * Run: node scripts/backfill-store-state.js
 */

const { PrismaClient } = require('@prisma/client')

const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
    'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
    'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

// Words that indicate country/generic location — not a useful state hint
const IGNORE_WORDS = ['nigeria', 'worldwide', 'onchain', 'online', 'global']

// City → state for common Nigerian cities (handles "Uyo, Nigeria" patterns)
const CITY_STATE_MAP = {
    'uyo': 'Akwa Ibom',
    'eket': 'Akwa Ibom',
    'ikot ekpene': 'Akwa Ibom',
    'lagos': 'Lagos',
    'ikeja': 'Lagos',
    'lekki': 'Lagos',
    'surulere': 'Lagos',
    'ibadan': 'Oyo',
    'ogbomosho': 'Oyo',
    'kano': 'Kano',
    'kaduna': 'Kaduna',
    'port harcourt': 'Rivers',
    'ph': 'Rivers',
    'enugu': 'Enugu',
    'aba': 'Abia',
    'umuahia': 'Abia',
    'onitsha': 'Anambra',
    'awka': 'Anambra',
    'benin city': 'Edo',
    'warri': 'Delta',
    'asaba': 'Delta',
    'calabar': 'Cross River',
    'yenagoa': 'Bayelsa',
    'makurdi': 'Benue',
    'jos': 'Plateau',
    'maiduguri': 'Borno',
    'yola': 'Adamawa',
    'sokoto': 'Sokoto',
    'ilorin': 'Kwara',
    'abeokuta': 'Ogun',
    'ado ekiti': 'Ekiti',
    'akure': 'Ondo',
    'osogbo': 'Osun',
    'abuja': 'FCT',
    'gwagwalada': 'FCT',
    'lafia': 'Nasarawa',
    'lokoja': 'Kogi',
    'birnin kebbi': 'Kebbi',
    'gusau': 'Zamfara',
    'dutse': 'Jigawa',
    'damaturu': 'Yobe',
    'jalingo': 'Taraba',
    'bauchi': 'Bauchi',
    'gombe': 'Gombe',
    'owerri': 'Imo',
    'abakaliki': 'Ebonyi',
    'minna': 'Niger',
    'bida': 'Niger',
    'kontagora': 'Niger',
}

/** Normalize: lowercase, remove "state" suffix, strip non-alpha */
function normalize(s) {
    return s.toLowerCase()
        .replace(/\bstate\b/gi, '')
        .replace(/[^a-z\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Attempt to parse a Nigerian state from a location string.
 * Tries every comma-separated segment, favouring exact matches over partial.
 */
function parseState(location) {
    if (!location) return null

    const segments = location.split(',').map(s => s.trim()).filter(Boolean)

    // Phase 1: exact match (case-insensitive, after normalizing)
    for (const seg of segments) {
        if (IGNORE_WORDS.includes(seg.toLowerCase().trim())) continue
        const norm = normalize(seg)
        const exact = NIGERIAN_STATES.find(s => normalize(s) === norm)
        if (exact) return exact
    }

    // Phase 2: partial match — state name fully contained in segment
    // Use word-boundary approach: state name must be a complete word sequence
    for (const seg of segments) {
        if (IGNORE_WORDS.includes(seg.toLowerCase().trim())) continue
        const norm = normalize(seg)
        // Sort states longest-first to prefer "Akwa Ibom" over "Niger" in "Akwa Ibom"
        const sorted = [...NIGERIAN_STATES].sort((a, b) => b.length - a.length)
        for (const state of sorted) {
            const stateNorm = normalize(state)
            // Check the normalized state appears as a word boundary in the segment
            const re = new RegExp(`(^|\\s)${stateNorm.replace(/\s+/g, '\\s+')}(\\s|$)`)
            if (re.test(norm)) return state
        }
    }

    // Phase 3: city lookup — check if any segment matches a known city
    for (const seg of segments) {
        if (IGNORE_WORDS.includes(seg.toLowerCase().trim())) continue
        const norm = normalize(seg)
        if (CITY_STATE_MAP[norm]) return CITY_STATE_MAP[norm]
    }

    return null
}

async function main() {
    const prisma = new PrismaClient()

    try {
        // Fetch all stores that have a location field (including ones that may have been
        // incorrectly set in a previous run — re-derive and correct them)
        const stores = await prisma.store.findMany({
            where: {
                location: { not: null },
            },
            select: { id: true, name: true, location: true, storeState: true },
        })

        console.log(`Found ${stores.length} stores with a location field.\n`)

        let updated = 0
        let corrected = 0
        let skipped = 0
        let alreadySet = 0

        for (const store of stores) {
            const derived = parseState(store.location)

            if (!derived) {
                if (!store.storeState) {
                    console.log(`  ✗  ${store.name}: "${store.location}" — could not parse state`)
                    skipped++
                } else {
                    // Already has a state, keep it
                    alreadySet++
                }
                continue
            }

            if (store.storeState === derived) {
                alreadySet++
                continue
            }

            const action = store.storeState == null ? 'set' : `corrected (was ${store.storeState})`
            await prisma.store.update({
                where: { id: store.id },
                data: { storeState: derived },
            })
            console.log(`  ✓  ${store.name}: "${store.location}" → ${derived} [${action}]`)
            if (store.storeState == null) updated++; else corrected++
        }

        console.log(`\nDone.`)
        console.log(`  Set (new):     ${updated}`)
        console.log(`  Corrected:     ${corrected}`)
        console.log(`  Already set:   ${alreadySet}`)
        console.log(`  Unresolvable:  ${skipped}`)
        if (skipped > 0) {
            console.log('  → Unresolvable stores need storeState set manually in /store/[slug]/settings.')
        }
    } finally {
        await prisma.$disconnect()
    }
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
