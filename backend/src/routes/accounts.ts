import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Account } from '../models/Account';
import { logger } from '../utils/logger';

const router = Router();

// Get all accounts
router.get('/', async (req, res) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const accounts = await accountRepo.find({
      where: { is_active: true }
    });
    res.json(accounts);
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Create an account
router.post('/', async (req, res) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const account = accountRepo.create(req.body as DeepPartial<Account>);
    await accountRepo.save(account);
    
    logger.info(`Account created: ${account.name}`);
    res.status(201).json(account);
  } catch (error) {
    logger.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get account by ID
router.get('/:id', async (req, res) => {
  try {
    const accountRepo = AppDataSource.getRepository(Account);
    const account = await accountRepo.findOne({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(account);
  } catch (error) {
    logger.error('Error fetching account:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

export { router as accountsRouter };