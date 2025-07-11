require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const { exec } = require('child_process');
const path = require('path');
const Port = process.env.PORT || 3000;

// === CẤU HÌNH BOT ===
const BOT_TOKEN= process.env.BOT_TOKEN
const OWNER_ID = 6050099682; // Telegram ID cá nhân của bạn
const bot = new Telegraf(BOT_TOKEN);
const app = express();

// Đăng Ký webhook
bot.telegram.setWebhook('https://botteletatmaytuxa.onrender.com/bot'); 

//Webhook
app.use(bot.webhookCallback('/bot'));

// === LOG MỖI LỆNH GỬI VỀ ===
bot.use((ctx, next) => {
    if (ctx.message && ctx.message.text) {
        console.log(`[${new Date().toISOString()}] ${ctx.from.username || ctx.from.first_name} (${ctx.from.id}): ${ctx.message.text}`);
    }
    return next();
});

// === HÀM GỌI POPUP POWERSHELL COUNTDOWN ===
function showPopupCountdown(seconds) {
    const ps1Path = path.join(__dirname, 'countdown.ps1');
    const xamlPath = path.join(__dirname, 'countdown.xaml');
    const scriptPath = path.join(__dirname, 'countdown.ps1'); // file đã được fix font
    const cmd = `powershell -ExecutionPolicy Bypass -Command "& { & '${ps1Path}' ${seconds} '${xamlPath}' }"`;
    exec(cmd, (err) => {
        if (err) {
            console.error(`❌ Không thể chạy countdown.ps1: ${err}`);
        }
    });
}

// === /start ===
bot.start((ctx) => {
    ctx.reply('👋 Chào mừng bạn đến với bot điều khiển máy tính từ xa!');
});

// === /tatmay [thời gian] ===
bot.command('tatmay', (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ Bạn không có quyền sử dụng lệnh này.');
    }

    const args = ctx.message.text.split(' ');
    const time = parseInt(args[1]) || 30;

    if (isNaN(time) || time <= 0) {
        return ctx.reply('⚠️ Vui lòng nhập thời gian hợp lệ (ví dụ: /tatmay 60)');
    }

    ctx.reply(`🕒 Máy tính sẽ tắt sau ${time} giây. Đang chuẩn bị đóng các ứng dụng...`);

    // 🟡 Gọi bảng đếm ngược
    showPopupCountdown(time);

    // 🟢 Gửi lệnh tắt máy
    const shutdownCmd = `shutdown -s -f -t ${time}`;
    exec(shutdownCmd, (shutdownErr) => {
        if (shutdownErr) {
            console.error(`❌ Lỗi khi gửi lệnh shutdown: ${shutdownErr}`);
            return ctx.reply('⚠️ Không thể thiết lập lệnh tắt máy.');
        }

        // 🔴 Sau 3 giây mới kill các app (trừ PowerShell)
        setTimeout(() => {
            const killCmd = `powershell -Command "Get-Process | Where-Object { $_.Name -ne 'powershell' -and $_.Name -ne 'System' -and $_.Name -ne 'Idle' } | Stop-Process -Force"`;
            exec(killCmd, (killErr) => {
                if (killErr) {
                    console.error(`⚠️ Không thể đóng ứng dụng: ${killErr}`);
                } else {
                    console.log('✅ Đã đóng tất cả ứng dụng ngoại trừ PowerShell.');
                }
            });
        }, 3000);
    });
});

// === /huytatmay ===
bot.command('huytatmay', (ctx) => {
    if (ctx.from.id !== OWNER_ID) {
        return ctx.reply('❌ Bạn không có quyền sử dụng lệnh này.');
    }

    exec('shutdown -a', (err) => {
        if (err) {
            console.error(`❌ Không thể huỷ lệnh tắt máy: ${err}`);
            return ctx.reply('⚠️ Không thể huỷ lệnh (có thể không có lệnh nào đang chờ).');
        }
        ctx.reply('✅ Đã huỷ lệnh tắt máy.');
    });
});

// === KHỞI ĐỘNG BOT ===
bot.launch().then(() => {
    console.log('🚀 Bot đã khởi động');
    bot.telegram.sendMessage(OWNER_ID, '🤖 Bot đã sẵn sàng hoạt động!');
});

// === DỪNG BOT AN TOÀN ===
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
