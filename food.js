import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import cron from 'node-cron';

const cache = new NodeCache();

dotenv.config();

const FoodSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    image: String,
    category: { type: String, enum: ['veg', 'non-veg', 'dessert'] }
});

const OrderSchema = new mongoose.Schema({
    foodId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    orderId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'completed', 'canceled'] },
    userAddressId: String,
    paymentMode: { type: String, enum: ['cash', 'card', 'UPI'] }
});

const Food = mongoose.model('Food', FoodSchema);
const Order = mongoose.model('Order', OrderSchema);

const app = express();

mongoose.connect('mongodb+srv://Food:LWOxfaAXVdTdqtbf@cluster0.quulguw.mongodb.net/');

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error'));

db.once('open', () => {
    console.log('MongoDB connected');
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// CRUD operations for Food

// Endpoint for creating food
app.post('/api/food', async (req, res) => {
    try {
        const { name, description, price, image, category } = req.body;
        const newFood = new Food({ name, description, price, image, category });
        const savedFood = await newFood.save();
        res.json(savedFood);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint for retrieving all foods
app.get('/api/food', async (req, res) => {
    try {
        const foods = await Food.find();
        res.json(foods);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Implement endpoint for placing orders
app.post('/api/order', async (req, res) => {
    try {
        const { foodId, userId, orderId, userAddressId, paymentMode } = req.body;
        const newOrder = new Order({ foodId, userId, orderId, userAddressId, paymentMode });
        const savedOrder = await newOrder.save();
        res.json(savedOrder);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Node-Cron job for order cancellation
cron.schedule('*/20 * * * *', async () => {
    try {
        // Logic to cancel orders if OTP confirmation isn't completed within 20 minutes
        const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
        await Order.updateMany(
            { status: 'pending', createdAt: { $lte: twentyMinutesAgo } },
            { $set: { status: 'canceled' } }
        );
    } catch (error) {
        console.error('Error in order cancellation cron job:', error);
    }
});

app.listen(3000, () => {
    console.log(`Server running on port ${3000}`);
});
