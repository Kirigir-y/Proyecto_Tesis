import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { Role } from "../enums/role.enum";

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    username: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({ type: 'enum', enum: Role, default: Role.TENS })
    role: Role;
}