const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'src', 'data.js');
let dataContent = fs.readFileSync(dataFile, 'utf8');

// For Rakuten (TikTok)
dataContent = dataContent.replace(
  /client: 'Rakuten',([\s\S]*?)synonyms: \['Meta UA', 'Paid Social UA', 'Facebook Ads', 'Instagram Ads'\],/g,
  "client: 'Rakuten',$1synonyms: ['TikTok Ads', 'Cashback', 'Rewards', 'Affiliate', 'Creator Ads'],"
);

// For SoundCloud (YouTube)
dataContent = dataContent.replace(
  /client: 'SoundCloud',\s*year: 2022,\s*market: 'US',\s*title: 'YouTube Acquisition Optimization',([\s\S]*?)synonyms: \['Meta UA', 'Paid Social UA', 'Facebook Ads', 'Instagram Ads'\],/g,
  "client: 'SoundCloud',\n    year: 2022,\n    market: 'US',\n    title: 'YouTube Acquisition Optimization',$1synonyms: ['Video Ads', 'Google Ads', 'Music', 'Artists'],"
);

// For SoundCloud (TikTok)
dataContent = dataContent.replace(
  /client: 'SoundCloud',\s*year: 2022,\s*market: 'US',\s*title: 'TikTok Influencer User Acquisition',([\s\S]*?)synonyms: \['Meta UA', 'Paid Social UA', 'Facebook Ads', 'Instagram Ads'\],/g,
  "client: 'SoundCloud',\n    year: 2022,\n    market: 'US',\n    title: 'TikTok Influencer User Acquisition',$1synonyms: ['TikTok Ads', 'Creator UA', 'Music', 'Artists', 'UGC'],"
);

// Dave Snapchat
dataContent = dataContent.replace(
  /client: 'Dave',\s*year: 2023,\s*market: 'US',\s*title: 'Snapchat Acquisition Optimization',([\s\S]*?)synonyms: \['paid social', 'Facebook Ads', 'Instagram Ads'\],/g,
  "client: 'Dave',\n    year: 2023,\n    market: 'US',\n    title: 'Snapchat Acquisition Optimization',$1synonyms: ['Snap Ads', 'Snapchat', 'Neobank', 'Fintech'],"
);

fs.writeFileSync(dataFile, dataContent);
console.log('Fixed synonyms.');
