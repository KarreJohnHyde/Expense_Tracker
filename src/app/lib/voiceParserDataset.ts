export interface VoiceParserTestCase {
  utterance: string;
  expected: {
    amount?: string;
    category?: string;
    paymentMethod?: string;
  };
}

export const VOICE_TRAINING_PHRASES: Record<string, string[]> = {
  'Food & Dining': [
    'Spent 450 on lunch at office canteen',
    'Paid 799 for dinner at dominos',
    'Gave 120 for chai and snacks',
    'Swiggy order 620 via gpay',
  ],
  'Transportation': [
    'Paid 300 for uber ride',
    'Spent 1200 on petrol',
    'Metro recharge 500',
    'Auto fare 180 cash',
  ],
  'Shopping': [
    'Bought shoes for 2999 on myntra',
    'Amazon order 1599',
    'Purchased headphones worth 2499',
    'Mall shopping 4200',
  ],
  'Bills & Utilities': [
    'Paid electricity bill 1850',
    'Internet bill 999 by card',
    'Mobile recharge 399',
    'Rent paid 22000',
  ],
  'Entertainment': [
    'Movie tickets 650 via upi',
    'Netflix subscription 649',
    'Game purchase 1200',
    'Concert pass 1800',
  ],
  'Healthcare': [
    'Pharmacy expense 780',
    'Doctor consultation 1200',
    'Gym membership 2500',
    'Medical test 1800',
  ],
  'Education': [
    'Udemy course 499',
    'Book purchase 850',
    'Exam fee 2200',
    'Tuition payment 3000',
  ],
  'Investments & Savings': [
    'Bought BTC for 5000',
    'SIP investment 3000',
    'Stock buy 12000',
    'Mutual fund purchase 2500',
  ],
  'Travel & Holidays': [
    'Hotel booking 6500',
    'Flight ticket 8200',
    'Trip expense 12000',
    'Cab to airport 950',
  ],
};

export const VOICE_TEST_CASES: VoiceParserTestCase[] = [
  { utterance: 'Spent 450 on groceries via UPI yesterday', expected: { amount: '450', category: 'Food & Dining', paymentMethod: 'UPI' } },
  { utterance: 'Paid Rs 1800 electricity bill by net banking', expected: { amount: '1800', category: 'Bills & Utilities', paymentMethod: 'Net Banking' } },
  { utterance: 'Bought 2,499 shoes on credit card', expected: { amount: '2499', category: 'Shopping', paymentMethod: 'Credit Card' } },
  { utterance: 'Uber ride cost 320 cash', expected: { amount: '320', category: 'Transportation', paymentMethod: 'Cash' } },
  { utterance: 'Invested 5000 in bitcoin from wallet', expected: { amount: '5000', category: 'Investments & Savings', paymentMethod: 'Wallet' } },
  { utterance: 'Paid 1.5k for gym membership', expected: { amount: '1500', category: 'Healthcare' } },
  { utterance: 'Movie tickets 750 with debit card', expected: { amount: '750', category: 'Entertainment', paymentMethod: 'Debit Card' } },
  { utterance: 'Hotel booking 6k using credit card', expected: { amount: '6000', category: 'Travel & Holidays', paymentMethod: 'Credit Card' } },
  { utterance: 'Course fee 3200 via bank transfer', expected: { amount: '3200', category: 'Education', paymentMethod: 'Net Banking' } },
  { utterance: 'SIP investment of 3k today', expected: { amount: '3000', category: 'Investments & Savings' } },
];
