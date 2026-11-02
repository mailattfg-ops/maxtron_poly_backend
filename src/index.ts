// Maxtron Backend Entry Point
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import maxtronRoutes from './modules/maxtron/routes';
import { supabase } from './config/supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 5004;

// Optimized CORS for Vercel & Local Dev
app.use(cors({
    origin: (origin, callback) => {
        // Allow all origins for debugging and ease of use with the branch deployments
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Main App API Routes
app.use('/api/auth', authRoutes); // Auth is Global

// Maxtron Module Routes
app.use('/api/maxtron', maxtronRoutes);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Maxtron ERP Backend is healthy' });
});

// Keep-alive route for Supabase (prevents pausing on free tier)
app.get('/api/keep-alive', async (req, res) => {
    try {
        const { data, error } = await supabase.from('companies').select('id').limit(1);
        if (error) throw error;
        res.json({ success: true, message: 'Supabase is active', data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Diagnostic Route (Check Env Vars without exposing them)
app.get('/api/verify', (req, res) => {
    res.json({
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!(process.env.SUPABASE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY),
        jwt_secret: !!process.env.JWT_SECRET,
        node_env: process.env.NODE_ENV,
        vercel: !!process.env.VERCEL
    });
});

// Catch-all for undefined API routes (ensures JSON response instead of HTML)
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found on this server` });
});

// Local Development Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Maxtron Backend running on port ${port}`);
    });
}

export default app;
