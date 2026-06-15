import { SyncRequest } from "../../domain/entities/sync-request.entity";

function toIsoString(value?: Date | string | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

export function toSyncRequestResponse(syncRequest: SyncRequest) {
    return {
        id: syncRequest.id,
        coupleId: syncRequest.coupleId,
        requesterId: syncRequest.requesterId,
        providerId: syncRequest.providerId,
        status: syncRequest.status,
        note: syncRequest.note ?? null,
        originalFileName: syncRequest.originalFileName ?? null,
        mimeType: syncRequest.mimeType ?? null,
        fileSize: syncRequest.fileSize ?? null,
        uploadedAt: toIsoString(syncRequest.uploadedAt),
        downloadedAt: toIsoString(syncRequest.downloadedAt),
        confirmedAt: toIsoString(syncRequest.confirmedAt),
        payloadDeletedAt: toIsoString(syncRequest.payloadDeletedAt),
        expiresAt: toIsoString(syncRequest.expiresAt),
        createdAt: toIsoString(syncRequest.createdAt),
        updatedAt: toIsoString(syncRequest.updatedAt)
    };
}

export function toSyncRequestResponseList(syncRequests: SyncRequest[]) {
    return syncRequests.map(toSyncRequestResponse);
}
