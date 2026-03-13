import { Session } from 'next-auth';

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

const ROLE_RANK: Record<AdminRole, number> = {
    MODERATOR: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3,
};

type AdminCheckOk = { ok: true; role: AdminRole };
type AdminCheckFail = { ok: false; error: string; status: number };

export function requireAdmin(
    session: Session | null,
    minRole: AdminRole = 'MODERATOR',
): AdminCheckOk | AdminCheckFail {
    if (!session?.user?.id) {
        return { ok: false, error: 'Unauthenticated', status: 401 };
    }
    const role = session.user.adminRole as AdminRole | null | undefined;
    if (!role || ROLE_RANK[role] === undefined || ROLE_RANK[role] < ROLE_RANK[minRole]) {
        return { ok: false, error: 'Forbidden', status: 403 };
    }
    return { ok: true, role };
}
