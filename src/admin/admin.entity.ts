import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('admins')
export class Admin {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar', { length: 255, unique: true })
    username: string;

    @Column('varchar', { length: 255 })
    password: string;

    @Column('varchar', { length: 255, nullable: true })
    nickname: string | null;

    @Column('varchar', { length: 255, nullable: true })
    hashedRefreshToken: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
