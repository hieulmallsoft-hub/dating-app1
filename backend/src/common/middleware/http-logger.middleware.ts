import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

const SENSITIVE_KEYS = new Set([
  "password",
  "refreshToken",
  "accessToken",
  "token",
  "authorization",
  "otp",
  "code"
]);

function maskSensitive(obj: any) {
  if (!obj || typeof obj !== "object") return obj;

  const clone: any = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(k)) {
      clone[k] = "***";
    } else if (v && typeof v === "object") {
      clone[k] = maskSensitive(v);
    } else {
      clone[k] = v;
    }
  }
  return clone;
}

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(req: Request, res: Response, next: NextFunction): void {
    const start = process.hrtime.bigint();

    const method = req.method;
    const url = req.originalUrl;
    const userAgent = req.get("user-agent") || "";
    const xff = req.headers["x-forwarded-for"];
    const ip = (typeof xff === "string" ? xff.split(",")[0].trim() : req.ip) || "";

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const statusCode = res.statusCode;
      const contentLength = res.get("content-length") || "0";

      this.logger.log(
        `${method} ${url} ${statusCode} ${contentLength} - ${durationMs.toFixed(1)}ms - ${userAgent} ${ip}`
      );

      const contentType = req.get("content-type") || "";
      const hasBody = req.body && typeof req.body === "object" && Object.keys(req.body).length > 0;

      // Skip log body for multipart uploads
      if (hasBody && !contentType.includes("multipart/form-data")) {
        const safeBody = maskSensitive(req.body);
        const bodyStr = JSON.stringify(safeBody);
        this.logger.debug(`Body: ${bodyStr.length > 2000 ? bodyStr.slice(0, 2000) + "...(truncated)" : bodyStr}`);
      }
    });

    next();
  }
}