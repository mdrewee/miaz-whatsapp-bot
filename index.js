require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('whatsapp-web.js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const client = new Client();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

client.initialize();
