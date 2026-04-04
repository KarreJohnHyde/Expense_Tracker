const AMT = '(?:Rs\\\\.?|INR|₹)\\\\s*([\\\\d,]+(?:\\\\.\\\\d{1,2})?)';
const patterns = [
  {
    label: 'SBI a/c credited',
    regex: new RegExp(
      `a\\\\/c\\\\s+no\\\\.?\\\\s*(?:[Xx*]+)(\\\\d{4})\\\\s+is\\\\s+credited\\\\s+(?:for|with|by)\\\\s+${AMT}`,
      'i'
    ),
    type: 'credit',
    amtGroup: 2,
    acctGroup: 1,
  }
];

const msg = 'Your a/c no. XXXXXXXX0206 is credited for Rs.600.00 on 02-04-2026 and debited from a/c no. XXXXXXXX1508 (UPI Ref no 645862177520) -CUB';

console.log(msg.match(patterns[0].regex));
