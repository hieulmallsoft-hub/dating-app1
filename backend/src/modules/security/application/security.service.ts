import { Injectable, BadRequestException } from "@nestjs/common";
import { SecurityRepository } from "../infrastructure/persistence/security.repository";
import * as bcrypt from "bcryptjs";

@Injectable()
export class SecurityService {
    constructor(private readonly securityRepository: SecurityRepository) {}

    async setPin(userId: string, pin: string) {
        if (pin.length !== 4 || isNaN(Number(pin))) {
            throw new BadRequestException("PIN must be 4 digits");
        }

        const pinHash = await bcrypt.hash(pin, 10);
        let security = await this.securityRepository.findOne({ where: { userId } });

        if (!security) {
            security = this.securityRepository.create({ userId, pinHash });
        } else {
            security.pinHash = pinHash;
        }

        return this.securityRepository.save(security);
    }

    async verifyPin(userId: string, pin: string) {
        const security = await this.securityRepository.findOne({
            where: { userId },
            select: ["pinHash"]
        });

        if (!security || !security.pinHash) {
            throw new BadRequestException("PIN not set");
        }

        const isMatch = await bcrypt.compare(pin, security.pinHash);
        if (!isMatch) throw new BadRequestException("Incorrect PIN");

        return { success: true };
    }
}
