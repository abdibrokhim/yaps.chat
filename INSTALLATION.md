# Yaps.chat Installation

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Run the app (Next.js)

1. Clone the repository

```bash
git clone https://github.com/abdibrokhim/yaps.chat.git
```

2. Install dependencies

```bash
npm install
```

3. Environment variables

Do not forget to create `.env` file in the root of the project and set the environment variables.

```bash
cp .env.example .env
```

Put your credentials in the `.env` file.

4. Run the development server

```bash
npm run dev
```

Go to [http://localhost:3000](http://localhost:3000) to see the app.


## Run the server (Rust)

1. Environment variables

```bash
cp ./server-rust/example.Secrets.toml ./server-rust/Secrets.toml
```

Put your credentials in the `Secrets.toml` file.

2. Run the server

Go to `./server-rust` and run the server.

```bash
shuttle run
```


## Run the telegram bot (Rust)

1. Environment variables

```bash
cp ./tgbot-rust/example.Secrets.toml ./tgbot-rust/Secrets.toml
```

Put your credentials in the `Secrets.toml` file.

Go to `./tgbot-rust` and run the bot.

```bash
shuttle run
```

