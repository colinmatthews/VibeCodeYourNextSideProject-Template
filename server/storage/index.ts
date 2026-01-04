import { UserStorage } from './UserStorage';
import { ItemStorage } from './ItemStorage';
import { FileStorage } from './FileStorage';
import { type Item, type InsertItem, type ItemStatus, type User, type InsertUser, type File, type InsertFile } from "@shared/schema";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
  subscriptionType?: "free" | "pro";
  stripeCustomerId?: string;
}

export interface IStorage {
  // User operations
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: UpdateUserData): Promise<User>;

  // Item operations
  getItemsByUserId(userId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  updateItemStatus(id: number, status: ItemStatus): Promise<Item>;
  deleteItem(id: number): Promise<void>;

  // File operations
  getFilesByUserId(userId: string): Promise<File[]>;
  getFileById(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  deleteFile(id: number): Promise<void>;
  getFileByPath(path: string): Promise<File | undefined>;
}

export class PostgresStorage implements IStorage {
  private userStorage: UserStorage;
  private itemStorage: ItemStorage;
  private fileStorage: FileStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.itemStorage = new ItemStorage();
    this.fileStorage = new FileStorage();
  }

  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    return this.userStorage.getUserById(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.userStorage.createUser(user);
  }

  async upsertUser(user: InsertUser): Promise<User> {
    return this.userStorage.upsertUser(user);
  }

  async updateUser(id: string, data: UpdateUserData): Promise<User> {
    return this.userStorage.updateUser(id, data);
  }

  // Item operations
  async getItemsByUserId(userId: string): Promise<Item[]> {
    return this.itemStorage.getItemsByUserId(userId);
  }

  async createItem(item: InsertItem): Promise<Item> {
    return this.itemStorage.createItem(item);
  }

  async updateItemStatus(id: number, status: ItemStatus): Promise<Item> {
    return this.itemStorage.updateItemStatus(id, status);
  }

  async deleteItem(id: number): Promise<void> {
    return this.itemStorage.deleteItem(id);
  }

  // File operations
  async getFilesByUserId(userId: string): Promise<File[]> {
    return this.fileStorage.getFilesByUserId(userId);
  }

  async getFileById(id: number): Promise<File | undefined> {
    return this.fileStorage.getFileById(id);
  }

  async createFile(file: InsertFile): Promise<File> {
    return this.fileStorage.createFile(file);
  }

  async deleteFile(id: number): Promise<void> {
    return this.fileStorage.deleteFile(id);
  }

  async getFileByPath(path: string): Promise<File | undefined> {
    return this.fileStorage.getFileByPath(path);
  }

 }

export const storage = new PostgresStorage();
export { UpdateUserData };
