# Техническая спецификация и исходный код плагина DivStatsSync

> [!NOTE]
> Данный документ содержит полное описание структуры, конфигурации и исходного кода плагина **DivStatsSync** для серверов Bukkit/Spigot/Paper (включая Arclight), собирающего и синхронизирующего игровую статистику с бэкенд-сервером авторизации DivLauncher.

---

## 1. Структура проекта (Maven)

Рекомендуется использовать Maven для сборки плагина. Создайте следующую структуру каталогов:

```text
DivStatsSync/
├── pom.xml
└── src/
    └── main/
        ├── java/
        │   └── ru/
        │       └── diverlin/
        │           └── divstatssync/
        │               ├── DivStatsSync.java   (Главный класс плагина)
        │               ├── StatsListener.java  (Отслеживание событий игрока)
        │               └── HttpSender.java     (Отправка данных по HTTP)
        └── resources/
            ├── plugin.yml                      (Манифест плагина)
            └── config.yml                      (Файл конфигурации по умолчанию)
```

### Файл `pom.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>ru.diverlin</groupId>
    <artifactId>DivStatsSync</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <repositories>
        <!-- Репозиторий Spigot API -->
        <repository>
            <id>spigotmc-repo</id>
            <url>https://hub.spigotmc.org/nexus/content/repositories/snapshots/</url>
        </repository>
    </repositories>

    <dependencies>
        <!-- Зависимость Spigot API (совместимая с 1.20.1) -->
        <dependency>
            <groupId>org.spigotmc</groupId>
            <artifactId>spigot-api</artifactId>
            <version>1.20.1-R0.1-SNAPSHOT</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>17</source>
                    <target>17</target>
                </configuration>
            </plugin>
        </plugins>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>true</filtering>
            </resource>
        </resources>
    </build>
</project>
```

---

## 2. Конфигурационные ресурсы

### Файл `src/main/resources/plugin.yml`
```yaml
name: DivStatsSync
version: 1.0.0
main: ru.diverlin.divstatssync.DivStatsSync
api-version: 1.20
author: Diverlin
description: Автоматическая синхронизация игровой статистики игроков с лаунчером.
```

### Файл `src/main/resources/config.yml`
```yaml
# URL-адрес веб-сервера авторизации (бэкенда)
api-url: 'https://mcauth.diverlin.ru/api/server/sync-stats'

# Секретный токен для авторизации запросов на бэкенде (должен совпадать с SERVER_TOKEN в .env)
server-token: 'SuperSecretSyncToken123'
```

---

## 3. Исходный код плагина (Java)

### Класс `DivStatsSync.java`
Это основной класс плагина, который инициализирует конфигурацию и регистрирует обработчик событий.

```java
package ru.diverlin.divstatssync;

import org.bukkit.plugin.java.JavaPlugin;

public final class DivStatsSync extends JavaPlugin {

    private static DivStatsSync instance;

    @Override
    public void onEnable() {
        instance = this;

        // Инициализируем и сохраняем конфиг по умолчанию, если его нет
        saveDefaultConfig();

        // Регистрируем обработчик событий
        getServer().getPluginManager().registerEvents(new StatsListener(this), this);

        getLogger().info("DivStatsSync успешно запущен и готов к работе!");
    }

    @Override
    public void onDisable() {
        getLogger().info("DivStatsSync остановлен.");
    }

    public static DivStatsSync getInstance() {
        return instance;
    }
}
```

### Класс `StatsListener.java`
Этот класс перехватывает событие выхода игрока из игры (`PlayerQuitEvent`), собирает его ванильную статистику и асинхронно отправляет её по HTTP.

```java
package ru.diverlin.divstatssync;

import org.bukkit.Bukkit;
import org.bukkit.Statistic;
import org.bukkit.advancement.Advancement;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerQuitEvent;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

public class StatsListener implements Listener {

    private final DivStatsSync plugin;

    public StatsListener(DivStatsSync plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent event) {
        Player player = event.getPlayer();

        // 1. Собираем статистику из Minecraft API
        // PLAY_ONE_MINUTE возвращает время в тиках (20 тиков = 1 секунда)
        long ticks = player.getStatistic(Statistic.PLAY_ONE_MINUTE);
        long playtimeSeconds = ticks / 20;

        // Собираем количество сломанных блоков (суммируем все типы)
        int blocksMined = 0;
        for (org.bukkit.Material material : org.bukkit.Material.values()) {
            if (material.isBlock()) {
                try {
                    blocksMined += player.getStatistic(Statistic.MINE_BLOCK, material);
                } catch (IllegalArgumentException ignored) {
                    // Игнорируем материалы, для которых нет счетчика сломанных блоков
                }
            }
        }

        int mobsKilled = player.getStatistic(Statistic.MOB_KILLS);
        int deaths = player.getStatistic(Statistic.DEATHS);

        // 2. Собираем список завершенных достижений (Advancements)
        List<String> achievements = new ArrayList<>();
        Iterator<Advancement> iterator = Bukkit.advancementIterator();
        while (iterator.hasNext()) {
            Advancement advancement = iterator.next();
            // Нам нужны только ванильные достижения с рецептами/квестами
            String key = advancement.getKey().toString();
            if (key.startsWith("minecraft:recipes/") || key.contains("/root")) {
                continue;
            }
            if (player.getAdvancementProgress(advancement).isDone()) {
                achievements.add(key);
            }
        }

        // 3. Формируем JSON тело запроса
        // Мы собираем JSON вручную, чтобы не тащить тяжелые сторонние библиотеки в jar
        String uuid = player.getUniqueId().toString();
        String username = player.getName();

        StringBuilder jsonBuilder = new StringBuilder();
        jsonBuilder.append("{")
                .append("\"uuid\":\"").append(uuid).append("\",")
                .append("\"username\":\"").append(username).append("\",")
                .append("\"stats\":{")
                .append("\"playtime_seconds\":").append(playtimeSeconds).append(",")
                .append("\"blocks_mined\":").append(blocksMined).append(",")
                .append("\"mobs_killed\":").append(mobsKilled).append(",")
                .append("\"deaths\":").append(deaths).append(",")
                .append("\"achievements_completed\":[");

        for (int i = 0; i < achievements.size(); i++) {
            jsonBuilder.append("\"").append(achievements.get(i)).append("\"");
            if (i < achievements.size() - 1) {
                jsonBuilder.append(",");
            }
        }
        jsonBuilder.append("]}}");

        String jsonPayload = jsonBuilder.toString();

        // 4. Отправляем запрос асинхронно, чтобы не фризить основной поток сервера
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            String apiUrl = plugin.getConfig().getString("api-url");
            String token = plugin.getConfig().getString("server-token");

            plugin.getLogger().info("Отправка статистики для игрока " + username + "...");
            boolean success = HttpSender.sendPost(apiUrl, token, jsonPayload);

            if (success) {
                plugin.getLogger().info("Статистика для " + username + " успешно синхронизирована!");
            } else {
                plugin.getLogger().warning("Не удалось синхронизировать статистику для " + username);
            }
        });
    }
}
```

### Класс `HttpSender.java`
Этот класс отвечает за непосредственную передачу JSON данных по HTTP POST на веб-сервер лаунчера с авторизацией по заголовку.

```java
package ru.diverlin.divstatssync;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class HttpSender {

    public static boolean sendPost(String targetUrl, String token, String jsonPayload) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(targetUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            
            // Настраиваем заголовки
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setRequestProperty("User-Agent", "DivStatsSync-Plugin/1.0.0");
            
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            connection.setDoOutput(true);

            // Записываем данные в тело запроса
            try (OutputStream os = connection.getOutputStream()) {
                byte[] input = jsonPayload.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            // Получаем HTTP статус код
            int responseCode = connection.getResponseCode();
            if (responseCode == 200 || responseCode == 204) {
                return true;
            } else {
                System.err.println("[DivStatsSync] Сервер вернул код ошибки: " + responseCode);
                return false;
            }
        } catch (Exception e) {
            System.err.println("[DivStatsSync] Сбой сети при отправке данных: " + e.getMessage());
            return false;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
```

---

## 4. Как скомпилировать и установить плагин

1. Установите Java Development Kit (JDK 17) и Apache Maven на вашем ПК.
2. Создайте папку `DivStatsSync` и сохраните в неё файлы конфигурации и исходного кода согласно структуре выше.
3. Откройте терминал в папке проекта и выполните сборку:
   ```bash
   mvn clean package
   ```
4. После успешного завершения сборки готовый плагин будет находиться в папке `target/DivStatsSync-1.0.0.jar`.
5. Поместите полученный `.jar` в папку `plugins` вашего игрового сервера.
