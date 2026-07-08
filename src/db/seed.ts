import { db } from './index'
import { seedNeuTrong } from './seed-core'

// index.ts đã tự gọi seedNeuTrong khi khởi động; script này để chạy seed thủ công (npm run db:seed).
seedNeuTrong(db)
console.log('Seed hoàn tất.')
