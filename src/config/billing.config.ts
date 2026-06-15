import { registerAs } from "@nestjs/config";

const normalizeBool = (value?: string) => (value || "").trim().toLowerCase() === "true";
const normalizeList = (value?: string) =>
    (value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

export default registerAs("billing", () => ({
    googlePlay: {
        packageName: process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim(),
        productIds: normalizeList(process.env.GOOGLE_PLAY_PRODUCT_IDS),
        serviceAccountJson: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim(),
        serviceAccountFile: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE?.trim(),
        autoAcknowledge: normalizeBool(process.env.GOOGLE_PLAY_AUTO_ACKNOWLEDGE),
        rtdnToken: process.env.GOOGLE_PLAY_RTDN_TOKEN?.trim()
    }
}));
