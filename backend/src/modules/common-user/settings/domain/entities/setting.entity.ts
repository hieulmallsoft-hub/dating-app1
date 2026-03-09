import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm";
import { User } from "../../../user/domain/entities/user.entity";

@Entity("settings")
export class Setting {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @OneToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column()
    userId: string;

    @Column({ default: true })
    notificationEnabled: boolean;

    @Column({ default: "light" })
    theme: string;

    @Column({ default: "public" })
    privacy: string;

    @UpdateDateColumn()
    updatedAt: Date;
}
