import { BadRequestException, ConflictException } from "@nestjs/common";
import { CoupleService } from "./couple.service";
import { Couple, CoupleStatus } from "../domain/entities/couple.entity";
import { User } from "../../../common-user/user/domain/entities/user.entity";
import { NotificationType } from "../../../common-user/notifications/domain/entities/notification.entity";

describe("CoupleService", () => {
    let service: CoupleService;
    let coupleRepository: { findOne: jest.Mock };
    let dataSource: { transaction: jest.Mock; getRepository: jest.Mock };
    let notificationsService: { createNotification: jest.Mock };

    beforeEach(() => {
        coupleRepository = {
            findOne: jest.fn()
        };

        dataSource = {
            transaction: jest.fn(),
            getRepository: jest.fn()
        };

        notificationsService = {
            createNotification: jest.fn().mockResolvedValue(undefined)
        };

        service = new CoupleService(coupleRepository as never, dataSource as never, notificationsService as never);
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

    it("rejects account code with invalid format before opening transaction", async () => {
        await expect(service.joinCouple("user-2", "bad-code")).rejects.toBeInstanceOf(BadRequestException);
        expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("joins couple by partner account code", async () => {
        const partner = { id: "user-1", accountCode: "123456" };

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

        const userRepo = {
            findOne: jest.fn().mockResolvedValue(partner),
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) return coupleRepo;
                    if (entity === User) return userRepo;
                    throw new Error("Unexpected repository");
                }
            })
        );

        const result = await service.joinCouple("user-2", " 123456 ");

        expect(userRepo.findOne).toHaveBeenCalledWith({
            where: { accountCode: "123456" },
            select: ["id", "accountCode"]
        });
        expect(coupleRepo.create).toHaveBeenCalledWith({
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE,
            startDate: expect.any(Date),
            startDateAt: null
        });
        expect(result).toEqual(
            expect.objectContaining({
                user1Id: "user-1",
                user2Id: "user-2",
                status: CoupleStatus.ACTIVE
            })
        );
        expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
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
        expect(historyRepository.find).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                where: { userId: "user-1", coupleId: "couple-1" }
            })
        );
        expect(historyRepository.find).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                where: { userId: "user-2", coupleId: "couple-1" }
            })
        );
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

    it("uses a dedicated notification type for disconnect", async () => {
        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-1" }])
        };

        const mutableCouple = {
            id: "couple-1",
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE
        };

        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue(mutableCouple),
            save: jest.fn().mockImplementation(async (value) => value)
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) return coupleRepo;
                    if (entity === User) return userRepo;
                    throw new Error("Unexpected repository");
                }
            })
        );

        const result = await service.disconnect("user-1");

        expect(result).toEqual(expect.objectContaining({ status: CoupleStatus.DISCONNECTED }));
        expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
        expect(notificationsService.createNotification).toHaveBeenCalledWith(
            "user-2",
            "Cap nhat ghep doi",
            "Doi cua ban vua ngat ket noi ghep doi",
            NotificationType.COUPLE_DISCONNECT
        );
    });

    it("allows overriding startDate and refreshes startDateAt", async () => {
        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-1" }, { id: "user-2" }])
        };

        const existingDate = new Date("2026-03-16T00:00:00.000Z");
        const existingUpdatedAt = new Date("2025-03-16T09:00:00.000Z");
        const mutableCouple = {
            id: "couple-1",
            user1Id: "user-1",
            user2Id: "user-2",
            status: CoupleStatus.ACTIVE,
            startDate: existingDate,
            startDateAt: existingUpdatedAt
        };

        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue(mutableCouple),
            save: jest.fn().mockImplementation(async (value) => ({
                ...value
            }))
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) return coupleRepo;
                    if (entity === User) return userRepo;
                    throw new Error("Unexpected repository");
                }
            })
        );

        const updateTime = "2026-03-20T12:00:00.000Z";
        const result = await service.updateCouple("user-1", { startDate: "2026-03-20", updateTime });

        expect(coupleRepo.save).toHaveBeenCalledTimes(1);
        expect(coupleRepo.save).toHaveBeenCalledWith(
            expect.objectContaining({
                startDate: expect.any(Date),
                startDateAt: new Date(updateTime)
            })
        );
        expect(result.startDate).toBeInstanceOf(Date);
        expect(result.startDateAt).toBeInstanceOf(Date);
        expect((result.startDate as Date).toISOString().slice(0, 10)).toBe("2026-03-20");
        expect((result.startDateAt as Date).toISOString()).toBe(new Date(updateTime).toISOString());
        expect(result).toEqual(
            expect.objectContaining({
                status: CoupleStatus.ACTIVE
            })
        );
        expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
    });

    it("rejects stale updateTime", async () => {
        const userLockQueryBuilder = {
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            setLock: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: "user-1" }, { id: "user-2" }])
        };

        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue({
                id: "couple-1",
                user1Id: "user-1",
                user2Id: "user-2",
                status: CoupleStatus.ACTIVE,
                startDate: new Date("2026-03-20T00:00:00.000Z"),
                startDateAt: new Date("2026-03-20T12:00:00.000Z")
            }),
            save: jest.fn()
        };

        const userRepo = {
            createQueryBuilder: jest.fn().mockReturnValue(userLockQueryBuilder)
        };

        dataSource.transaction.mockImplementation(async (callback) =>
            callback({
                getRepository: (entity: unknown) => {
                    if (entity === Couple) return coupleRepo;
                    if (entity === User) return userRepo;
                    throw new Error("Unexpected repository");
                }
            })
        );

        await expect(
            service.updateCouple("user-1", {
                startDate: "2026-03-19",
                updateTime: "2026-03-20T11:59:59.000Z"
            })
        ).rejects.toBeInstanceOf(ConflictException);
        expect(coupleRepo.save).not.toHaveBeenCalled();
    });
});
