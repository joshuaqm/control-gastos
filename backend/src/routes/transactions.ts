import { Router } from 'express';
import type { DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';

const router = Router();

// Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transactions = await transactionRepo.find({
      order: { date: 'DESC' },
      take: 100
    });
    res.json(transactions);
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Create a transaction
router.post('/', async (req, res) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transaction = transactionRepo.create(req.body as DeepPartial<Transaction>);
    await transactionRepo.save(transaction);
    
    logger.info(`Transaction created: ${transaction.id}`);
    res.status(201).json(transaction);
  } catch (error) {
    logger.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    const transactionRepo = AppDataSource.getRepository(Transaction);
    const transaction = await transactionRepo.findOne({
      where: { id: parseInt(req.params.id) }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

export { router as transactionsRouter };