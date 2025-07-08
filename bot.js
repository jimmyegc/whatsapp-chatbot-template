// bot.js
require('dotenv').config();  // Carga variables de entorno desde .env
console.log('🔑 OPENROUTER_API_KEY ≔', process.env.OPENROUTER_API_KEY);


const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode           = require('qrcode-terminal');
const OpenAI           = require('openai');

// Verifica que la API key de OpenRouter esté cargada
console.log(
  '🔑 OpenRouter API Key:',
  process.env.OPENROUTER_API_KEY
    ? process.env.OPENROUTER_API_KEY.slice(0, 5) + '…'
    : 'NO DEFINIDA'
);

// Cliente de OpenAI apuntando a OpenRouter / DeepSeek
const openai = new OpenAI({
  apiKey:   process.env.OPENROUTER_API_KEY,
  baseURL:  'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://tu-sitio.com',  // opcional
    'X-Title':      'ConfiguroWebBot'         // opcional
  }
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: process.env.CHROME_PATH,  // define en .env si usas Chrome real
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Genera y muestra el QR en consola la primera vez
client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot listo');
});

client.on('message', async msg => {
  // Ignora mensajes propios y de grupos
  if (msg.fromMe || msg.from.endsWith('@g.us')) return;

  // Acorta mensajes excesivamente largos
  const userText = msg.body.length > 2000
    ? msg.body.slice(0, 2000) + '...'
    : msg.body;

  // Indicador "escribiendo..." y reacción de reloj de arena
  try {
    await client.sendPresenceAvailable();
    try { await msg.react('⌛'); } catch {}
  } catch {}

  try {
    // Llamada a DeepSeek vía OpenRouter
    const completion = await openai.chat.completions.create({
      model:      'deepseek/deepseek-r1:free',
      messages: [
        { role: 'system', content: 'Eres un asistente útil y amigable.' },
        { role: 'user',   content: userText }
      ],
      temperature: 0.7,
      max_tokens:  500
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    if (reply) {
      await msg.reply(reply);
    } else {
      await msg.reply('Lo siento, no pude generar una respuesta.');
    }
  } catch (err) {
    console.error('❌ Error al procesar mensaje:', err);
    try { await msg.reply('⚠️ Hubo un error. Intenta nuevamente más tarde.'); } catch {}
  } finally {
    // Quita la reacción de reloj
    try { await msg.removeReaction('⌛'); } catch {}
  }
});

client.initialize();