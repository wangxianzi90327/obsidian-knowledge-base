#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STATE_PATH = process.env.SYNC_STATE_PATH || 'D:\\wxsdevops\\Obsidian\\99 系统\\同步配置\\sync_state.json';
const LARK_CLI = process.env.LARK_CLI || 'C:\\Users\\wxs\\.trae-cn\\plugins\\trae-remote-official\\lark\\1.0.5\\bin\\lark-cli.exe';

const PLACEHOLDERS = new Set(['空内容', '空内容输出', '空字符串', '空字符串输出', '空']);
function isPlaceholder(v) {
  if (v === null || v === undefined) return true;
  const t = String(v).trim();
  if (t === '') return true;
  return PLACEHOLDERS.has(t.replace(/\s+/g, ''));
}

function shanghaiNow() {
  const shifted = new Date(Date.now() + 8 * 3600 * 1000);
  return {
    ts: shifted.toISOString().slice(0, 19) + '+08:00',
    date: shifted.toISOString().slice(0, 10)
  };
}

function detectPlatform(link) {
  try {
    const host = new URL(link).hostname.toLowerCase();
    if (host === 'v.douyin.com' || host.endsWith('.douyin.com')) return '抖音';
    if (host === 'xiaohongshu.com' || host.endsWith('.xiaohongshu.com')) return '小红书';
    if (host === 'channels.weixin.qq.com') return '视频号';
    return '未知';
  } catch (e) {
    return '未知';
  }
}

const TRACKING = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'spm', 'spm_id', 'from', 'from_source', 'source', 'ref', 'referer',
  'share_from', 'share_medium', 'share_source', 'share_token', 'share_id', 'share_key',
  '_t', '_r', '_k', 'hash', 'scm', 'scm_url', 'umb', 'is_story_h5', 'jump_from', 'traffic_source'
]);
function normalizeLink(link) {
  let s = String(link).trim();
  try {
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = 'https://' + s;
    const u = new URL(s);
    const scheme = u.protocol.replace(/:/, '').toLowerCase();
    const host = u.hostname.toLowerCase();
    const params = [];
    u.searchParams.forEach((v, k) => {
      if (TRACKING.has(k) || /^utm_/i.test(k)) return;
      params.push(k + '=' + v);
    });
    const query = params.length ? '?' + params.join('&') : '';
    return scheme + '://' + host + u.pathname + query;
  } catch (e) {
    return s;
  }
}

function extractFrontmatter(content, key) {
  const m = content.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'));
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v;
}

function sourceFileName(platform, tags, recordId) {
  const base = platform + '视频';
  const mid = tags.length ? '_' + tags.join('_') : '';
  return base + mid + '_' + recordId + '.md';
}

function buildSourceNote(opts) {
  const { link, platform, tags, recordId, date, ts } = opts;
  const title = platform + '视频' + (tags.length ? ' - ' + tags.join(' ') : '');
  const arr = tags.length ? tags.join(', ') : '';
  const related = tags.length ? tags.map(t => '- [[' + t + ']]').join('\n') : '';
  const lines = [
    '---',
    'source: "' + link + '"',
    'platform: "' + platform + '"',
    'collected_at: "' + date + '"',
    'feishu_record_id: "' + recordId + '"',
    'topics: [' + arr + ']',
    'tags: [' + arr + ']',
    'projects: []',
    'synced_at: "' + ts + '"',
    '---',
    '',
    '# ' + title,
    '',
    '## 基本信息',
    '',
    '- **来源链接**: ' + link,
    '- **平台**: ' + platform,
    '- **收藏时间**: ' + date,
    '- **飞书记录 ID**: ' + recordId,
    '',
    '## 标签',
    '',
    ' topics: ' + arr,
    '',
    ' tags: ' + arr,
    '',
    '## 笔记内容',
    '',
    '>',
    '',
    '## 相关主题',
    ''
  ];
  if (related) lines.push(related);
  return lines.join('\n') + '\n';
}

function buildThemeNote(tag, sourceName) {
  return [
    '---',
    'tags: [' + tag + ']',
    'related_videos: []',
    '---',
    '',
    '# ' + tag,
    '',
    '## 相关视频',
    '',
    '- [[' + sourceName + ']]',
    ''
  ].join('\n');
}

function addThemeLink(topicDir, tag, sourceName) {
  const p = path.join(topicDir, tag + '.md');
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('[[' + sourceName + ']]')) return;
    if (!content.endsWith('\n')) content += '\n';
    content += '- [[' + sourceName + ']]\n';
    fs.writeFileSync(p, content, 'utf8');
  } else {
    fs.writeFileSync(p, buildThemeNote(tag, sourceName), 'utf8');
  }
}

function scanExistingSources(sourceDir) {
  const map = new Map();
  if (!fs.existsSync(sourceDir)) return map;
  for (const f of fs.readdirSync(sourceDir)) {
    if (!f.endsWith('.md')) continue;
    const p = path.join(sourceDir, f);
    const content = fs.readFileSync(p, 'utf8');
    const src = extractFrontmatter(content, 'source');
    if (!src) continue;
    const norm = normalizeLink(src);
    if (!map.has(norm)) map.set(norm, f.replace(/\.md$/, ''));
  }
  return map;
}

// ---------- 1. 读取并校验 sync_state ----------
if (!fs.existsSync(STATE_PATH)) {
  console.error('未找到 sync_state.json: ' + STATE_PATH);
  process.exit(2);
}
const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const vault = state.vault_path;
const baseToken = state.base_token;
const tableId = state.table_id;
const fieldIds = Object.values(state.field_ids);
const sourceDir = path.join(vault, state.sync_notes_location);
const topicDir = path.join(vault, state.topic_notes_location);
const processed = new Set(state.processed_record_ids || []);

// ---------- 2. 拉取飞书记录 ----------
const args = ['base', '+record-list', '--base-token', baseToken, '--table-id', tableId];
for (const f of fieldIds) args.push('--field-id', f);
args.push('--format', 'json', '--as', 'user');

let resp;
try {
  const stdout = execFileSync(LARK_CLI, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  resp = JSON.parse(stdout);
} catch (e) {
  console.error('lark-cli 调用失败: ' + (e.message || e));
  if (e.stdout) console.error(e.stdout);
  process.exit(2);
}
if (!resp || !resp.ok) {
  console.error('lark-cli 返回错误: ' + JSON.stringify(resp));
  process.exit(2);
}

const rows = (resp.data && resp.data.data) || [];
const recordIds = (resp.data && resp.data.record_id_list) || [];
const total = rows.length;

// ---------- 3. 过滤新增记录 ----------
const newRecords = [];
for (let i = 0; i < rows.length; i++) {
  const rid = recordIds[i];
  if (processed.has(rid)) continue;
  newRecords.push({ recordId: rid, row: rows[i] });
}

// ---------- 4. 无新记录直接结束 ----------
if (newRecords.length === 0) {
  console.log('无新记录');
  console.log('扫描总数: ' + total);
  process.exit(0);
}

// ---------- 5. 处理新记录 ----------
const existingSourceMap = scanExistingSources(sourceDir);
const batchSourceMap = new Map();
const failedSet = new Set(state.failed_record_ids || []);
const ts = shanghaiNow().ts;
const date = shanghaiNow().date;

let newCount = 0;
let reusedCount = 0;
let skippedCount = 0;
let failedCount = 0;

for (const rec of newRecords) {
  const rid = rec.recordId;
  const row = rec.row || [];
  const linkRaw = row[0];
  const tagVals = row.slice(1);

  if (isPlaceholder(linkRaw)) {
    skippedCount++;
    continue;
  }

  const link = String(linkRaw).trim();
  const uniqueTags = [];
  for (const v of tagVals) {
    if (isPlaceholder(v)) continue;
    const t = String(v).trim();
    if (t !== '' && !uniqueTags.includes(t)) uniqueTags.push(t);
  }

  const norm = normalizeLink(link);
  const reusedName = existingSourceMap.get(norm) || batchSourceMap.get(norm);
  if (reusedName) {
    reusedCount++;
    processed.add(rid);
    failedSet.delete(rid);
    continue;
  }

  const platform = detectPlatform(link);
  const fname = sourceFileName(platform, uniqueTags, rid);
  const fbase = fname.replace(/\.md$/, '');

  try {
    const note = buildSourceNote({ link, platform, tags: uniqueTags, recordId: rid, date, ts });
    fs.writeFileSync(path.join(sourceDir, fname), note, 'utf8');
    for (const t of uniqueTags) {
      addThemeLink(topicDir, t, fbase);
    }
    batchSourceMap.set(norm, fbase);
    processed.add(rid);
    failedSet.delete(rid);
    newCount++;
  } catch (e) {
    failedCount++;
    failedSet.add(rid);
    console.error('记录处理失败 ' + rid + ': ' + (e.message || e));
  }
}

// ---------- 6. 更新 sync_state ----------
state.processed_record_ids = [...processed].sort();
state.failed_record_ids = [...failedSet].sort();
state.last_incremental_sync = ts;
fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf8');

// ---------- 7. 报告 ----------
console.log('扫描总数: ' + total);
console.log('新增笔记数: ' + newCount);
console.log('复用已有笔记数: ' + reusedCount);
console.log('跳过数: ' + skippedCount);
console.log('失败数: ' + failedCount);