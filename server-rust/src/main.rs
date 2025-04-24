mod server;
mod handler;

use actix_web::{web, HttpRequest, HttpResponse, Responder};
use actix_cors::Cors;
use server::ChatServer;
use shuttle_actix_web::ShuttleActixWeb;
use std::env;
use shuttle_runtime::SecretStore;

pub mod keys;

// ### Server Setup

async fn index() -> impl Responder {
    "Socket.io server for Random Tune Harmony chat is running"
}

async fn ws_route(
    req: HttpRequest,
    body: web::Payload,
    srv: web::Data<server::ChatServerHandle>,
) -> Result<HttpResponse, actix_web::Error> {
    // Upgrade the HTTP connection to a WebSocket connection
    let (response, session, stream) = actix_ws::handle(&req, body)?;
    
    // Spawn a task to handle the WebSocket connection
    let chat_server = srv.get_ref().clone();
    actix_web::rt::spawn(handler::chat_ws(chat_server, session, stream));
    
    Ok(response)
}

#[shuttle_runtime::main]
async fn main(
    #[shuttle_runtime::Secrets] secrets: SecretStore,
) -> ShuttleActixWeb<impl FnOnce(&mut web::ServiceConfig) + Send + Clone + 'static> {
    // 0) Initialize secrets from Shuttle SecretStore
    keys::init_secrets(&secrets);

    let which_node_env = keys::get_which_node_env_url();
    let allowed_origin = keys::get_allowed_origin();
    let max_payload_size = 5 * 1024 * 1024; // 5 MB

    // Create a chat server
    let chat_server = ChatServer::start();
    
    // Define the config function to set up routes
    let config = move |cfg: &mut web::ServiceConfig| {

        // Get allowed origin from environment variable or use default
        let allowed_origin = if which_node_env == "production" {
            format!("https://{}/", allowed_origin).to_string()
        } else {
            "http://localhost:3000".to_string()
        };
        
        log::info!("Configuring CORS with allowed origin: {}", allowed_origin);
        
        // Configure CORS
        let cors = Cors::default()
            .allowed_origin(&allowed_origin)
            .allowed_methods(vec!["GET", "POST"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::ACCEPT,
                actix_web::http::header::CONTENT_TYPE,
            ])
            .supports_credentials()
            .max_age(3600);
        
        // With Shuttle, we need to use a different approach for middleware
        cfg.service(
            web::scope("")
                .wrap(cors)
                .app_data(web::Data::new(chat_server.clone()))
                .app_data(web::PayloadConfig::new(max_payload_size))
                .route("/", web::get().to(index))
                .route("/ws/", web::get().to(ws_route))
        );
    };
    
    Ok(config.into())
}