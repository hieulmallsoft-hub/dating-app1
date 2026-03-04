import { BadRequestException } from "@nestjs/common";
import * as crypto from "crypto";
import { CoupleService } from "./couple.service";
import { Couple, CoupleStatus } from "../domain/entities/couple.entity";
import { Invite, InviteStatus } from "../../invites/domain/entities/invite.entity";
import { User } from "../../../common-user/user/domain/entities/users.enity";

describe("CoupleService", () => {
    let service: CoupleService;
    let coupleRepository: { findOne: jest.Mock };
    let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };

    beforeEach(() => {
        coupleRepository = {
            findOne: jest.fn()
        };

        dataSource = {
            transaction: jest.fn(),
            getRepository: jest.fn()
        };

        service = new CoupleService(coupleRepository as never, dataSource as never);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("returns the partner user when fetching the current couple", async () => {
        const user1 = { id: "user-1", fullName: "Alice" } as User;
        const user2 = { id: "user-2", fullName: "Bob" } as User;

        coupleRepository.findOne.mockResolvedValue({
            id: "couple-1",
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE,
            user1,
            user2
        });

        const result = await service.getMyCoupleWithPartner("user-1");

        expect(result.partner).toEqual(user2);
    });

    it("returns the opposite side as partner when requester is user2", async () => {
        const user1 = { id: "user-1", fullName: "Alice" } as User;
        const user2 = { id: "user-2", fullName: "Bob" } as User;

        coupleRepository.findOne.mockResolvedValue({
            id: "couple-1",
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE,
            user1,
            user2
        });

        const result = await service.getMyCoupleWithPartner("user-2");

        expect(result.partner).toEqual(user1);
    });

    it("rejects invite codes with an invalid format before opening a transaction", async () => {
        await expect(service.joinCouple("user-2", "bad-code")).rejects.toBeInstanceOf(BadRequestException);
        expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("normalizes invite codes before looking them up", async () => {
        const invite = {
            id: "invite-1",
            inviterId: "user-1",
            status: InviteStatus.PENDING,
            expiresAt: new Date(Date.now() + 60_000)
        };

        const inviteLookupQueryBuilder = {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(invite)
        };

        const inviteCleanupQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(undefined)
        };

        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-1" }, { id: "user-2" }])
        };

        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((value) => value),
            save: jest.fn().mockImplementation(async (value) => ({ id: "couple-1", ...value }))
        };

        const inviteRepo = {
            createQueryBuilder: jest
                .fn()
                .mockImplementation((alias?: string) =>
                    alias === "invite" ? inviteLookupQueryBuilder : inviteCleanupQueryBuilder
                ),
            update: jest.fn().mockResolvedValue({ affected: 1 })
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) {
                        return coupleRepo;
                    }

                    if (entity === Invite) {
                        return inviteRepo;
                    }

                    if (entity === User) {
                        return userRepo;
                    }

                    throw new Error("Unexpected repository");
                }
            })
        );

        await service.joinCouple("user-2", " ab12cd34 ");

        expect(inviteLookupQueryBuilder.where).toHaveBeenCalledWith("invite.inviteCode = :inviteCode", {
            inviteCode: "AB12CD34"
        });
    });

    it("reuses the newest valid pending invite and expires stale ones", async () => {
        const validInvite = {
            id: "invite-valid",
            inviterId: "user-1",
            status: InviteStatus.PENDING,
            expiresAt: new Date(Date.now() + 60_000),
            createdAt: new Date()
        };
        const expiredInvite = {
            id: "invite-expired",
            inviterId: "user-1",
            status: InviteStatus.PENDING,
            expiresAt: new Date(Date.now() - 60_000),
            createdAt: new Date(Date.now() - 1_000)
        };

        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-1" }])
        };

        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue(null)
        };

        const inviteRepo = {
            find: jest.fn().mockResolvedValue([validInvite, expiredInvite]),
            save: jest.fn().mockResolvedValue(expiredInvite),
            create: jest.fn()
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) {
                        return coupleRepo;
                    }

                    if (entity === Invite) {
                        return inviteRepo;
                    }

                    if (entity === User) {
                        return userRepo;
                    }

                    throw new Error("Unexpected repository");
                }
            })
        );

        const result = await service.createInvite("user-1");

        expect(result).toBe(validInvite);
        expect(expiredInvite.status).toBe(InviteStatus.EXPIRED);
        expect(inviteRepo.save).toHaveBeenCalledWith(expiredInvite);
        expect(inviteRepo.create).not.toHaveBeenCalled();
    });

    it("disconnects the current couple before creating a new one in connectNew", async () => {
        const invite = {
            id: "invite-1",
            inviterId: "user-3",
            status: InviteStatus.PENDING,
            expiresAt: new Date(Date.now() + 60_000)
        };
        const currentCouple = {
            id: "couple-current",
            user1Id: "user-2",
            user2Id: "user-4",
            status: CoupleStatus.ACTIVE
        };

        const inviteLookupQueryBuilder = {
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(invite)
        };

        const inviteCleanupQueryBuilder = {
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(undefined)
        };

        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-2" }, { id: "user-3" }])
        };

        const coupleRepo = {
            findOne: jest
                .fn()
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(currentCouple),
            create: jest.fn().mockImplementation((value) => value),
            save: jest.fn().mockImplementation(async (value) => value)
        };

        const inviteRepo = {
            createQueryBuilder: jest
                .fn()
                .mockImplementation((alias?: string) =>
                    alias === "invite" ? inviteLookupQueryBuilder : inviteCleanupQueryBuilder
                ),
            update: jest.fn().mockResolvedValue({ affected: 1 })
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) {
                        return coupleRepo;
                    }

                    if (entity === Invite) {
                        return inviteRepo;
                    }

                    if (entity === User) {
                        return userRepo;
                    }

                    throw new Error("Unexpected repository");
                }
            })
        );

        await service.connectNew("user-2", "A1B2C3D4");

        expect(currentCouple.status).toBe(CoupleStatus.DISCONNECTED);
        expect(coupleRepo.save).toHaveBeenNthCalledWith(1, currentCouple);
        expect(coupleRepo.save).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                user1Id: "user-3",
                user2Id: "user-2",
                status: CoupleStatus.ACTIVE
            })
        );
    });

    it("retries invite generation when a duplicate code is hit", async () => {
        const duplicateKeyError = Object.assign(new Error("duplicate key"), { code: "23505" });
        const randomBytesSpy = jest.spyOn(crypto, "randomBytes");
        randomBytesSpy
            .mockImplementationOnce(((size: number) => Buffer.from("A1B2C3D4", "hex")) as typeof crypto.randomBytes)
            .mockImplementationOnce(((size: number) => Buffer.from("B1C2D3E4", "hex")) as typeof crypto.randomBytes);

        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-1" }])
        };

        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue(null)
        };

        const inviteRepo = {
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockImplementation((value) => value),
            save: jest
                .fn()
                .mockRejectedValueOnce(duplicateKeyError)
                .mockImplementation(async (value) => ({ id: "invite-2", ...value }))
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) {
                        return coupleRepo;
                    }

                    if (entity === Invite) {
                        return inviteRepo;
                    }

                    if (entity === User) {
                        return userRepo;
                    }

                    throw new Error("Unexpected repository");
                }
            })
        );

        const result = await service.createInvite("user-1");

        expect(randomBytesSpy).toHaveBeenCalledTimes(2);
        expect(inviteRepo.save).toHaveBeenCalledTimes(2);
        expect(result).toEqual(
            expect.objectContaining({
                inviteCode: "B1C2D3E4"
            })
        );
    });

    it("returns location history for both me and partner", async () => {
        const now = new Date();
        const me = { id: "user-1", fullName: "Alice", email: "alice@test.dev" } as User;
        const partner = { id: "user-2", fullName: "Bob", email: "bob@test.dev" } as User;

        coupleRepository.findOne.mockResolvedValue({
            id: "couple-1",
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE,
            user1: me,
            user2: partner
        });

        const historyRepository = {
            find: jest.fn().mockImplementation(({ where }: { where: { userId: string } }) => {
                if (where.userId === "user-1") {
                    return Promise.resolve([
                        {
                            id: "hist-me-2",
                            userId: "user-1",
                            latitude: 10.7766,
                            longitude: 106.7012,
                            accuracy: 9.5,
                            createdAt: new Date(now.getTime() - 1_000)
                        },
                        {
                            id: "hist-me-1",
                            userId: "user-1",
                            latitude: 10.7765,
                            longitude: 106.7011,
                            accuracy: 11.5,
                            createdAt: new Date(now.getTime() - 2_000)
                        }
                    ]);
                }

                return Promise.resolve([
                    {
                        id: "hist-partner-1",
                        userId: "user-2",
                        latitude: 10.775,
                        longitude: 106.699,
                        accuracy: 20,
                        createdAt: new Date(now.getTime() - 1_500)
                    }
                ]);
            })
        };
        dataSource.getRepository.mockReturnValue(historyRepository);

        const result = await service.getCoupleLocationHistory("user-1", 80);

        expect(historyRepository.find).toHaveBeenCalledTimes(2);
        expect(result.me).toHaveLength(2);
        expect(result.partner).toHaveLength(1);
        expect(result.me[0]).toEqual(
            expect.objectContaining({
                id: "hist-me-1",
                userId: "user-1"
            })
        );
        expect(result.me[1]).toEqual(
            expect.objectContaining({
                id: "hist-me-2",
                accuracy: 9.5
            })
        );
    });

    it("clamps history limit to 500 records", async () => {
        const me = { id: "user-1", fullName: "Alice", email: "alice@test.dev" } as User;
        const partner = { id: "user-2", fullName: "Bob", email: "bob@test.dev" } as User;

        coupleRepository.findOne.mockResolvedValue({
            id: "couple-1",
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE,
            user1: me,
            user2: partner
        });

        const historyRepository = {
            find: jest.fn().mockResolvedValue([])
        };
        dataSource.getRepository.mockReturnValue(historyRepository);

        await service.getCoupleLocationHistory("user-1", 9999);

        expect(historyRepository.find).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                take: 500
            })
        );
        expect(historyRepository.find).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                take: 500
            })
        );
    });
});



