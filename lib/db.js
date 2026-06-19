const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || '').trim();
const GITHUB_REPO = (process.env.GITHUB_REPO || '').trim();
const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || 'main').trim();

// Local files fallback path
const LOCAL_DIR = path.join(__dirname, '..', 'local_db');

const base64 = {
    encode: (str) => Buffer.from(str, 'utf8').toString('base64'),
    decode: (b64) => Buffer.from(b64, 'base64').toString('utf8')
};

const sha_cache = {};

async function fetchFromGitHub(file) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${file}?ref=${GITHUB_BRANCH}`;
    const res = await fetch(url, {
        headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });
    if (res.status === 200) {
        const data = await res.json();
        sha_cache[file] = data.sha;
        const decoded = base64.decode(data.content.replace(/\n/g, ''));
        return JSON.parse(decoded);
    } else if (res.status === 404) {
        return null;
    } else {
        const text = await res.text();
        console.error(`GitHub GET error for ${file} (${res.status}): ${text}`);
        return null;
    }
}

async function saveToGitHub(file, dataDict) {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${file}`;
    let sha = sha_cache[file];
    if (!sha) {
        // Fetch to get current sha
        const checkUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${file}?ref=${GITHUB_BRANCH}`;
        const res = await fetch(checkUrl, {
            headers: {
                "Authorization": `Bearer ${GITHUB_TOKEN}`,
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        if (res.status === 200) {
            const data = await res.json();
            sha = data.sha;
            sha_cache[file] = sha;
        }
    }

    const contentStr = JSON.stringify(dataDict, null, 2);
    const contentB64 = base64.encode(contentStr);

    const body = {
        message: `update ${file} via athkar bot`,
        content: contentB64,
        branch: GITHUB_BRANCH
    };
    if (sha) {
        body.sha = sha;
    }

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            "Authorization": `Bearer ${GITHUB_TOKEN}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    if (res.status === 200 || res.status === 201) {
        const resData = await res.json();
        sha_cache[file] = resData.content.sha;
        return true;
    } else {
        const text = await res.text();
        console.error(`GitHub PUT error for ${file} (${res.status}): ${text}`);
        // invalidate cache
        delete sha_cache[file];
        return false;
    }
}

// Read wrapper
async function readData(file, defaultVal = {}) {
    if (GITHUB_TOKEN && GITHUB_REPO) {
        try {
            const data = await fetchFromGitHub(file);
            return data || defaultVal;
        } catch (e) {
            console.error(`Error reading ${file} from GitHub:`, e.message);
            return defaultVal;
        }
    } else {
        // Local fallback
        const localPath = path.join(LOCAL_DIR, file);
        if (fs.existsSync(localPath)) {
            try {
                const content = fs.readFileSync(localPath, 'utf8');
                return JSON.parse(content);
            } catch (e) {
                console.error(`Error reading local file ${file}:`, e.message);
                return defaultVal;
            }
        }
        return defaultVal;
    }
}

// Write wrapper
async function writeData(file, data) {
    if (GITHUB_TOKEN && GITHUB_REPO) {
        try {
            await saveToGitHub(file, data);
        } catch (e) {
            console.error(`Error writing ${file} to GitHub:`, e.message);
        }
    } else {
        // Local fallback
        if (!fs.existsSync(LOCAL_DIR)) {
            fs.mkdirSync(LOCAL_DIR, { recursive: true });
        }
        const localPath = path.join(LOCAL_DIR, file);
        try {
            fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.error(`Error writing local file ${file}:`, e.message);
        }
    }
}

// Database helper functions
async function connectDB() {
    if (GITHUB_TOKEN && GITHUB_REPO) {
        console.log('✅ Connected to GitHub DB (' + GITHUB_REPO + ')');
    } else {
        console.log('✅ Using Local JSON files storage');
    }
    return true;
}

async function registerGroup(chatId, title) {
    if (!chatId) return false;
    const groups = await readData('groups.json', {});
    const cid = chatId.toString();
    const now = new Date().toISOString();
    
    if (!groups[cid]) {
        groups[cid] = {
            chat_id: cid,
            title: title || 'Group',
            added_at: now,
            last_message_at: now,
            active: true,
            fail_count: 0,
            last_failed_at: null
        };
    } else {
        groups[cid].title = title || groups[cid].title;
        groups[cid].last_message_at = now;
        groups[cid].active = true;
        groups[cid].fail_count = 0;
    }
    
    await writeData('groups.json', groups);
    return true;
}

async function getGroupSources() {
    const envGroupIds = [];
    // process ENV values
    const placeholders = new Set([
        'your_group_chat_id_here',
        'your_group_chat_ids_here'
    ]);
    const parseIds = (val) => {
        if (!val) return [];
        return val.toString().split(/[\s,;]+/).map(v => v.trim()).filter(v => v && !placeholders.has(v));
    };
    
    const G_ID = process.env.GROUP_CHAT_ID;
    const G_IDS = process.env.GROUP_CHAT_IDS;
    envGroupIds.push(...parseIds(G_ID), ...parseIds(G_IDS));

    let dbGroups = [];
    let dbError = null;
    try {
        const groupsObj = await readData('groups.json', {});
        dbGroups = Object.values(groupsObj);
    } catch (e) {
        dbError = e;
    }

    const activeDbGroups = dbGroups.filter(g => g.active !== false);
    const chatIds = new Set(activeDbGroups.map(g => g.chat_id));
    envGroupIds.forEach(id => chatIds.add(id));

    return {
        chatIds: Array.from(chatIds),
        envGroupIds,
        dbGroups,
        activeDbGroups,
        dbError
    };
}

async function getAllGroups() {
    const sources = await getGroupSources();
    return sources.chatIds;
}

async function markGroupFailed(chatId) {
    if (!chatId) return;
    const cid = chatId.toString();
    const groups = await readData('groups.json', {});
    if (!groups[cid]) return;
    
    const newFailCount = (groups[cid].fail_count || 0) + 1;
    const shouldDeactivate = newFailCount >= 5;
    
    groups[cid].fail_count = newFailCount;
    groups[cid].last_failed_at = new Date().toISOString();
    if (shouldDeactivate) {
        groups[cid].active = false;
        console.log(`⚠️ Group ${chatId} deactivated after ${newFailCount} consecutive failures.`);
    }
    await writeData('groups.json', groups);
}

async function markGroupSuccess(chatId) {
    if (!chatId) return;
    const cid = chatId.toString();
    const groups = await readData('groups.json', {});
    if (!groups[cid]) return;
    
    groups[cid].fail_count = 0;
    groups[cid].active = true;
    groups[cid].last_message_at = new Date().toISOString();
    await writeData('groups.json', groups);
}

async function activateAllGroups() {
    const groups = await readData('groups.json', {});
    let modifiedCount = 0;
    for (const cid in groups) {
        groups[cid].active = true;
        groups[cid].fail_count = 0;
        modifiedCount++;
    }
    await writeData('groups.json', groups);
    return { modifiedCount };
}

async function logCommand(chatId, command) {
    if (!chatId || !command) return;
    try {
        const logs = await readData('logs.json', []);
        logs.push({
            chat_id: chatId.toString(),
            command: command,
            timestamp: new Date().toISOString()
        });
        
        // Keep logs size bounded (e.g. max 1000)
        if (logs.length > 1000) {
            logs.shift();
        }
        
        await writeData('logs.json', logs);
    } catch (e) {
        console.error('Error logging command:', e.message);
    }
}

async function isVideoExists(chatId, messageId) {
    if (!chatId || !messageId) return false;
    const videos = await readData('videos.json', []);
    return videos.some(v => v.chat_id.toString() === chatId.toString() && v.message_id.toString() === messageId.toString());
}

async function saveVideo(chatId, messageId) {
    if (!chatId || !messageId) return false;
    const videos = await readData('videos.json', []);
    const exists = videos.some(v => v.chat_id.toString() === chatId.toString() && v.message_id.toString() === messageId.toString());
    if (exists) return false;
    
    videos.push({
        chat_id: chatId.toString(),
        message_id: messageId.toString(),
        createdAt: new Date().toISOString()
    });
    
    await writeData('videos.json', videos);
    return true;
}

async function getStats(last24hDateObj) {
    const groups = await readData('groups.json', {});
    const videos = await readData('videos.json', []);
    const logs = await readData('logs.json', []);

    const totalGroups = Object.keys(groups).length;
    const totalVideos = videos.length;
    const totalCommands = logs.length;
    
    // count new groups in 24h
    let newGroups24h = 0;
    const last24hMs = last24hDateObj.getTime();
    for (const cid in groups) {
        const addedAt = new Date(groups[cid].added_at).getTime();
        if (addedAt >= last24hMs) {
            newGroups24h++;
        }
    }
    
    // aggregate top commands
    const cmdCounts = {};
    logs.forEach(log => {
        cmdCounts[log.command] = (cmdCounts[log.command] || 0) + 1;
    });
    const topCommands = Object.keys(cmdCounts)
        .map(cmd => ({ _id: cmd, count: cmdCounts[cmd] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
        
    return {
        totalGroups,
        totalVideos,
        totalCommands,
        newGroups24h,
        topCommands
    };
}

module.exports = {
    connectDB,
    registerGroup,
    getGroupSources,
    getAllGroups,
    markGroupFailed,
    markGroupSuccess,
    activateAllGroups,
    logCommand,
    isVideoExists,
    saveVideo,
    getStats
};
