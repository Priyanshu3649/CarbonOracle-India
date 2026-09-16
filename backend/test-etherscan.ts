import dotenv from 'dotenv';
dotenv.config();
const key = process.env.ETHERSCAN_API_KEY;
console.log("Key:", key);
fetch(`https://api.etherscan.io/v2/api?chainid=80002&module=proxy&action=eth_blockNumber&apikey=${key}`)
  .then(r => r.json())
  .then(console.log);
