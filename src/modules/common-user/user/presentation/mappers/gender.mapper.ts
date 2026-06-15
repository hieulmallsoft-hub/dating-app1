import { Gender } from "../../domain/entities/user.entity";

export const GENDER_CODE_MAP: Record<number, Gender> = {
    0: Gender.MALE,
    1: Gender.FEMALE,
    2: Gender.OTHER
};

export const GENDER_VALUE_MAP: Record<Gender, 0 | 1 | 2> = {
    [Gender.MALE]: 0,
    [Gender.FEMALE]: 1,
    [Gender.OTHER]: 2
};

const LEGACY_GENDER_MAP: Record<string, Gender> = {
    MALE: Gender.MALE,
    FEMALE: Gender.FEMALE,
    OTHER: Gender.OTHER
};

export function toGenderEnum(value: unknown): Gender | unknown {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (normalized === "0" || normalized === "1" || normalized === "2") {
            return GENDER_CODE_MAP[Number(normalized)];
        }
        if (normalized in LEGACY_GENDER_MAP) {
            return LEGACY_GENDER_MAP[normalized];
        }
    }

    if (typeof value === "number" && Number.isInteger(value) && value in GENDER_CODE_MAP) {
        return GENDER_CODE_MAP[value];
    }

    return value;
}

export function toGenderCode(value: Gender | string | number | null | undefined): 0 | 1 | 2 | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return value in GENDER_CODE_MAP ? (value as 0 | 1 | 2) : null;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (normalized in LEGACY_GENDER_MAP) {
            return GENDER_VALUE_MAP[LEGACY_GENDER_MAP[normalized]];
        }
        if (normalized === "0" || normalized === "1" || normalized === "2") {
            return Number(normalized) as 0 | 1 | 2;
        }
    }

    return GENDER_VALUE_MAP[value] ?? null;
}
