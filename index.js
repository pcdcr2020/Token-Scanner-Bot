const axios = require("axios");

// TELEGRAM (lo pondremos en Railway luego)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ALERTA
function sendAlert(msg) {
  axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: msg
  });
}

// FETCH DEXSCREENER
async function getTokens() {
  const res = await axios.get(
    "https://api.dexscreener.com/latest/dex/pairs/solana"
  );

  return res.data.pairs.map(p => ({
    symbol: p.baseToken.symbol,
    price: Number(p.priceUsd),
    volume1h: p.volume.h1 || 0,
    liquidity: p.liquidity.usd || 0,
    priceChange1h: p.priceChange.h1 || 0,
    age: (Date.now() - p.pairCreatedAt) / 60000
  }));
}

// RISK SIMPLE
function calculateRisk(token) {
  let risk = 0;

  if (token.liquidity < 20000) risk += 20;
  if (token.volume1h > 50000 && token.liquidity < 30000) risk += 15;

  return risk;
}

// SCORE
function scoreToken(token, risk) {
  let score = 0;

  if (token.volume1h > 100000) score += 25;
  else if (token.volume1h > 50000) score += 15;

  if (token.liquidity > 50000) score += 15;
  else if (token.liquidity > 20000) score += 5;

  if (token.priceChange1h > 10) score += 20;
  else if (token.priceChange1h > 5) score += 10;

  if (token.age < 120) score += 10;

  score -= risk;

  return score;
}

// LOOP
async function run() {
  try {
    const tokens = await getTokens();

    for (const token of tokens) {
      const risk = calculateRisk(token);
      const score = scoreToken(token, risk);

      if (score >= 70) {
        sendAlert(
          `🔥 ${token.symbol}\nScore: ${score}\nVol: ${token.volume1h}\nLiq: ${token.liquidity}\nΔ1h: ${token.priceChange1h}%`
        );
      }
    }
  } catch (e) {
    console.log(e.message);
  }
}

setInterval(run, 60000);
run();
