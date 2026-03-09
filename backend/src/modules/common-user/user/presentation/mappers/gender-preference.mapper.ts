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

export function toGenderPreferenceEnum(value: unknown): GenderPreference | unknown {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (typeof value === "string" && (value === "0" || value === "1" || value === "2")) {
        return GENDER_PREFERENCE_CODE_MAP[Number(value)];
    }

    if (typeof value === "number" && Number.isInteger(value) && value in GENDER_PREFERENCE_CODE_MAP) {
        return GENDER_PREFERENCE_CODE_MAP[value];
    }

    return value;
}

export function toGenderPreferenceCode(value: GenderPreference | null | undefined): 0 | 1 | 2 | null {
    if (!value) {
        return null;
    }
    return GENDER_PREFERENCE_VALUE_MAP[value] ?? null;
}
