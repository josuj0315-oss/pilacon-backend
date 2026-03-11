import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcryptjs';
import { UnauthorizedException, ConflictException } from '@nestjs/common';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
    ) { }

    async validateUser(details: any) {
        let user = await this.userRepository.findOneBy({
            socialId: details.socialId,
            provider: details.provider,
        });

        if (user) {
            // Update info if changed
            user.name = details.name;
            user.email = details.email;
            await this.userRepository.save(user);
            return user;
        }

        const newUser = this.userRepository.create({
            ...details,
            nickname: details.name, // Use name as nickname for social login
        });
        return this.userRepository.save(newUser);
    }

    async signup(details: any) {
        const { username, password, nickname, name, email, phone, marketingAgree } = details;

        const existingUser = await this.userRepository.findOneBy({ username });
        if (existingUser) {
            throw new ConflictException('이미 사용 중인 아이디입니다.');
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = this.userRepository.create({
            username,
            password: hashedPassword,
            nickname,
            name,
            email,
            phone,
            marketingAgree: !!marketingAgree,
            provider: 'local',
        });

        return this.userRepository.save(newUser);
    }

    async login(details: any) {
        const { username, password } = details;
        const user = await this.userRepository.findOneBy({ username });

        if (!user || !user.password) {
            throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        const isPasswordMatching = await bcrypt.compare(password, user.password);
        if (!isPasswordMatching) {
            throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
        }

        return user;
    }

    generateJwt(user: User) {
        const payload = { sub: user.id, socialId: user.socialId, name: user.name, provider: user.provider };
        return this.jwtService.sign(payload);
    }

    async findUserById(id: number) {
        return this.userRepository.findOneBy({ id });
    }

    async updateProfile(userId: number, updateData: any) {
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new UnauthorizedException('사용자를 찾을 수 없습니다.');
        }

        if (updateData.nickname !== undefined) user.nickname = updateData.nickname;
        if (updateData.email !== undefined) user.email = updateData.email;
        if (updateData.profileImage !== undefined) user.profileImage = updateData.profileImage;

        return this.userRepository.save(user);
    }

    async checkNickname(nickname: string) {
        const user = await this.userRepository.findOneBy({ nickname });
        return { available: !user };
    }

    async checkUsername(username: string) {
        const user = await this.userRepository.findOneBy({ username });
        return { available: !user };
    }
}
