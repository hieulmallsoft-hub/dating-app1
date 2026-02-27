import { registerAs } from "@nestjs/config";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const resolveAuthBaseUrl = () => {
    const explicitBaseUrl = process.env.AUTH_BASE_URL || process.env.APP_URL;
    if (explicitBaseUrl) {
        return trimTrailingSlash(explicitBaseUrl);
    }

    const port = process.env.PORT || process.env.APP_PORT || "3000";
    return `http://localhost:${port}`;
};

export const resolveOAuthCallbackUrl = (provider: "google" | "apple") => {
    const envKey = provider === "google" ? process.env.GOOGLE_CALLBACK_URL : process.env.APPLE_CALLBACK_URL;
    if (envKey) {
        return trimTrailingSlash(envKey);
    }

    return `${resolveAuthBaseUrl()}/auth/${provider}/callback`;
};

export default registerAs("auth", () => ({
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: resolveOAuthCallbackUrl("google")
    },
    apple: {
        clientId: process.env.APPLE_CLIENT_ID,
        teamId: process.env.APPLE_TEAM_ID,
        keyId: process.env.APPLE_KEY_ID,
        keyFilePath: process.env.APPLE_KEY_FILE_PATH,
        callbackUrl: resolveOAuthCallbackUrl("apple")
    }
}));
