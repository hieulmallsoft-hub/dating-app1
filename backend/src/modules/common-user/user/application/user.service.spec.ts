import { NotFoundException } from "@nestjs/common";
import { UsersService } from "./user.service";
import type { LocationGateway } from "../presentation/location.gateway";

type MockRepo = {
    find: jest.Mock;
    delete: jest.Mock;
};

const createRepository = (extra: Partial<MockRepo> = {}): MockRepo => ({
    find: jest.fn(),
    delete: jest.fn(),
    ...extra
});

describe("UsersService.deleteUser", () => {
    it("throws NotFoundException when user does not exist", async () => {
        const userRepository = {
            findById: jest.fn().mockResolvedValue(null)
        };
        const locationHistoryRepository = {};
        const dataSource = {
            transaction: jest.fn()
        };

        const locationGateway = { emitLocationUpdated: jest.fn() } as unknown as LocationGateway;
        const locationRateLimitService = {
            shouldIgnoreUpdate: jest.fn().mockResolvedValue(false),
            commit: jest.fn().mockResolvedValue(undefined)
        };
        const service = new UsersService(
            userRepository as any,
            locationHistoryRepository as any,
            dataSource as any,
            locationGateway,
            locationRateLimitService as any
        );

        await expect(service.deleteUser("missing-user")).rejects.toBeInstanceOf(NotFoundException);
        expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it("deletes current user and related data in transaction", async () => {
        const coupleRepo = createRepository({
            find: jest.fn().mockResolvedValue([{ id: "couple-1" }]),
            delete: jest.fn()
        });
        const messageRepo = createRepository();
        const eventRepo = createRepository();
        const momentRepo = createRepository();
        const locationRepo = createRepository();
        const mediaRepo = createRepository();
        const tripRepo = createRepository();
        const inviteRepo = createRepository();
        const notificationRepo = createRepository();
        const settingRepo = createRepository();
        const securityRepo = createRepository();
        const userEntityRepo = createRepository();

        const repositories = new Map<string, any>([
            ["Couple", coupleRepo],
            ["Message", messageRepo],
            ["Event", eventRepo],
            ["Moment", momentRepo],
            ["Location", locationRepo],
            ["Media", mediaRepo],
            ["Trip", tripRepo],
            ["Invite", inviteRepo],
            ["Notification", notificationRepo],
            ["Setting", settingRepo],
            ["SecuritySetting", securityRepo],
            ["User", userEntityRepo]
        ]);

        const manager = {
            getRepository: jest.fn((entity: { name: string }) => repositories.get(entity.name))
        };
        const dataSource = {
            transaction: jest.fn(async (callback: (m: typeof manager) => Promise<void>) =>
                callback(manager)
            )
        };
        const userRepository = {
            findById: jest.fn().mockResolvedValue({ id: "user-1" })
        };
        const locationHistoryRepository = {};

        const locationGateway = { emitLocationUpdated: jest.fn() } as unknown as LocationGateway;
        const locationRateLimitService = {
            shouldIgnoreUpdate: jest.fn().mockResolvedValue(false),
            commit: jest.fn().mockResolvedValue(undefined)
        };
        const service = new UsersService(
            userRepository as any,
            locationHistoryRepository as any,
            dataSource as any,
            locationGateway,
            locationRateLimitService as any
        );

        const result = await service.deleteUser("user-1");

        expect(result).toEqual({ message: "User deleted successfully" });
        expect(dataSource.transaction).toHaveBeenCalledTimes(1);
        expect(coupleRepo.find).toHaveBeenCalled();
        expect(coupleRepo.delete).toHaveBeenCalled();
        expect(messageRepo.delete).toHaveBeenCalled();
        expect(eventRepo.delete).toHaveBeenCalled();
        expect(momentRepo.delete).toHaveBeenCalled();
        expect(locationRepo.delete).toHaveBeenCalled();
        expect(mediaRepo.delete).toHaveBeenCalled();
        expect(tripRepo.delete).toHaveBeenCalled();
        expect(inviteRepo.delete).toHaveBeenCalledWith({ inviterId: "user-1" });
        expect(notificationRepo.delete).toHaveBeenCalledWith({ userId: "user-1" });
        expect(settingRepo.delete).toHaveBeenCalledWith({ userId: "user-1" });
        expect(securityRepo.delete).toHaveBeenCalledWith({ userId: "user-1" });
        expect(userEntityRepo.delete).toHaveBeenCalledWith({ id: "user-1" });
    });
});

describe("UsersService.updateMyLocation", () => {
    it("uses client timestamp when updating latest location", async () => {
        const timestamp = 1762677600000;
        const eventTime = new Date(timestamp);
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                id: "user-1",
                accountCode: "123456",
                latitude: null,
                longitude: null,
                batteryLevel: null,
                isCharging: null,
                speed: null,
                lastActiveAt: new Date(timestamp - 60_000)
            }),
            updateById: jest.fn().mockResolvedValue(undefined)
        };
        const locationHistoryRepository = {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((value) => value),
            save: jest.fn().mockResolvedValue(undefined)
        };
        const coupleRepo = {
            findOne: jest.fn().mockResolvedValue({ id: "couple-1" })
        };
        const dataSource = {
            getRepository: jest.fn((entity: { name?: string }) => {
                if (entity?.name === "Couple") return coupleRepo;
                return null;
            })
        };

        const locationGateway = { emitLocationUpdated: jest.fn() } as unknown as LocationGateway;
        const locationRateLimitService = {
            shouldIgnoreUpdate: jest.fn().mockResolvedValue(false),
            commit: jest.fn().mockResolvedValue(undefined)
        };
        const service = new UsersService(
            userRepository as any,
            locationHistoryRepository as any,
            dataSource as any,
            locationGateway,
            locationRateLimitService as any
        );

        const result = await service.updateMyLocation(
            "user-1",
            10.123456789,
            106.987654321,
            8.8,
            90,
            true,
            5,
            timestamp
        );

        expect(userRepository.updateById).toHaveBeenCalledWith(
            "user-1",
            expect.objectContaining({
                latitude: 10.1234568,
                longitude: 106.9876543,
                lastActiveAt: eventTime,
                batteryLevel: 90,
                isCharging: true,
                speed: 5
            })
        );
        expect(locationHistoryRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "user-1",
                coupleId: "couple-1",
                latitude: 10.1234568,
                longitude: 106.9876543,
                recordedAt: eventTime
            })
        );
        expect(result).toEqual(
            expect.objectContaining({
                userId: "user-1",
                accountCode: "123456",
                latitude: 10.1234568,
                longitude: 106.9876543,
                batteryLevel: 90,
                isCharging: true,
                speed: 5
            })
        );
    });

    it("ignores stale location timestamp to avoid overriding newer position", async () => {
        const latestTime = new Date("2026-03-17T10:00:00.000Z");
        const userRepository = {
            findById: jest.fn().mockResolvedValue({
                id: "user-1",
                accountCode: "123456",
                latitude: 10.7654321,
                longitude: 106.654321,
                batteryLevel: 80,
                isCharging: false,
                speed: 3,
                lastActiveAt: latestTime
            }),
            updateById: jest.fn()
        };
        const locationHistoryRepository = {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn()
        };
        const dataSource = {
            getRepository: jest.fn()
        };

        const locationGateway = { emitLocationUpdated: jest.fn() } as unknown as LocationGateway;
        const locationRateLimitService = {
            shouldIgnoreUpdate: jest.fn().mockResolvedValue(false),
            commit: jest.fn().mockResolvedValue(undefined)
        };
        const service = new UsersService(
            userRepository as any,
            locationHistoryRepository as any,
            dataSource as any,
            locationGateway,
            locationRateLimitService as any
        );

        const result = await service.updateMyLocation(
            "user-1",
            10.1111111,
            106.2222222,
            9,
            70,
            true,
            9,
            latestTime.getTime() - 60_000
        );

        expect(userRepository.updateById).not.toHaveBeenCalled();
        expect(locationHistoryRepository.save).not.toHaveBeenCalled();
        expect(dataSource.getRepository).not.toHaveBeenCalled();
        expect(result).toEqual(
            expect.objectContaining({
                userId: "user-1",
                latitude: 10.7654321,
                longitude: 106.654321,
                batteryLevel: 80,
                isCharging: false,
                speed: 3
            })
        );
    });
});
