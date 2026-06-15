import { GenderPreference } from "../../domain/entities/user.entity";

export const GENDER_PREFERENCE_CODE_MAP: Record<number, GenderPreference> = {
    0: GenderPreference.MALE,
    1: GenderPreference.FEMALE,
    2: GenderPreference.BOTH
};

export const GENDER_PREFERENCE_VALUE_MAP: Record<GenderPreference, 0 | 1 | 2> = {
    [GenderPreference.MALE]: 0,
    [GenderPreference.FEMALE]: 1,
    [GenderPreference.BOTH]: 2
};

const LEGACY_GENDER_PREFERENCE_MAP: Record<string, GenderPreference> = {
    MALE: GenderPreference.MALE,
    FEMALE: GenderPreference.FEMALE,
    BOTH: GenderPreference.BOTH
};

export function toGenderPreferenceEnum(value: unknown): GenderPreference | unknown {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (normalized === "0" || normalized === "1" || normalized === "2") {
            return GENDER_PREFERENCE_CODE_MAP[Number(normalized)];
        }
        if (normalized in LEGACY_GENDER_PREFERENCE_MAP) {
            return LEGACY_GENDER_PREFERENCE_MAP[normalized];
        }
    }

    if (typeof value === "number" && Number.isInteger(value) && value in GENDER_PREFERENCE_CODE_MAP) {
        return GENDER_PREFERENCE_CODE_MAP[value];
    }

    return value;
}

export function toGenderPreferenceCode(value: GenderPreference | string | null | undefined): 0 | 1 | 2 | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        return value in GENDER_PREFERENCE_CODE_MAP ? (value as 0 | 1 | 2) : null;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (normalized in LEGACY_GENDER_PREFERENCE_MAP) {
            return GENDER_PREFERENCE_VALUE_MAP[LEGACY_GENDER_PREFERENCE_MAP[normalized]];
        }
        if (normalized === "0" || normalized === "1" || normalized === "2") {
            return Number(normalized) as 0 | 1 | 2;
        }
    }

    return GENDER_PREFERENCE_VALUE_MAP[value] ?? null;
}
