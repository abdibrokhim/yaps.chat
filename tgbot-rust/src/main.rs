use actix_web::{web, HttpResponse, Responder};
use shuttle_actix_web::ShuttleActixWeb;
use teloxide::{prelude::*, types::UpdateKind};
use shuttle_runtime::SecretStore;
// use std::net::SocketAddr;
use url::Url;
use log;

mod keys;
mod handler;

// Simple index route
async fn index() -> impl Responder {
    "Telegram bot webhook server is running"
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
) -> ShuttleActixWeb<impl FnOnce(&mut web::ServiceConfig) + Send + Clone + 'static> {
    log::info!("Starting Telegram bot...");

    // Initialize secrets from Shuttle SecretStore
    keys::init_secrets(&secrets);
    
    // Create the bot instance using the token from the keys module
    let bot = Bot::new(keys::get_telegram_bot_token());
    
    // Get webhook URL from environment or use a default for local development
    let app_host = std::env::var("APP_HOST")
        .unwrap_or_else(|_| keys::get_app_host().to_string());
    let webhook_url = format!("https://{}/webhook", app_host);
    
    log::info!("Using webhook URL: {}", webhook_url);
    
    // Parse the webhook URL
    let url = Url::parse(&webhook_url).expect("Failed to parse webhook URL");
    
    // Set up webhook in Telegram servers
    bot.set_webhook(url)
        .await
        .expect("Failed to set webhook");

    // Define the dispatcher to handle updates
    let handler = dptree::entry()
        .branch(Update::filter_message().endpoint(handler::message_handler));

    // Start the dispatcher
    let mut dispatcher = Dispatcher::builder(bot.clone(), handler.clone())
        .enable_ctrlc_handler()
        .build();
        
    // Run the dispatcher in the background
    tokio::spawn(async move {
        dispatcher.dispatch().await;
    });
    
    // Define the config function to set up routes
    let config = move |cfg: &mut web::ServiceConfig| {
        cfg.app_data(web::Data::new(bot.clone()))
            .app_data(web::Data::new(handler.clone()))
            .route("/", web::get().to(index))
            .route("/webhook", web::post().to(webhook_handler));
    };
    
    Ok(config.into())
}

// Handle incoming webhook requests
async fn webhook_handler(
    body: web::Json<Update>,  // Parse the update directly from JSON
    bot: web::Data<Bot>,
) -> actix_web::Result<HttpResponse> {
    // Get the update from the request body
    let update = body.into_inner();
    
    log::info!("Received update: {:?}", update);
    
    // Process the update with the bot directly
    let bot_instance = bot.get_ref().clone();
    
    // Handle different types of updates based on the update type
    match update.kind {
        UpdateKind::Message(message) => {
            // Process message directly
            if let Err(e) = handler::message_handler(bot_instance, message).await {
                log::error!("Error handling message: {:?}", e);
            }
        },
        _ => {
            log::info!("Received non-message update");
        }
    }
    
    Ok(HttpResponse::Ok().finish())
}