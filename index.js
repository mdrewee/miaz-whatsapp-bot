require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('whatsapp-web.js');
const { parseListing } = require('./parser');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const client = new Client();

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('message', async msg => {
    // Process messages from potential brokers
    if (msg.from.endsWith('@c.us')) {
        try {
            const parsed = await parseListing(msg.body);
            
            // 1. Resolve Location (City & Neighborhood)
            const { data: neighborhoodId, error: locError } = await supabase
                .rpc('resolve_location', { 
                    p_city_name: parsed.city, 
                    p_neighborhood_name: parsed.neighborhood 
                });

            if (locError) throw locError;

            // 2. Resolve/Get Broker ID (assuming number is the unique ID)
            let { data: broker } = await supabase
                .from('brokers')
                .select('id')
                .eq('whatsapp_number', msg.from)
                .single();

            if (!broker) {
                const { data: newBroker } = await supabase
                    .from('brokers')
                    .insert({ whatsapp_number: msg.from, is_active: true, plan_type: 'normal' })
                    .select()
                    .single();
                broker = newBroker;
            }

            // 3. Insert Listing
            const { error: insertError } = await supabase
                .from('listings')
                .insert({
                    broker_id: broker.id,
                    price_type: parsed.price_type,
                    price: parsed.price,
                    area: parsed.area,
                    neighborhood_id: neighborhoodId,
                    is_premium: parsed.is_premium,
                    raw_text: msg.body,
                    clean_text: parsed.clean_text
                });

            if (insertError) throw insertError;

            console.log('Listing processed and saved.');
        } catch (err) {
            console.error('Error processing listing:', err);
        }
    }
});

client.initialize();
