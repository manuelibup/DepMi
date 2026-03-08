import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt } from "./encryption";

const globalForPrisma = globalThis as unknown as {
    prisma: ReturnType<typeof createExtendedClient> | undefined;
};

function createExtendedClient() {
    const client = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'connect_timeout=30&pool_timeout=45&connection_limit=5'
            }
        },
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

    return client.$extends({
        result: {
            user: {
                phoneNumber: {
                    needs: { phoneNumber: true },
                    compute(user) {
                        return user.phoneNumber ? decrypt(user.phoneNumber) : user.phoneNumber;
                    },
                },
                address: {
                    needs: { address: true },
                    compute(user) {
                        return user.address ? decrypt(user.address) : user.address;
                    },
                },
            },
            message: {
                text: {
                    needs: { text: true },
                    compute(msg) {
                        return msg.text ? decrypt(msg.text) : msg.text;
                    },
                },
            },
        },
        query: {
            user: {
                async create({ args, query }) {
                    if (args.data.phoneNumber) args.data.phoneNumber = encrypt(args.data.phoneNumber);
                    if (args.data.address) args.data.address = encrypt(args.data.address);
                    return query(args);
                },
                async update({ args, query }) {
                    if (typeof args.data.phoneNumber === 'string') args.data.phoneNumber = encrypt(args.data.phoneNumber);
                    if (typeof args.data.address === 'string') args.data.address = encrypt(args.data.address);
                    return query(args);
                },
            },
            message: {
                async create({ args, query }) {
                    if (args.data.text) args.data.text = encrypt(args.data.text);
                    return query(args);
                },
            },
        },
    });
}

export const prisma = globalForPrisma.prisma ?? createExtendedClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

