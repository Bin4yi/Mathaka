// Downloads the openly licensed Wikimedia Commons photos used in the video + writes credits.json
import fs from 'node:fs';
const files = {
  organizer: 'File:Pill Organizer With Vitamins And Medicines.jpg',
  ammama: 'File:Ammama (grandmother).jpg',
  generations: 'File:Three generations.jpg',
  palm: 'File:Ibuprofen tablets in palm of hand.jpg',
  pill2: 'File:Pill 2.jpg',
  pills: 'File:Pills.JPG',
  esp32: 'File:ESP32 Dev Board.jpg',
};
const UA = { 'User-Agent': 'MathakaPromo/1.0 (open-source student project)' };
const credits = [];
for (const [key, title] of Object.entries(files)) {
  const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1920`;
  const j = await (await fetch(u, { headers: UA })).json();
  const p = Object.values(j.query.pages)[0];
  const i = p.imageinfo[0], m = i.extmetadata;
  const img = Buffer.from(await (await fetch(i.thumburl, { headers: UA })).arrayBuffer());
  fs.writeFileSync(`${key}.jpg`, img);
  credits.push({ key, title, author: (m.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim(), license: m.LicenseShortName?.value, source: i.descriptionurl });
  console.log(key, img.length, m.LicenseShortName?.value);
}
fs.writeFileSync('credits.json', JSON.stringify(credits, null, 2));
