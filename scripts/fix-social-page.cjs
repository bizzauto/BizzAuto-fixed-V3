const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'SocialMediaPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Fix setSocialAccounts in useEffect (line 248)
const old1 = '          setSocialAccounts(res.data.data);\n        }\n      }).catch(() => {}).finally(() => setLoadingSocialStatus(false));';
const new1 = '          setSocialAccounts(Array.isArray(res.data.data) ? res.data.data : []);\n        }\n      }).catch(() => {}).finally(() => setLoadingSocialStatus(false));';
if (content.includes(old1)) {
  content = content.replace(old1, new1);
  changes++;
  console.log('1. Fixed setSocialAccounts in useEffect');
} else {
  console.log('1. NOT FOUND - setSocialAccounts in useEffect');
}

// 2. Fix setIgStatus in useEffect (line 255)
const old2 = '          setIgStatus(res.data.data);\n\n      // Fetch social analytics';
const new2 = '          setIgStatus(res.data.data || null);\n\n      // Fetch social analytics';
if (content.includes(old2)) {
  content = content.replace(old2, new2);
  changes++;
  console.log('2. Fixed setIgStatus in useEffect');
} else {
  console.log('2. NOT FOUND - setIgStatus in useEffect');
}

// 3. Fix socialAccounts.find in render
const old4 = '              const account = socialAccounts.find(a => a.platform === platform.id);\n              const isConnected = account?.connected || false;';
const new4 = '              const account = Array.isArray(socialAccounts) ? socialAccounts.find(a => a.platform === platform.id) : undefined;\n              const isConnected = account?.connected || false;';
if (content.includes(old4)) {
  content = content.replace(old4, new4);
  changes++;
  console.log('3. Fixed socialAccounts.find in render');
} else {
  console.log('3. NOT FOUND - socialAccounts.find in render');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nTotal changes: ' + changes);
