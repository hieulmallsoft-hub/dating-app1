import * as bcrypt from "bcryptjs";

export const comparePassword = async (password: string, hash: string) => {
    try {
        return bcrypt.compare(password, hash);
    } catch (error) {
        throw error;
    }
};
