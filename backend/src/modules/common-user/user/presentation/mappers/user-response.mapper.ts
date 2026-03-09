import { toGenderPreferenceCode } from "./gender-preference.mapper";

export function toApiUser<T extends Record<string, any> | null>(user: T) {
    if (!user) {
        return user;
    }

    return {
        ...user,
        genderPreference: toGenderPreferenceCode(user.genderPreference)
    };
}
