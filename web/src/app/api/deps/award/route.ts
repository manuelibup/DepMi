import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DepTier } from "@prisma/client";

// Helpers to calculate auto-tier bumps
function calculateDepTier(deps: number): DepTier {
    if (deps >= 1000) return DepTier.LEGEND;
    if (deps >= 501) return DepTier.ELITE;
    if (deps >= 201) return DepTier.TRUSTED;
    if (deps >= 51) return DepTier.RISING;
    return DepTier.SEEDLING;
}

export async function POST(req: Request) {
    try {
        // This route is internal-only — only callable from server-side code
        // (e.g. order completion handlers). Protect with a shared secret header
        // so no user can award themselves Deps via the client.
        const internalSecret = req.headers.get("x-internal-secret");
        if (
            !process.env.INTERNAL_API_SECRET ||
            internalSecret !== process.env.INTERNAL_API_SECRET
        ) {
            return NextResponse.json({ message: "Forbidden." }, { status: 403 });
        }

        const body = await req.json();
        const { userId, storeId, amount = 1, reason, orderId } = body;

        // Either award to a User (Buyer Trust) or a Store (Seller Trust)
        if (!userId && !storeId) {
            return NextResponse.json({ message: "Must provide either userId or storeId to award Deps." }, { status: 400 });
        }
        if (!reason) {
            return NextResponse.json({ message: "A reason must be supplied for the Dep audit log." }, { status: 400 });
        }

        const awardAmount = Number(amount);

        // Atomic Database Operation
        const result = await prisma.$transaction(async (tx) => {
            // STEP A: Store the immutable audit log entry
            const transactionRecord = await tx.depTransaction.create({
                data: {
                    userId,
                    storeId,
                    amount: awardAmount,
                    reason,
                    orderId
                }
            });

            // STEP B: Atomically increment the point counter and recalculate rank tier
            if (userId) {
                const user = await tx.user.update({
                    where: { id: userId },
                    data: { depCount: { increment: awardAmount } }
                });
                // Check if they crossed a tier boundary
                const newTier = calculateDepTier(user.depCount);
                if (user.depTier !== newTier) {
                    await tx.user.update({ where: { id: userId }, data: { depTier: newTier } });
                }
            }

            if (storeId) {
                const store = await tx.store.update({
                    where: { id: storeId },
                    data: { depCount: { increment: awardAmount } }
                });

                const newTier = calculateDepTier(store.depCount);
                if (store.depTier !== newTier) {
                    await tx.store.update({ where: { id: storeId }, data: { depTier: newTier } });
                }
            }

            return transactionRecord;
        });

        return NextResponse.json({
            message: "Deps awarded successfully.",
            transaction: result
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Deps Engine Error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
