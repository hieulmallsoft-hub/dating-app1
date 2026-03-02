import axios from "axios";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractMessage(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const message = data["message"];
  if (typeof message === "string") return message;

  if (Array.isArray(message) && message.every((item) => typeof item === "string")) {
    return message.join(", ");
  }

  return null;
}

export function getHttpStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return error.response?.status;
}

export function getHttpMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = extractMessage(error.response?.data);
    if (message) return message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

