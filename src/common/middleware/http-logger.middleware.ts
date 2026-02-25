import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
    private logger = new Logger("HTTP");

    use(request: Request, response: Response, next: NextFunction): void {
        const { ip, method, originalUrl, body } = request;
        const userAgent = request.get("user-agent") || "";

        response.on("finish", () => {
            const { statusCode } = response;
            const contentLength = response.get("content-length");

            this.logger.log(`${method} ${originalUrl} ${statusCode} ${contentLength} - ${userAgent} ${ip}`);
            if (Object.keys(body).length) {
                this.logger.debug(`Body: ${JSON.stringify(body)}`);
            }
        });

        next();
    }
}
