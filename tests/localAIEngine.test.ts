import { describe, it, expect } from 'vitest';
import { processLocalAI, Expense } from '../src/lib/localAIEngine';

describe('localAIEngine', () => {
  const mockExpenses: Expense[] = [
    { id: '1', description: 'Groceries', amount: 50, category: 'Food', date: new Date().toISOString() },
    { id: '2', description: 'Uber', amount: 20, category: 'Transport', date: new Date().toISOString() },
  ];

  it('should process general greetings', () => {
    const result = processLocalAI('hello', mockExpenses);
    expect(result).toContain('Hello!');
    expect(result).toContain('AI CFO');
  });

  it('should calculate quick totals correctly', () => {
    const result = processLocalAI('how much spent', mockExpenses);
    expect(result).toContain('70'); // 50 + 20
  });

  it('should handle category queries', () => {
    const result = processLocalAI('how much on food', mockExpenses);
    expect(result).toContain('50');
  });
});
