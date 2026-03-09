import { NotFoundException } from "@nestjs/common";
import { UsersService } from "./user.service";

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

        const service = new UsersService(
            userRepository as any,
            locationHistoryRepository as any,
            dataSource as any
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
        const placeRepo = createRepository();
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
            ["Place", placeRepo],
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

        const service = new UsersService(
            userRepository as any,
            locationHistoryRepository as any,
            dataSource as any
        );

        const result = await service.deleteUser("user-1");

        expect(result).toEqual({ message: "User deleted successfully" });
        expect(dataSource.transaction).toHaveBeenCalledTimes(1);
        expect(coupleRepo.find).toHaveBeenCalled();
        expect(coupleRepo.delete).toHaveBeenCalled();
        expect(messageRepo.delete).toHaveBeenCalled();
        expect(eventRepo.delete).toHaveBeenCalled();
        expect(momentRepo.delete).toHaveBeenCalled();
        expect(placeRepo.delete).toHaveBeenCalled();
        expect(mediaRepo.delete).toHaveBeenCalled();
        expect(tripRepo.delete).toHaveBeenCalled();
        expect(inviteRepo.delete).toHaveBeenCalledWith({ inviterId: "user-1" });
        expect(notificationRepo.delete).toHaveBeenCalledWith({ userId: "user-1" });
        expect(settingRepo.delete).toHaveBeenCalledWith({ userId: "user-1" });
        expect(securityRepo.delete).toHaveBeenCalledWith({ userId: "user-1" });
        expect(userEntityRepo.delete).toHaveBeenCalledWith({ id: "user-1" });
    });
});
