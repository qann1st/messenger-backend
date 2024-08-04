# Для запуска приложения:

## Заполнить .env

```conf
JWT_ACCESS_SECRET="secret_key"
JWT_REFRESH_SECRET="secret_key"
MAIL_PASSWORD="mail_password"
FRONTEND_URL="http://localhost:5173"
MONGODB_URI="mongodb://localhost/messenger"
REDIS_HOST="localhost"
REDIS_PORT="32768"
```

## Выполнить инсталляцию пакетов:

```bash
pnpm i
```

## Запуск приложения в режиме разработки:

```bash
pnpm run dev
```
