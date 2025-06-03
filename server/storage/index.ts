import { UserStorage } from './UserStorage';
import { ItemStorage } from './ItemStorage';
import { type Item, type InsertItem, type User, type InsertUser } from "@shared/schema";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
  subscriptionType?: "free" | "pro";
  stripeCustomerId?: string;
}

export interface IStorage {
  // User operations
  getUserByFirebaseId(firebaseId: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(firebaseId: string, data: UpdateUserData): Promise<User>;

  // Item operations
  getItemsByUserId(userId: string): Promise<Item[]>;
  createItem(item: InsertItem): Promise<Item>;
  deleteItem(id: number): Promise<void>;
}

export class PostgresStorage implements IStorage {
  private userStorage: UserStorage;
  private itemStorage: ItemStorage;

  constructor() {
    this.userStorage = new UserStorage();
    this.itemStorage = new ItemStorage();
  }

  // User operations
  async getUserByFirebaseId(firebaseId: string): Promise<User | undefined> {
    return this.userStorage.getUserByFirebaseId(firebaseId);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userStorage.getUserByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.userStorage.createUser(user);
  }

  async updateUser(firebaseId: string, data: UpdateUserData): Promise<User> {
    return this.userStorage.updateUser(firebaseId, data);
  }

  // Item operations
  async getItemsByUserId(userId: string): Promise<Item[]> {
    return this.itemStorage.getItemsByUserId(userId);
  }

  async createItem(item: InsertItem): Promise<Item> {
    return this.itemStorage.createItem(item);
  }

  async deleteItem(id: number): Promise<void> {
    return this.itemStorage.deleteItem(id);
  }
}

export const storage = new PostgresStorage();
export { UpdateUserData };