// keys.rs
use shuttle_runtime::SecretStore;
use std::sync::OnceLock;

static TELEGRAM_BOT_TOKEN: OnceLock<String> = OnceLock::new();
static APP_HOST: OnceLock<String> = OnceLock::new();

pub fn init_secrets(secrets: &SecretStore) {
    // Initialize TELEGRAM_BOT_TOKEN
    let telegram_bot_token = secrets.get("TELEGRAM_BOT_TOKEN")
        .expect("TELEGRAM_BOT_TOKEN not found in secrets");
    TELEGRAM_BOT_TOKEN.set(telegram_bot_token.clone())
        .expect("TELEGRAM_BOT_TOKEN already initialized");

    // Initialize APP_HOST
    let app_host = secrets.get("APP_HOST")
        .expect("APP_HOST not found in secrets");
    APP_HOST.set(app_host.clone())
        .expect("APP_HOST already initialized");
}

pub fn get_telegram_bot_token() -> &'static str {
    TELEGRAM_BOT_TOKEN.get().expect("TELEGRAM_BOT_TOKEN not initialized")
}

pub fn get_app_host() -> &'static str {
    APP_HOST.get().expect("APP_HOST not initialized")
}
