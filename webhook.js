const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { parseListing } = require('./parser');

const app = express();
app.use(bodyParser.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/webhook', async (req, res) => {
    const data = req.body;

    // Check for Green API incoming message type
    if (data.typeWebhook === 'incomingMessageReceived') {
        const messageData = data.messageData;
        let rawText = '';
        let sender = data.senderData.sender; // e.g. "123456789@c.us"

        // Handle different message types (text, image with caption, etc.)
        if (messageData.typeMessage === 'textMessage') {
            rawText = messageData.textMessageData.textMessage;
        } else if (messageData.typeMessage === 'imageMessage') {
            rawText = messageData.imageMessageData.caption || '';
        } else if (messageData.typeMessage === 'extendedTextMessage') {
            rawText = messageData.extendedTextMessageData.text;
        }

        if (rawText) {
            try {
                // 1. Parse via Gemini (AI Prompt logic in parser.js)
                const parsed = await parseListing(rawText);

                // 2. Resolve Location (City & Neighborhood)
                const { data: neighborhoodId, error: locError } = await supabase
                    .rpc('resolve_location', { 
                        p_city_name: parsed.city, 
                        p_neighborhood_name: parsed.neighborhood 
                    });

                if (locError) throw locError;

                // 3. Resolve Broker
                let { data: broker } = await supabase
                    .from('brokers')
                    .select('id')
                    .eq('whatsapp_number', sender)
                    .single();

                if (!broker) {
                    const { data: newBroker } = await supabase
                        .from('brokers')
                        .insert({ whatsapp_number: sender, is_active: true, plan_type: 'normal' })
                        .select()
                        .single();
                    broker = newBroker;
                }

                // 4. Insert Listing
                const { error: insertError } = await supabase
                    .from('listings')
                    .insert({
                        broker_id: broker.id,
                        price_type: parsed.price_type,
                        price: parsed.price,
                        area: parsed.area,
                        neighborhood_id: neighborhoodId,
                        is_premium: parsed.is_premium,
                        raw_text: rawText,
                        clean_text: parsed.clean_text,
                        image_url: messageData.typeMessage === 'imageMessage' ? 'PENDING_UPLOAD' : null
                    });

                if (insertError) throw insertError;
                console.log('Green API message processed and saved.');

            } catch (err) {
                console.error('Error processing Green API message:', err);
            }
        }
    }

    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Webhook server listening on port ${PORT}`);
});

module.exports = app;
