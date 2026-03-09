import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        console.log('Fetching Waitlist entries...')
        const result = await prisma.waitlist.findMany({ take: 5 })
        console.log('Success! Entries found:', result.length)
        console.log(result)
    } catch (error) {
        console.error('Query failed:')
        console.error(error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
