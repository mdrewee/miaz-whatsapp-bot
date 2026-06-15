const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { parseListing } = require('./parser');
const { processTeaserAndLeads } = require('./teaser');

const app = express();
app.use(bodyParser.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.post('/webhook', async (req, res) => {
    const data = req.body;

    if (data.typeWebhook === 'incomingMessageReceived') {
        const messageData = data.messageData;
        let rawText = '';
        let sender = data.senderData.sender;

        if (messageData.typeMessage === 'textMessage') {
            rawText = messageData.textMessageData.textMessage;
        } else if (messageData.typeMessage === 'imageMessage') {
            rawText = messageData.imageMessageData.caption || '';
        } else if (messageData.typeMessage === 'extendedTextMessage') {
            rawText = messageData.extendedTextMessageData.text;
        }

        if (rawText) {
            try {
                const parsed = await parseListing(rawText);

                const { data: neighborhoodId, error: locError } = await supabase
                    .rpc('resolve_location', { 
                        p_city_name: parsed.city, 
                        p_neighborhood_name: parsed.neighborhood 
                    });

                if (locError) throw locError;

                let { data: broker } = await supabase
                    .from('brokers')
                    .select('id, is_active')
                    .eq('whatsapp_number', sender)
                    .single();

                if (!broker) {
                    const { data: newBroker } = await supabase
                        .from('brokers')
                        .insert({ whatsapp_number: sender, is_active: false, plan_type: 'normal' })
                        .select()
                        .single();
                    broker = newBroker;
                }

                const { data: listing, error: insertError } = await supabase
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
                        is_active: true
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Teaser Logic: Check broker status and handle leads
                const teaserResult = await processTeaserAndLeads(listing.id, broker.id);
                if (teaserResult.is_teaser) {
                    console.log(`Listing ${listing.id} saved as teaser. Notification sent to broker.`);
                }

                console.log('Processed message successfully.');
            } catch (err) {
                console.error('Error processing message:', err);
            }
        }
    }

    res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
