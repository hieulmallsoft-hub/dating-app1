import { Injectable, Logger } from "@nestjs/common";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging, type Messaging, type MulticastMessage } from "firebase-admin/messaging";

type PushMessageInput = {
    title: string;
    body: string;
    data?: Record<string, string>;
    link?: string;
    ttlSeconds?: number;
};

type PushSendResult = {
    sent: number;
    failed: number;
    invalidTokens: string[];
};

type FirebaseServiceAccount = {
    projectId: string;
    clientEmail: string;
    privateKey: string;
};

const INVALID_TOKEN_CODES = new Set<string>([
    "messaging/invalid-registration-token",
    "messaging/registration-token-not-registered"
]);

@Injectable()
export class FirebasePushService {
    private readonly logger = new Logger(FirebasePushService.name);
    private messagingClient: Messaging | null = null;
    private disabled = false;

    async sendToTokens(tokens: string[], payload: PushMessageInput): Promise<PushSendResult> {
        const cleanTokens = Array.from(
            new Set(
                tokens
                    .map((item) => item.trim())
                    .filter((item) => item.length > 0)
            )
        );
        if (!cleanTokens.length) {
            return { sent: 0, failed: 0, invalidTokens: [] };
        }

        const messaging = this.getMessagingClient();
        if (!messaging) {
            return { sent: 0, failed: 0, invalidTokens: [] };
        }

        const ttlSeconds = this.normalizeTtl(payload.ttlSeconds);
        const message: MulticastMessage = {
            tokens: cleanTokens,
            notification: {
                title: payload.title,
                body: payload.body
            },
            data: payload.data,
            android: {
                priority: "high",
                ttl: ttlSeconds * 1000
            },
            webpush: {
                headers: {
                    TTL: `${ttlSeconds}`,
                    Urgency: "high"
                },
                fcmOptions: payload.link ? { link: payload.link } : undefined,
                notification: {
                    title: payload.title,
                    body: payload.body,
                    icon: "/vite.svg"
                }
            },
            apns: {
                headers: {
                    "apns-priority": "10",
                    "apns-expiration": `${Math.floor(Date.now() / 1000) + ttlSeconds}`
                }
            }
        };

        try {
            const response = await messaging.sendEachForMulticast(message);
            const invalidTokens = response.responses
                .map((item, index) => ({ item, token: cleanTokens[index] }))
                .filter(({ item }) => !item.success && INVALID_TOKEN_CODES.has(item.error?.code || ""))
                .map(({ token }) => token);

            return {
                sent: response.successCount,
                failed: response.failureCount,
                invalidTokens
            };
        } catch (error) {
            this.logger.warn(`FCM send failed: ${(error as Error)?.message || "unknown"}`);
            return { sent: 0, failed: cleanTokens.length, invalidTokens: [] };
        }
    }

    private normalizeTtl(value?: number) {
        if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return 3600;
        return Math.min(Math.floor(value), 60 * 60 * 24 * 7);
    }

    private getMessagingClient(): Messaging | null {
        if (this.disabled) {
            return null;
        }
        if (this.messagingClient) {
            return this.messagingClient;
        }

        const serviceAccount = this.resolveServiceAccount();
        if (!serviceAccount) {
            this.disabled = true;
            this.logger.warn(
                "Firebase push is disabled because credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY."
            );
            return null;
        }

        const appName = "dating-app-firebase";
        const app =
            getApps().find((existing) => existing.name === appName) ??
            initializeApp(
                {
                    credential: cert(serviceAccount),
                    projectId: serviceAccount.projectId
                },
                appName
            );

        this.messagingClient = getMessaging(app);
        return this.messagingClient;
    }

    private resolveServiceAccount(): FirebaseServiceAccount | null {
        const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
        if (inlineJson) {
            try {
                const parsed = JSON.parse(inlineJson) as Partial<FirebaseServiceAccount>;
                const projectId = parsed.projectId?.trim();
                const clientEmail = parsed.clientEmail?.trim();
                const privateKey = this.normalizePrivateKey(parsed.privateKey);
                if (projectId && clientEmail && privateKey) {
                    return { projectId, clientEmail, privateKey };
                }
                this.logger.warn("FIREBASE_SERVICE_ACCOUNT_JSON is provided but missing required fields.");
            } catch (error) {
                this.logger.warn(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${(error as Error)?.message || "unknown"}`);
            }
        }

        const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
        const privateKey = this.normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
        if (!projectId || !clientEmail || !privateKey) {
            return null;
        }
        return { projectId, clientEmail, privateKey };
    }

    private normalizePrivateKey(value?: string) {
        if (!value) return "";
        return value
            .trim()
            .replace(/\\\\n/g, "\n")
            .replace(/\\n/g, "\n");
    }
}
