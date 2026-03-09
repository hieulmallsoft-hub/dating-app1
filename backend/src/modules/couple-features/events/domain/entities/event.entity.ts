import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { User } from "../../../../common-user/user/domain/entities/user.entity";
import { Couple } from "../../../couple/domain/entities/couple.entity";

@Entity("events")
export class Event {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    title: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "timestamp" })
    date: Date;

    @Column({ default: false })
    isAnniversary: boolean;

    @ManyToOne(() => Couple)
    @JoinColumn({ name: "coupleId" })
    couple: Couple;

    @Column()
    coupleId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: "creatorId" })
    creator: User;

    @Column()
    creatorId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}



