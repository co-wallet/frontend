# AGENTS.md

Инструкции по работе с frontend-репозиторием **co-wallet**.

## Назначение и стек

Mobile-first SPA для учёта личных и семейных финансов.

- React 18, TypeScript, Vite 6.
- Ionic React 8 и `IonReactRouter`.
- React Query 5 для серверного состояния.
- Zustand для сессии, периода и темы.
- Axios для API, Recharts для графиков.
- Tailwind и lucide-react удалены; не добавлять их обратно.

## Команды

```bash
npm run dev   # Vite на :3000, /api проксируется на :8080
npm run test  # unit-тесты Vitest
npm run lint  # ESLint 9
npm run build # TypeScript + production build
```

Для локального запуска API должен быть доступен на `http://localhost:8080`.

## Структура

```text
src/
  api/          API по доменам и общий Axios client
  components/   переиспользуемые Ionic-компоненты
  pages/        страницы приложения
  pages/admin/  административные страницы
  store/        Zustand stores
  lib/          форматирование, decimal и chart helpers
  theme/        Ionic CSS variables
```

Все маршруты определяются в `src/App.tsx`. Routed-страницы оборачиваются в `IonPage`, а навигация должна использовать Ionic primitives, чтобы сохранялись анимации и корректная кнопка «назад».

## UI и темы

- Использовать Ionic-компоненты и Ionic CSS variables.
- Интерфейс проектировать mobile-first, но проверять desktop layout.
- Поддерживать режимы `light`, `dark` и `system` через `themeStore`.
- Цвета Recharts получать через общий theme helper, не фиксировать их внутри страниц.
- Не добавлять Tailwind utility-классы и зависимости shadcn/Tailwind.

## API и состояние

- Доменные API находятся в `src/api`; общее поведение Axios — только в `src/api/client.ts`.
- Request interceptor добавляет access token.
- При 401 выполняется один общий refresh-запрос, затем исходные запросы повторяются. При ошибке refresh сессия очищается.
- Access и refresh токены вместе с пользователем хранятся в `authStore` под ключом `auth-storage`.
- Серверное состояние хранить в React Query; после mutation инвалидировать соответствующие query keys.
- В Zustand оставлять только клиентское и сессионное состояние.
- JSON-даты имеют тип `string`; для `<input type="date">` использовать `YYYY-MM-DD`.
- Не терять точность денежных значений при редактировании и форматировании.

## Тесты

- Тесты обязательны для каждого изменения поведения.
- API/interceptor/state edge cases покрывать Vitest-тестами рядом с кодом.
- Проверять успешный сценарий, ошибки API, повтор запроса и очистку сессии.
- Не тестировать приватные функции напрямую — проверять публичное поведение модулей.

Перед публикацией PR выполнить `npm run test`, `npm run lint` и `npm run build`. После изменений пересобрать стек командой `docker compose build && docker compose up -d` в репозитории Docker-конфигурации проекта.
