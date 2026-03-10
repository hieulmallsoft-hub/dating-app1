import { toGenderCode } from "./gender.mapper";

export function toApiUser<T extends Record<string, any> | null>(user: T) {
    if (!user) {
        return user;
    }

    const normalizeBirthDate = (value: unknown): string | null => {
        if (!value) return null;
        if (value instanceof Date) return value.toISOString().slice(0, 10);
        if (typeof value === "string") {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
        return null;
    };

    const toNullableNumber = (value: unknown): number | null => {
        const parsed = typeof value === "string" ? Number(value) : value;
        return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : null;
    };

    return {
        id: user.id,
        email: user.email,
        accountCode:
            typeof user.accountCode === "string" && user.accountCode.trim().length > 0
                ? user.accountCode.trim()
                : null,
        fullName: user.fullName ?? null,
        gender: toGenderCode(user.gender),
        birthDate: normalizeBirthDate(user.birthDate),
        avatar: user.avatar ?? null,
        latitude: toNullableNumber(user.latitude),
        longitude: toNullableNumber(user.longitude)
    };
}
