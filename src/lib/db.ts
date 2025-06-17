'use server';

import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';
import type { User, UserRole } from '@/types';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs'; // Import the fs module

let db: Database | null = null;

const DB_DIR = path.join(process.cwd(), 'db');
const DB_PATH = path.join(DB_DIR, 'nationquest_hub.db');

export async function getDbConnection() {
  if (db) {
    return db;
  }

  // Ensure the db directory exists
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      hashedPassword TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar TEXT
    );
  `);
  
  const adminUser = await db.get('SELECT * FROM users WHERE email = ?', 'admin@nationquest.com');
  if (!adminUser) {
    const defaultAdminUUID = uuidv4();
    const defaultAdminPassword = await bcrypt.hash('adminpassword', 10);
    await db.run(
      'INSERT INTO users (uuid, name, email, hashedPassword, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      defaultAdminUUID,
      'Admin User',
      'admin@nationquest.com',
      defaultAdminPassword,
      'admin',
      `https://placehold.co/100x100.png?text=AU`
    );
  }

  const memberUser = await db.get('SELECT * FROM users WHERE email = ?', 'member@nationquest.com');
  if (!memberUser) {
    const defaultMemberUUID = uuidv4();
    const defaultMemberPassword = await bcrypt.hash('memberpassword', 10);
    await db.run(
      'INSERT INTO users (uuid, name, email, hashedPassword, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
      defaultMemberUUID,
      'Member User',
      'member@nationquest.com',
      defaultMemberPassword,
      'member',
      `https://placehold.co/100x100.png?text=MU`
    );
  }

  return db;
}

export async function createUser(name: string, email: string, password: string, role: UserRole = 'member'): Promise<Omit<User, 'passwordHash'>> {
  const connection = await getDbConnection();
  const hashedPassword = await bcrypt.hash(password, 10);
  const userUuid = uuidv4();
  const avatar = `https://placehold.co/100x100.png?text=${name.substring(0,2).toUpperCase()}`;

  const result = await connection.run(
    'INSERT INTO users (uuid, name, email, hashedPassword, role, avatar) VALUES (?, ?, ?, ?, ?, ?)',
    userUuid,
    name,
    email,
    hashedPassword,
    role,
    avatar
  );

  if (!result.lastID) {
    throw new Error('User creation failed: No ID returned.');
  }

  return {
    id: result.lastID.toString(),
    uuid: userUuid,
    name,
    email,
    role,
    avatar,
  };
}

export async function getUserByEmail(email: string): Promise<(User & { hashedPassword?: string }) | null> {
  const connection = await getDbConnection();
  const userRow = await connection.get<User & { hashedPassword?: string }>(
    'SELECT id, uuid, name, email, hashedPassword, role, avatar FROM users WHERE email = ?',
    email
  );
  if (!userRow) return null;
  return { ...userRow, id: userRow.id.toString() };
}

export async function getUserById(id: string): Promise<User | null> {
  const connection = await getDbConnection();
  const userRow = await connection.get<User>(
    'SELECT id, uuid, name, email, role, avatar FROM users WHERE id = ?',
    id
  );
  if (!userRow) return null;
  return { ...userRow, id: userRow.id.toString() };
}

export async function getUserByUuid(uuid: string): Promise<(User & { hashedPassword?: string }) | null> {
  const connection = await getDbConnection();
  const userRow = await connection.get<(User & { hashedPassword?: string })>(
    'SELECT id, uuid, name, email, hashedPassword, role, avatar FROM users WHERE uuid = ?',
    uuid
  );
  if (!userRow) return null;
  return { ...userRow, id: userRow.id.toString() };
}


export async function updateUserProfile(uuid: string, name: string, email: string): Promise<User | null> {
  const connection = await getDbConnection();
  
  const existingUserWithEmail = await connection.get('SELECT uuid FROM users WHERE email = ? AND uuid != ?', email, uuid);
  if (existingUserWithEmail) {
    throw new Error('Email is already in use by another account.');
  }

  const result = await connection.run(
    'UPDATE users SET name = ?, email = ? WHERE uuid = ?',
    name,
    email,
    uuid
  );

  if (result.changes === 0) {
    throw new Error('User not found or no changes made.');
  }
  
  // Fetch the updated user, excluding the hashedPassword
  const updatedUser = await connection.get<User>(
    'SELECT id, uuid, name, email, role, avatar FROM users WHERE uuid = ?',
    uuid
  );
  if (!updatedUser) return null;
  return { ...updatedUser, id: updatedUser.id.toString() };
}