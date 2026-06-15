import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn
} from "typeorm";

export type RoutePoint = {
    lat: number;
    lng: number;
};

@Index(["userId", "startTime"])
@Index(["coupleId", "startTime"])
@Entity("trips")
export class Trip {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "uuid" })
    userId: string;

    @Column({ type: "uuid" })
    coupleId: string;

    @Column({ type: "timestamp" })
    startTime: Date;

    @Column({ type: "timestamp" })
    endTime: Date;

    @Column({ type: "double precision", default: 0 })
    distanceKm: number;

    @Column({ type: "text", nullable: true })
    startAddress: string | null;

    @Column({ type: "text", nullable: true })
    endAddress: string | null;

    @Column({ type: "jsonb", nullable: true })
    routePreview: RoutePoint[] | null;

    @Column({ type: "jsonb", nullable: true, select: false })
    routeFull: RoutePoint[] | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
