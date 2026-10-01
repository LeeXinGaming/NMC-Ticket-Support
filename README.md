# 🎫 Nightmare City RP - Discord Ticket Bot

A production-grade Discord Ticket Management Bot built with **Node.js**, **discord.js v14**, and **SQLite**. Fully prepared for local running and 24/7 cloud hosting on **Render.com**.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)

---

## 🚀 24/7 Deployment on Render.com

### Step 1: Push Code to GitHub
In your project terminal:
```bash
git push -u origin main
```
*(If your repository is new or already has files on GitHub, you can force push: `git push -u origin main --force`)*

---

### Step 2: Deploy on Render (Free 24/7 Web Service / Background Worker)
1. Go to [Render.com](https://dashboard.render.com/) and log in with GitHub.
2. Click **New +** > **Web Service** (or **Blueprint** using the included `render.yaml`).
3. Connect your repository: `https://github.com/LeeXinGaming/NMG-TICKET-BOT`.
4. Configure Settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add the following **Environment Variables** in the Render Dashboard:

| Key | Value |
|---|---|
| `DISCORD_TOKEN` | `MTU1MjQ0MDgwNTE4NzI2NDUyMg.GjOLzb.OqqNNkaSy2odqR5BhdxR_20qPlz-hmY1b2zvK0` |
| `CLIENT_ID` | `1552440805187264522` |
| `GUILD_ID` | `1549490376195309661` |
| `TICKET_CATEGORY_ID` | `1549540319958147155` |
| `SUPPORT_ROLE_ID` | `1553098258325180457` |
| `LOG_CHANNEL_ID` | `1553102113268047874` |

6. Click **Deploy Web Service**!
   - Render will build dependencies, start the HTTP health check server, and launch the Discord bot.

---

## ✨ Features

- 🎟️ **Interactive Ticket Panel**: Modern embed with **Open Ticket** button in `#🎟️・𝐍𝐌𝐂-𝐓𝐈𝐂𝐊𝐄𝐓`.
- 🔒 **Private Support Channels**: Automated channel provisioning under `𝐀𝐃𝐌𝐈𝐍 𝐓𝐈𝐂𝐊𝐄𝐓`.
- 🔐 **Claim / Unclaim System**: Dedicated support staff assignment.
- 🛑 **Safe Close Flow**: Revokes user message permissions, archives channel, and renames to `closed-ticket-username`.
- 📄 **HTML Transcripts**: Complete standalone dark-mode HTML transcript generator with avatars, message history, timestamps, and attachment previews.
- 📊 **Audit Logs**: Events streamed to `#📁・ticket-logs`.
- 🌐 **Render Health-Check Server**: Built-in HTTP server on `PORT` for 100% uptime on Render.

---

## 🛠️ Slash Commands

| Command | Arguments | Description |
|---|---|---|
| `/ticket-panel` | `[channel]` `[title]` `[description]` | Deploys the interactive ticket creation panel. |
| `/ticket-close` | `[reason]` | Closes and archives the current ticket. |
| `/ticket-claim` | None | Claims the ticket for a support staff member. |
| `/ticket-delete`| None | Generates transcript archive and deletes channel. |
| `/ticket-transcript` | None | Exports and uploads HTML transcript. |
| `/ticket-add`   | `<user>` | Adds a user to the current ticket channel. |
| `/ticket-remove`| `<user>` | Removes a user from the ticket channel. |
| `/ticket-rename`| `<name>` | Renames the ticket channel. |
| `/ticket-info`  | None | Displays ticket metadata and SQLite history. |
