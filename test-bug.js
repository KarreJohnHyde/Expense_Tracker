import * as parser from './src/app/lib/smsPatterns.js'; // Wait, it's TS... let's just write pure JS code.
const fs = require('fs');
const content = fs.readFileSync('./src/app/lib/smsPatterns.ts', 'utf8');

const tsc = require('typescript');
const js = tsc.transpile(content);
eval(js);

const msg = 'Your a/c no. XXXXXXXX0206 is credited for Rs.600.00 on 02-04-2026 and debited from a/c no. XXXXXXXX1508 (UPI Ref no 645862177520) -CUB';
console.log(parseMultipleSMS(msg));
