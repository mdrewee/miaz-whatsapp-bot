const PROMPT = `
Extract Saudi real estate listing details from the following message.
Identify the city and neighborhood. 
Terms to look for:
- Price type: 'سوم' (sum) or 'حد' (hadd).
- Listing types: 'دبلكس' (Duplex), 'مباشر' (Direct).
- Cities: Riyadh, Jeddah, Dammam, Al-Ahsa, etc.

Return a JSON object:
{
  "city": "string",
  "neighborhood": "string",
  "price_type": "sum" | "hadd",
  "price": number,
  "area": number,
  "is_premium": boolean,
  "clean_text": "string"
}
`;

async function parseListing(text) {
    // This is a placeholder for the actual Gemini/AI call.
    // Integration would involve calling the Gemini API with the PROMPT and text.
    console.log("Parsing text:", text);
    
    // Mocking response for structure illustration
    return {
        city: "Riyadh",
        neighborhood: "Al-Malqa",
        price_type: text.includes('سوم') ? 'sum' : 'hadd',
        price: 1500000,
        area: 300,
        is_premium: false,
        clean_text: text.trim()
    };
}

module.exports = { parseListing };
