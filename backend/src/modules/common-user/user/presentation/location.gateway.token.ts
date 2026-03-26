export const LOCATION_GATEWAY_TOKEN = "LOCATION_GATEWAY_TOKEN";

export type LocationGatewayEmitter = {
    emitLocationUpdated: (payload: {
        coupleId: string;
        userId: string;
        latitude: number;
        longitude: number;
        accuracy: number | null;
        batteryLevel: number | null;
        isCharging: boolean | null;
        speed: number | null;
        lastActiveAt: string;
    }) => void;
};
