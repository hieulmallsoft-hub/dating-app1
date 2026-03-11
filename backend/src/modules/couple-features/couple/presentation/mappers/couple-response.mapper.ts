import { CoupleStatus } from "../../domain/entities/couple.entity";

type CoupleLike = {
    user2Id?: string | null;
    status: CoupleStatus;
    startDate?: Date | string | null;
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
    return {
        user2Id: couple.user2Id ?? null,
        status: couple.status,
        startDate: toDateOnly(couple.startDate)
    };
}
