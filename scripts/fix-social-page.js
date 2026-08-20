const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'SocialMediaPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');
let changes = 0;

// 1. Fix setSocialAccounts in useEffect
const old1 = '        if (res.data.success) {\n          setSocialAccounts(res.data.data);\n        }\n      }).catch(() => {}).finally(() => setLoadingSocialStatus(false));';
const new1 = '        if (res.data.success) {\n          setSocialAccounts(Array.isArray(res.data.data) ? res.data.data : []);\n        }\n      }).catch(() => {}).finally(() => setLoadingSocialStatus(false));';
if (content.includes(old1)) {
  content = content.replace(old1, new1);
  changes++;
  console.log('1. Fixed setSocialAccounts in useEffect');
} else {
  console.log('1. Pattern NOT FOUND for setSocialAccounts in useEffect');
}

// 2. Fix setIgStatus in useEffect
const old2 = '        if (res.data.success) {\n          setIgStatus(res.data.data);';
const new2 = '        if (res.data.success) {\n          setIgStatus(res.data.data || null);';
if (content.includes(old2)) {
  content = content.replace(old2, new2);
  changes++;
  console.log('2. Fixed setIgStatus in useEffect');
} else {
  console.log('2. Pattern NOT FOUND for setIgStatus in useEffect');
}

// 3. Fix socialAccounts.filter in render (Connected Accounts count)
const old3 = '{socialAccounts.filter(a => a.connected).length}/{socialAccounts.length} connected';
const new3 = '{(Array.isArray(socialAccounts) ? socialAccounts.filter(a => a.connected).length : 0)}/{(Array.isArray(socialAccounts) ? socialAccounts.length : 0)} connected';
if (content.includes(old3)) {
  content = content.replace(old3, new3);
  changes++;
  console.log('3. Fixed socialAccounts.filter in render');
} else {
  console.log('3. Pattern NOT FOUND for socialAccounts.filter');
}

// 4. Fix socialAccounts.find in map
const old4 = '              const account = socialAccounts.find(a => a.platform === platform.id);\n              const isConnected = account?.connected || false;';
const new4 = '              const account = Array.isArray(socialAccounts) ? socialAccounts.find(a => a.platform === platform.id) : undefined;\n              const isConnected = account?.connected || false;';
if (content.includes(old4)) {
  content = content.replace(old4, new4);
  changes++;
  console.log('4. Fixed socialAccounts.find in map');
} else {
  console.log('4. Pattern NOT FOUND for socialAccounts.find');
}

// 5. Fix setSocialAccounts in handleSocialConnect and handleSocialDisconnect (2 occurrences)
const old5 = 'if (statusRes.data.success) setSocialAccounts(statusRes.data.data);';
const new5 = 'if (statusRes.data.success) setSocialAccounts(Array.isArray(statusRes.data.data) ? statusRes.data.data : []);';
if (content.includes(old5)) {
  const regex5 = new RegExp(old5.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const count5 = (content.match(regex5) || []).length;
  content = content.replace(regex5, new5);
  changes++;
  console.log('5. Fixed ' + count5 + ' occurrences of setSocialAccounts in connect/disconnect');
} else {
  console.log('5. Pattern NOT FOUND for setSocialAccounts in connect/disconnect');
}

// 6. Fix setIgStatus in handleIgConnect
const old6 = 'if (statusRes.data.success) setIgStatus(statusRes.data.data);';
const new6 = 'if (statusRes.data.success) setIgStatus(statusRes.data.data || null);';
if (content.includes(old6)) {
  content = content.replace(old6, new6);
  changes++;
  console.log('6. Fixed setIgStatus in handleIgConnect');
} else {
  console.log('6. Pattern NOT FOUND for setIgStatus in handleIgConnect');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\nTotal changes: ' + changes);
