import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Créer un nouvel utilisateur dans PostgreSQL
   */
  async createUser(
    email: string,
    username: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      email,
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      isActive: true,
    });

    return this.userRepository.save(user);
  }

  /**
   * Trouver un utilisateur par email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  /**
   * Trouver un utilisateur par username
   */
  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  /**
   * Trouver un utilisateur par ID
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  /**
   * Obtenir tous les utilisateurs
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData);
    return this.findById(id);
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  /**
   * Vérifier si un email existe
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    return !!user;
  }

  /**
   * Vérifier si un username existe
   */
  async usernameExists(username: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    return !!user;
  }
}
