// keys.rs
use shuttle_runtime::SecretStore;
use std::sync::OnceLock;

static WHICH_NODE_ENV: OnceLock<String> = OnceLock::new();
static ALLOWED_ORIGIN: OnceLock<String> = OnceLock::new();

pub fn init_secrets(secrets: &SecretStore) {
    // Initialize WHICH_NODE_ENV
    let which_node_env = secrets.get("WHICH_NODE_ENV")
        .expect("WHICH_NODE_ENV not found in secrets");
    WHICH_NODE_ENV.set(which_node_env.clone())
        .expect("WHICH_NODE_ENV already initialized");

    // Initialize ALLOWED_ORIGIN
    let allowed_origin = secrets.get("ALLOWED_ORIGIN")
        .expect("ALLOWED_ORIGIN not found in secrets");
    ALLOWED_ORIGIN.set(allowed_origin.clone())
        .expect("ALLOWED_ORIGIN already initialized");

}

pub fn get_which_node_env_url() -> &'static str {
    WHICH_NODE_ENV.get().expect("WHICH_NODE_ENV not initialized")
}

pub fn get_allowed_origin() -> &'static str {
    ALLOWED_ORIGIN.get().expect("ALLOWED_ORIGIN not initialized")
}