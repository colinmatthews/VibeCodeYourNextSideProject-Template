import { UserStorage } from './UserStorage';
import { ItemStorage } from './ItemStorage';
import { FileStorage } from './FileStorage';
import { type Item, type InsertItem, type ItemStatus, type User, type InsertUser, type File, type InsertFile, type AiThread, type InsertAiThread, type AiMessage, type InsertAiMessage } from "@shared/schema";

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  emailNotifications?: boolean;
  subscriptionType?: "free" | "pro";
  stripeCustomerId?: string;
}

interface UpdateThreadData {
  title?: string;
  archived?: boolean;
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
  updateItemStatus(id: number, status: ItemStatus): Promise<Item>;
  deleteItem(id: number): Promise<void>;

  // File operations
  getFilesByUserId(userId: string): Promise<File[]>;
  getFileById(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  deleteFile(id: number): Promise<void>;
  getFileByPath(path: string): Promise<File | undefined>;

  // Thread operations
  getThreadsByUserId(userId: string): Promise<AiThread[]>;
  getActiveThreadsByUserId(userId: string): Promise<AiThread[]>;
  getArchivedThreadsByUserId(userId: string): Promise<AiThread[]>;
  getThreadById(id: string): Promise<AiThread | undefined>;
  getThreadByIdAndUserId(id: string, userId: string): Promise<AiThread | undefined>;
  createThread(thread: InsertAiThread): Promise<AiThread>;
  updateThread(id: string, userId: string, data: UpdateThreadData): Promise<AiThread | undefined>;
  deleteThread(id: string, userId: string): Promise<void>;

  // Message operations
  getMessagesByThreadId(threadId: string): Promise<AiMessage[]>;
  getMessageById(id: string): Promise<AiMessage | undefined>;
  createMessage(message: InsertAiMessage): Promise<AiMessage>;
  createMessages(messages: InsertAiMessage[]): Promise<AiMessage[]>;
  messageExistsByContent(threadId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<boolean>;
  deleteMessage(id: string): Promise<void>;
  deleteMessagesByThreadId(threadId: string): Promise<void>;
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
export { UpdateUserData, UpdateThreadData };
