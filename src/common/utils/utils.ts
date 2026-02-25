import * as bcrypt from "bcrypt";

export const comparePassword = async (password: string, hash: string) => {
    try {
        return bcrypt.compare(password, hash);
    } catch (error) {
        throw error;
    }
};
