const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// ===== قیمت لحظه‌ای (با CoinGecko) =====
app.get('/api/price/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        // تبدیل نام ارز به فرمت CoinGecko
        const idMap = {
            'BTCUSDT': 'bitcoin',
            'ETHUSDT': 'ethereum',
            'BNBUSDT': 'binancecoin',
            'XRPUSDT': 'ripple',
            'ADAUSDT': 'cardano',
            'DOGEUSDT': 'dogecoin',
            'SOLUSDT': 'solana',
            'DOTUSDT': 'polkadot'
        };
        const coinId = idMap[symbol] || 'bitcoin';
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
        const data = await response.json();
        const price = data[coinId]?.usd;
        if (!price) {
            return res.status(404).json({ error: 'ارز نامعتبر' });
        }
        res.json({ symbol, price: price.toString() });
    } catch (error) {
        console.error('Price Error:', error.message);
        res.status(500).json({ error: 'خطا در دریافت قیمت' });
    }
});

// ===== داده‌های کندل (با CoinGecko - تاریخچه قیمت) =====
app.get('/api/klines/:symbol', async (req, res) => {
    try {
        const symbol = req.params.symbol.toUpperCase();
        const idMap = {
            'BTCUSDT': 'bitcoin',
            'ETHUSDT': 'ethereum',
            'BNBUSDT': 'binancecoin',
            'XRPUSDT': 'ripple',
            'ADAUSDT': 'cardano',
            'DOGEUSDT': 'dogecoin',
            'SOLUSDT': 'solana',
            'DOTUSDT': 'polkadot'
        };
        const coinId = idMap[symbol] || 'bitcoin';
        const limit = req.query.limit || 60;
        // CoinGecko تاریخچه قیمت روزانه را برمی‌گرداند
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${Math.ceil(limit/24)}`);
        const data = await response.json();
        if (!data.prices || data.prices.length === 0) {
            return res.status(404).json({ error: 'داده‌ای موجود نیست' });
        }
        // تبدیل به فرمت کندل (شبیه‌سازی)
        const prices = data.prices.map(p => ({ 
            time: p[0], 
            open: p[1], 
            high: p[1] * 1.01, 
            low: p[1] * 0.99, 
            close: p[1] 
        }));
        // اگر تعداد داده‌ها کمتر از limit بود، تکرار می‌کنیم
        while (prices.length < limit) {
            const last = prices[prices.length-1];
            prices.push({ 
                time: last.time + 3600000, 
                open: last.close, 
                high: last.close * 1.005, 
                low: last.close * 0.995, 
                close: last.close * (1 + (Math.random()-0.5)*0.01) 
            });
        }
        res.json(prices.slice(-limit));
    } catch (error) {
        console.error('Klines Error:', error.message);
        res.status(500).json({ error: 'خطا در دریافت کندل‌ها' });
    }
});

// ===== هوش مصنوعی (GitHub Models) =====
app.post('/api/ai', async (req, res) => {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return res.status(500).json({ error: 'GITHUB_TOKEN تنظیم نشده' });
        }
        const { model, messages, temperature, max_tokens } = req.body;
        const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model, messages, temperature, max_tokens })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AI Error:', error.message);
        res.status(500).json({ error: 'خطا در ارتباط با هوش مصنوعی' });
    }
});

// ===== لیست مدل‌های گیت‌هاب =====
app.get('/api/models', async (req, res) => {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            return res.status(500).json({ error: 'GITHUB_TOKEN تنظیم نشده' });
        }
        const response = await fetch('https://models.github.ai/catalog/models', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json'
            }
        });
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Models List Error:', error.message);
        res.status(500).json({ error: 'خطا در دریافت لیست مدل‌ها' });
    }
});

// ===== نمایش فایل‌های ظاهری =====
app.use(express.static(path.join(__dirname, '../public')));

module.exports = app;
