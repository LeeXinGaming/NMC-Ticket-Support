const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const transcriptDir = path.join(__dirname, '..', '..', 'transcripts');
if (!fs.existsSync(transcriptDir)) {
  fs.mkdirSync(transcriptDir, { recursive: true });
}

/**
 * Escapes HTML characters to prevent XSS.
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats message body text with basic markdown conversions.
 * @param {string} content 
 * @returns {string}
 */
function formatMessageContent(content) {
  if (!content) return '';
  let text = escapeHtml(content);

  // Bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic *text* or _text_
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');
  // Code block ```lang ... ```
  text = text.replace(/```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code `code`
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // URL auto-links
  text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');

  return text;
}

/**
 * Fetch all messages in a channel, paginating through history backwards.
 * @param {import('discord.js').TextChannel} channel 
 * @returns {Promise<import('discord.js').Message[]>}
 */
async function fetchAllMessages(channel) {
  let messages = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) {
      options.before = lastId;
    }

    const fetched = await channel.messages.fetch(options).catch(() => null);
    if (!fetched || fetched.size === 0) {
      break;
    }

    messages = messages.concat(Array.from(fetched.values()));
    lastId = fetched.last().id;

    // Safety cap at 5,000 messages
    if (messages.length >= 5000) break;
  }

  // Reverse so chronological order (oldest first)
  return messages.reverse();
}

/**
 * Generates an HTML transcript file and returns an AttachmentBuilder.
 * @param {import('discord.js').TextChannel} channel 
 * @param {object} ticketData 
 * @returns {Promise<{ attachment: AttachmentBuilder, messageCount: number, filePath: string }>}
 */
async function generateTranscript(channel, ticketData = {}) {
  const messages = await fetchAllMessages(channel);

  const channelName = escapeHtml(channel.name);
  const guildName = escapeHtml(channel.guild ? channel.guild.name : 'Discord Server');
  const creatorTag = escapeHtml(ticketData.creatorTag || `<@${ticketData.creatorId || 'Unknown'}>`);
  const creatorId = escapeHtml(ticketData.creatorId || 'Unknown');
  const claimedBy = ticketData.claimedBy ? escapeHtml(`<@${ticketData.claimedBy}> (${ticketData.claimedBy})`) : 'None';
  const createdAtFormatted = ticketData.createdAt ? new Date(ticketData.createdAt).toUTCString() : 'N/A';
  const closedAtFormatted = ticketData.closedAt ? new Date(ticketData.closedAt).toUTCString() : 'Still Open / Active';
  const generatedAt = new Date().toUTCString();

  let messageHtmlRows = '';

  for (const msg of messages) {
    const authorTag = escapeHtml(msg.author ? msg.author.tag : 'Deleted User');
    const authorId = escapeHtml(msg.author ? msg.author.id : 'Unknown');
    const isBot = msg.author && msg.author.bot;
    const avatarUrl = msg.author ? msg.author.displayAvatarURL({ size: 64, extension: 'png' }) : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const timestamp = new Date(msg.createdTimestamp).toUTCString();
    const formattedContent = formatMessageContent(msg.content);

    let attachmentsHtml = '';
    if (msg.attachments.size > 0) {
      attachmentsHtml = '<div class="attachments">';
      for (const [_, att] of msg.attachments) {
        const isImage = att.contentType && att.contentType.startsWith('image/');
        const safeUrl = escapeHtml(att.url);
        const safeName = escapeHtml(att.name || 'Attachment');
        const safeSize = (att.size / 1024).toFixed(1) + ' KB';

        if (isImage) {
          attachmentsHtml += `
            <div class="attachment-item">
              <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                <img src="${safeUrl}" alt="${safeName}" class="attachment-image" loading="lazy" />
              </a>
              <div class="attachment-meta">${safeName} (${safeSize})</div>
            </div>`;
        } else {
          attachmentsHtml += `
            <div class="attachment-item file">
              📎 <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a> <span class="attachment-meta">(${safeSize})</span>
            </div>`;
        }
      }
      attachmentsHtml += '</div>';
    }

    let embedsHtml = '';
    if (msg.embeds.length > 0) {
      embedsHtml = '<div class="embeds-container">';
      for (const embed of msg.embeds) {
        const embedTitle = embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : '';
        const embedDesc = embed.description ? `<div class="embed-description">${formatMessageContent(embed.description)}</div>` : '';
        const embedColorHex = embed.hexColor || '#5865F2';

        let embedFields = '';
        if (embed.fields && embed.fields.length > 0) {
          embedFields = '<div class="embed-fields">';
          for (const f of embed.fields) {
            embedFields += `
              <div class="embed-field ${f.inline ? 'inline' : ''}">
                <div class="field-name">${escapeHtml(f.name)}</div>
                <div class="field-value">${formatMessageContent(f.value)}</div>
              </div>`;
          }
          embedFields += '</div>';
        }

        embedsHtml += `
          <div class="message-embed" style="border-left-color: ${embedColorHex}">
            ${embedTitle}
            ${embedDesc}
            ${embedFields}
          </div>`;
      }
      embedsHtml += '</div>';
    }

    messageHtmlRows += `
      <div class="message" id="msg-${msg.id}">
        <img class="avatar" src="${avatarUrl}" alt="${authorTag}">
        <div class="message-body">
          <div class="header">
            <span class="username">${authorTag}</span>
            ${isBot ? '<span class="bot-badge">BOT</span>' : ''}
            <span class="user-id">(${authorId})</span>
            <span class="timestamp">${timestamp}</span>
          </div>
          ${formattedContent ? `<div class="content">${formattedContent}</div>` : ''}
          ${attachmentsHtml}
          ${embedsHtml}
        </div>
      </div>`;
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript - #${channelName}</title>
  <style>
    :root {
      --bg-primary: #313338;
      --bg-secondary: #2b2d31;
      --bg-tertiary: #1e1f22;
      --text-normal: #dbdee1;
      --text-muted: #949ba4;
      --text-header: #f2f3f5;
      --brand: #5865f2;
      --brand-hover: #4752c4;
      --green: #57f287;
      --red: #ed4245;
      --yellow: #fee75c;
      --border: #3f4147;
      --font-stack: "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-primary);
      color: var(--text-normal);
      font-family: var(--font-stack);
      font-size: 15px;
      line-height: 1.4;
      padding: 24px;
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: var(--bg-secondary);
      border-radius: 8px;
      border: 1px solid var(--border);
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .header-box {
      background: var(--bg-tertiary);
      padding: 24px;
      border-bottom: 1px solid var(--border);
    }

    .header-box h1 {
      color: var(--text-header);
      font-size: 24px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-top: 16px;
    }

    .meta-item {
      background: var(--bg-secondary);
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .meta-label {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 700;
      margin-bottom: 4px;
    }

    .meta-value {
      font-size: 14px;
      color: var(--text-header);
      word-break: break-all;
    }

    .messages-list {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .message {
      display: flex;
      gap: 16px;
      padding: 6px 10px;
      border-radius: 4px;
      transition: background 0.15s;
    }

    .message:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--bg-tertiary);
    }

    .message-body {
      flex: 1;
      min-width: 0;
    }

    .header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .username {
      font-weight: 600;
      color: var(--text-header);
      font-size: 15px;
    }

    .bot-badge {
      background: var(--brand);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 1px 4px;
      border-radius: 3px;
      line-height: 1.2;
    }

    .user-id {
      font-size: 12px;
      color: var(--text-muted);
    }

    .timestamp {
      font-size: 12px;
      color: var(--text-muted);
      margin-left: auto;
    }

    .content {
      color: var(--text-normal);
      font-size: 14.5px;
      word-break: break-word;
    }

    .content code {
      background: var(--bg-tertiary);
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 13px;
      font-family: monospace;
    }

    .content pre {
      background: var(--bg-tertiary);
      padding: 10px;
      border-radius: 6px;
      overflow-x: auto;
      margin-top: 6px;
    }

    .content a {
      color: #00a8fc;
      text-decoration: none;
    }

    .content a:hover {
      text-decoration: underline;
    }

    .attachments {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .attachment-item {
      max-width: 400px;
    }

    .attachment-image {
      max-width: 100%;
      max-height: 350px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .attachment-item.file {
      background: var(--bg-tertiary);
      padding: 8px 12px;
      border-radius: 6px;
      display: inline-block;
      font-size: 13px;
    }

    .attachment-meta {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .embeds-container {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .message-embed {
      background: var(--bg-tertiary);
      border-left: 4px solid var(--brand);
      border-radius: 4px;
      padding: 12px 16px;
      max-width: 520px;
    }

    .embed-title {
      font-weight: 700;
      color: var(--text-header);
      margin-bottom: 6px;
    }

    .embed-description {
      font-size: 13.5px;
      color: var(--text-normal);
      margin-bottom: 8px;
    }

    .embed-fields {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
    }

    .embed-field .field-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
    }

    .embed-field .field-value {
      font-size: 13px;
      color: var(--text-normal);
    }

    .footer {
      background: var(--bg-tertiary);
      padding: 14px 24px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header-box">
      <h1>🎫 Ticket Transcript &bull; #${channelName}</h1>
      <p style="color: var(--text-muted); font-size: 14px;">Server: <strong>${guildName}</strong></p>
      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Ticket Creator</div>
          <div class="meta-value">${creatorTag} (${creatorId})</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Claimed Staff</div>
          <div class="meta-value">${claimedBy}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Created At</div>
          <div class="meta-value">${createdAtFormatted}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Closed At</div>
          <div class="meta-value">${closedAtFormatted}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Total Messages</div>
          <div class="meta-value">${messages.length}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Generated On</div>
          <div class="meta-value">${generatedAt}</div>
        </div>
      </div>
    </header>

    <main class="messages-list">
      ${messageHtmlRows || '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No messages recorded in this ticket.</p>'}
    </main>

    <footer class="footer">
      Generated automatically by Discord Ticket Bot &bull; Production Edition
    </footer>
  </div>
</body>
</html>`;

  const fileName = `transcript-${channel.name}-${Date.now()}.html`;
  const filePath = path.join(transcriptDir, fileName);

  fs.writeFileSync(filePath, htmlContent, 'utf-8');

  const attachment = new AttachmentBuilder(filePath, { name: fileName });

  return {
    attachment,
    messageCount: messages.length,
    filePath,
    fileName
  };
}

module.exports = {
  generateTranscript,
  fetchAllMessages
};
