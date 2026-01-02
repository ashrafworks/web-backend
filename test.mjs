import bcrypt from 'bcrypt';
// console.log(process.env.NODE_ENV);
const result = await bcrypt.hash('useruser', 10);
console.log(result);