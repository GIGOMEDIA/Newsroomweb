export default async function handler(req, res) {
  const endpoint = req.query.endpoint || "top-headlines";

  const url = `https://gnews.io/api/v4/${endpoint}?token=${process.env.GNEWS_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch news" });
  }
}