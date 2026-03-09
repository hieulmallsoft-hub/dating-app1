import { toGenderCode } from "./gender.mapper";
import { toGenderPreferenceCode } from "./gender-preference.mapper";

export function toApiUser<T extends Record<string, any> | null>(user: T) {
    if (!user) {
        return user;
    }

    return {
        ...user,
        gender: toGenderCode(user.gender),
        genderPreference: toGenderPreferenceCode(user.genderPreference)
    };
}
