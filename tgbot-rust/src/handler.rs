use teloxide::prelude::*;
use teloxide::types::{InlineKeyboardButton, InlineKeyboardMarkup};
use url::Url;
use log;

// Handle incoming messages (e.g., /chat command)
pub async fn message_handler(bot: Bot, msg: Message) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if let Some(text) = msg.text() {
        match text {
            "/start" => {
                bot.send_message(msg.chat.id, "Yoo, wassap! It's Yaps World on yaps.gg. We build things. Try /help.")
                    .await?;
            }
            text if text.starts_with("/chat") => {
                // Parse the URL properly for the InlineKeyboardButton
                let chat_url = Url::parse("https://t.me/yapsworld_bot/chat")
                    .expect("Failed to parse chat URL");
                
                let keyboard = InlineKeyboardMarkup::new(vec![vec![InlineKeyboardButton::url(
                    "👀 Start Yapping!",
                    chat_url,
                )]]);
                
                bot.send_message(msg.chat.id, "Click to start one-time end-to-end encrypted anonymous chats.")
                    .reply_markup(keyboard)
                    .await?;
            }
            text if text.starts_with("/link") => {
                // Parse the URL properly for the InlineKeyboardButton
                let chat_url = Url::parse("https://t.me/yapsworld_bot/link")
                    .expect("Failed to parse chat URL");
                
                let keyboard = InlineKeyboardMarkup::new(vec![vec![InlineKeyboardButton::url(
                    "👀 Start Shortening!",
                    chat_url,
                )]]);
                
                bot.send_message(msg.chat.id, "Click to shorten your long links blazingly fast.")
                    .reply_markup(keyboard)
                    .await?;
            }
            text if text.starts_with("/loom") => {
                // Parse the URL properly for the InlineKeyboardButton
                let chat_url = Url::parse("https://t.me/yapsworld_bot/loom")
                    .expect("Failed to parse chat URL");
                
                let keyboard = InlineKeyboardMarkup::new(vec![vec![InlineKeyboardButton::url(
                    "👀 Start Downloading!",
                    chat_url,
                )]]);
                
                bot.send_message(msg.chat.id, "Not a Loom Pro subscriber? Click to download videos from Loom for free.")
                    .reply_markup(keyboard)
                    .await?;
            }
            "/help" => {
                bot.send_message(
                    msg.chat.id,
                    "try yaps.gg to learn more.\n\n\
                    Available commands:\n\
                    /start - yoo, wassap!\n\
                    /chat - Launch \"yaps.chat - one-time end-to-end encrypted anonymous chats\" on Telegram\n\
                    /link - Launch \"notl.ink - free open source blazingly fast url shortener ever\" on Telegram\n\
                    /loom - Launch \"yaps.lol - free open source loom video downloader\" on Telegram\n\
                    /help - try me if you're lost;)\n\
                    /enterprise - let's yapp on business"
                ).await?;
            }
            "/enterprise" => {
                bot.send_message(msg.chat.id, "Kindly contact me via abdibrokhim@gmail.com.").await?;
            }
            _ => {
                // Handle other messages or commands
                log::debug!("Received message: {}", text);
            }
        }
    }
    Ok(())
}