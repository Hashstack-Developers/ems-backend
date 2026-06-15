import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { NoChangesException } from '../common/exceptions/no-changes.exception';
import { RbacService } from '../rbac/rbac.service';
import { User } from './entities/user.entity';

export interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  roleId: number;
}

export interface UpdateUserInput {
  email?: string;
  fullName?: string;
  roleId?: number;
  isActive?: boolean;
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly rbacService: RbacService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.findByIdWithRole(id);
  }

  private async findByIdWithRole(id: number): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { roleEntity: { permissions: true } },
    });
  }

  private async resolveRoleForAssignment(roleId: number) {
    const role = await this.rbacService.findRoleById(roleId);
    if (!role) {
      throw new BadRequestException('Invalid role');
    }
    return role;
  }

  private assignRole(user: User, role: NonNullable<Awaited<ReturnType<RbacService['findRoleById']>>>) {
    user.roleId = role.id;
    user.roleEntity = role;
  }

  async findAll(roleName?: string): Promise<User[]> {
    const query = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roleEntity', 'role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .orderBy('user.createdAt', 'DESC');

    if (roleName) {
      query.andWhere('role.name = :roleName', { roleName });
    }

    return query.getMany();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const role = await this.resolveRoleForAssignment(input.roleId);

    const hashedPassword = await bcrypt.hash(input.password, 10);
    const user = this.usersRepository.create({
      email: input.email,
      password: hashedPassword,
      fullName: input.fullName,
      roleId: role.id,
      roleEntity: role,
      isActive: true,
    });

    const saved = await this.usersRepository.save(user);
    return (await this.findByIdWithRole(saved.id)) ?? saved;
  }

  async updateUser(id: number, input: UpdateUserInput): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let hasChanges = false;

    if (input.email !== undefined && input.email !== user.email) {
      const existing = await this.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email is already registered');
      }
      user.email = input.email;
      hasChanges = true;
    }

    if (input.fullName !== undefined && input.fullName !== user.fullName) {
      user.fullName = input.fullName;
      hasChanges = true;
    }

    if (input.roleId !== undefined && input.roleId !== user.roleId) {
      const role = await this.resolveRoleForAssignment(input.roleId);
      this.assignRole(user, role);
      hasChanges = true;
    }

    if (input.isActive !== undefined && input.isActive !== user.isActive) {
      user.isActive = input.isActive;
      hasChanges = true;
    }

    if (input.password) {
      user.password = await bcrypt.hash(input.password, 10);
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new NoChangesException();
    }

    await this.usersRepository.save(user);
    return (await this.findByIdWithRole(id))!;
  }

  async deactivateUser(id: number): Promise<User> {
    return this.updateUser(id, { isActive: false });
  }

  async activateUser(id: number): Promise<User> {
    return this.updateUser(id, { isActive: true });
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.remove(user);
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updatePassword(id: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, { password: hashedPassword });
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      roleId: user.roleId,
      roleLabel: user.roleEntity?.label ?? user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
