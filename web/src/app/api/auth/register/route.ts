import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    displayName: z.string().min(2, "Display Name is required"),
    dateOfBirth: z.string().refine((date) => {
        const dob = new Date(date);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        return age >= 13;
    }, { message: "You must be at least 13 years old" }),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, username, displayName, dateOfBirth } = registerSchema.parse(body);

        const hashedPassword = await bcrypt.hash(password, 12);

        // Rely on DB unique constraints (email, username) rather than pre-checking.
        // This eliminates the TOCTOU race condition where two concurrent requests
        // could both pass the check and then both attempt to insert.
        const newUser = await prisma.user.create({
            data: {
                email,
                username,
                displayName,
                dateOfBirth: new Date(dateOfBirth),
                accounts: {
                    create: {
                        provider: "EMAIL",
                        passwordHash: hashedPassword,
                    },
                },
            },
        });

        // Don't return full user object for security
        return NextResponse.json(
            { message: "User created successfully", userId: newUser.id },
            { status: 201 }
        );
    } catch (error: unknown) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: "Validation error", errors: error.errors }, { status: 400 });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = error.meta?.target as string[] | undefined;
            if (target?.includes("email")) {
                return NextResponse.json({ message: "Email already exists" }, { status: 409 });
            }
            if (target?.includes("username")) {
                return NextResponse.json({ message: "Username is already taken" }, { status: 409 });
            }
            return NextResponse.json({ message: "Account already exists" }, { status: 409 });
        }
        console.error("Registration error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
