const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

/**
 * Handles the logic for blurring/hiding listing details if a broker is not active.
 * Manages subscription lead generation.
 */
async function processTeaserAndLeads(listingId, brokerId) {
    const { data: broker } = await supabase
        .from('brokers')
        .select('is_active, plan_type, whatsapp_number')
        .eq('id', brokerId)
        .single();

    if (!broker || !broker.is_active) {
        // Flag listing as teaser in some way or handle visibility in the query layer
        // For this logic, we'll record a potential lead to prompt the broker
        console.log(`Broker ${brokerId} is inactive. Listing ${listingId} is a teaser.`);
        
        return {
            is_teaser: true,
            message: "Subscribe to Miaz to reveal contact info and full details. Plans: Normal 120 SAR/mo, Premium 240 SAR/mo."
        };
    }

    return { is_teaser: false };
}

/**
 * Retrieves listings with premium brokers sorted to the top.
 */
async function getSortedListings() {
    const { data, error } = await supabase
        .from('listings')
        .select(`
            *,
            brokers!inner(plan_type, is_active)
        `)
        .eq('is_active', true)
        .order('brokers(plan_type)', { ascending: false }) // Premium (p) before Normal (n)
        .order('created_at', { ascending: false });

    return { data, error };
}

module.exports = { processTeaserAndLeads, getSortedListings };
