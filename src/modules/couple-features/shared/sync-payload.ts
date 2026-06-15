export enum SyncPayloadStatus {
    UPLOADED = "uploaded",
    PARTIALLY_CONFIRMED = "partially_confirmed",
    CONFIRMED = "confirmed",
    PAYLOAD_DELETED = "payload_deleted"
}

export type SyncPayloadFields = {
    syncStatus?: SyncPayloadStatus | string | null;
    confirmedByUserIds?: string[] | null;
    confirmedAt?: Date | null;
    payloadDeletedAt?: Date | null;
    expiresAt?: Date | null;
};

export function mergeConfirmedUserIds(current: string[] | null | undefined, userId: string) {
    return Array.from(new Set([...(Array.isArray(current) ? current : []), userId].filter(Boolean)));
}

export function getRequiredCoupleUserIds(couple: { user1Id: string; user2Id: string | null }) {
    return [couple.user1Id, couple.user2Id].filter((id): id is string => Boolean(id));
}

export function resolveSyncStatus(confirmedByUserIds: string[], requiredUserIds: string[]) {
    return requiredUserIds.every((id) => confirmedByUserIds.includes(id))
        ? SyncPayloadStatus.CONFIRMED
        : SyncPayloadStatus.PARTIALLY_CONFIRMED;
}
