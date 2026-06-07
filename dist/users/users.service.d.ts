import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: Repository<User>);
    findByEmail(email: string): Promise<User | null>;
    findById(id: number): Promise<User | null>;
    createAdmin(email: string, password: string, fullName: string): Promise<User>;
    validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    updatePassword(id: number, newPassword: string): Promise<void>;
}
