import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.model('User', UserSchema);
        
        const count = await User.countDocuments();
        console.log(`Total users in database: ${count}`);
        
        if (count > 0) {
            const users = await User.find({}, 'email name').limit(5);
            console.log('Recent users:');
            users.forEach(u => console.log(`- ${u.email} (${u.name || 'No Name'})`));
        }
        
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkUsers();
