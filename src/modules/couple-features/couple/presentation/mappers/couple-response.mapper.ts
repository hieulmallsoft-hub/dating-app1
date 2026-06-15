import { CoupleStatus } from "../../domain/entities/couple.entity";

type CoupleLike = {
    user2Id?: string | null;
    status: CoupleStatus;
    startDate?: Date | string | null;
    startDateAt?: Date | string | null;
};

function toDateOnly(value: Date | string | null | undefined) {
    if (!value) {
        return null;
    }
    if (value instanceof Date) {
        return value.toISOString().slice(0, 10);
    }

    const normalized = value.trim();
    if (!normalized) {
        return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
    }

    return new Date(normalized).toISOString().slice(0, 10);
}

export function toCoupleResponse(couple: CoupleLike) {
    const normalizeDateTime = (value: Date | string | null | undefined) => {
        if (!value) return null;
        if (value instanceof Date) return value.toISOString();
        const normalized = value.trim();
        return normalized ? new Date(normalized).toISOString() : null;
    };

    return {
        user2Id: couple.user2Id ?? null,
        status: couple.status,
        startDate: toDateOnly(couple.startDate),
        startDateAt: normalizeDateTime(couple.startDateAt)
    };
}
