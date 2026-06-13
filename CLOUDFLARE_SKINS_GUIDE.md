# Гайд по настройке Cloudflare (Скины)

Данная инфраструктура позволяет вам хранить скины игроков на бесплатных серверах Cloudflare (R2) и обрабатывать запросы через Cloudflare Workers.

## Шаг 1: Создание R2 Bucket (Корзины)
1. Зарегистрируйтесь на [Cloudflare](https://dash.cloudflare.com/) и перейдите в раздел **R2 Object Storage**.
2. Включите R2 (потребуется привязать карту, но до 10 ГБ/мес это бесплатно).
3. Нажмите **Create bucket** (Создать корзину).
4. Введите название, например: `divlauncher-skins`. Нажмите **Create**.
5. На странице созданной корзины перейдите в раздел **Settings** -> **Public Access** -> **Custom Domains** и привяжите домен (если есть), или включите **R2.dev subdomain** (публичный доступ к файлам).

## Шаг 2: Создание Cloudflare Worker
1. В левом меню Cloudflare перейдите в **Workers & Pages**.
2. Нажмите **Create Application** -> **Create Worker**.
3. Назовите его, например, `skin-api`, и нажмите **Deploy**.
4. На странице Worker'а перейдите в **Settings** -> **Variables**.
5. В разделе **R2 Bucket Bindings**:
   - Нажмите **Add binding**.
   - Variable name: `SKINS_BUCKET`
   - R2 bucket: выберите вашу корзину (`divlauncher-skins`).
6. В разделе **Environment Variables**:
   - Нажмите **Add variable**.
   - Название: `API_KEY`
   - Значение: придумайте сложный пароль (например, `SuperSecretDivKey123`).
   - Нажмите **Encrypt** (чтобы скрыть) и **Save**.

## Шаг 3: Написание кода Worker'а
1. Перейдите на вкладку **Code** (Quick Edit) в вашем Worker'е.
2. Вставьте следующий код:

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname; // Ожидаем /<username>.png
    const method = request.method;

    // CORS Заголовки (чтобы 3D viewer в лаунчере мог получить картинку)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (method === 'GET') {
      // Ищем файл в корзине R2
      const objectName = path.slice(1); // убираем начальный слеш
      const object = await env.SKINS_BUCKET.get(objectName);

      if (!object) {
        return new Response('Skin not found', { status: 404, headers: corsHeaders });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);

      return new Response(object.body, { headers });
    }

    if (method === 'PUT') {
      // Проверка API-ключа
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== \`Bearer \${env.API_KEY}\`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      const objectName = path.slice(1);
      await env.SKINS_BUCKET.put(objectName, request.body, {
        httpMetadata: { contentType: 'image/png' },
      });

      return new Response('Uploaded', { status: 200, headers: corsHeaders });
    }

    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }
};
```

3. Нажмите **Save and Deploy**.

## Шаг 4: Интеграция с лаунчером и модами
Теперь ваш Worker доступен по адресу, например: `https://skin-api.ваш_субдомен.workers.dev`.

1. В коде лаунчера (`SettingsPage.jsx`) мы жестко задали этот URL.
2. В клиенте (в игре), если вы используете мод **CustomSkinLoader**, настройте `CustomSkinLoader.json`, указав ваш URL API.
3. На сервере **SkinsRestorer** автоматически будет скачиваться и устанавливаться, а его конфиг будет настроен так, чтобы скины подтягивались с этого же API.
