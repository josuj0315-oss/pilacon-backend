import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('legal_documents')
export class LegalDocument {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    type: string; // 'terms' | 'privacy'

    @Column({ type: 'longtext' })
    content: string;

    @UpdateDateColumn()
    updatedAt: Date;
}
