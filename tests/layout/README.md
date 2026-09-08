# Стенд проверки layout

[Гайдлайн интерфейса](https://github.com/co-wallet/docs/blob/main/ui-guidelines.md)
хранится в репозитории docs.

Для воспроизводимой проверки без доступа к API есть dev-only стенд.
Команду запуска выполнять из корня frontend-репозитория:


```text
npm run dev -- --host 127.0.0.1 --port 3001
http://127.0.0.1:3001/tests/layout/index.html?page=/accounts&theme=dark
http://127.0.0.1:3001/tests/layout/index.html?page=/transactions&state=empty
```

Параметры: `page` — маршрут, `theme` — `light/dark/system`, `state` —
`populated/empty/loading/error`. Для детальных страниц используются
`/accounts/layout-account/members` и `/transactions/layout-transaction/edit`.
Стенд подменяет Axios adapter и не читает/не меняет данные сервера. Открывать его
на отдельном dev-origin: он устанавливает тестовую сессию и тему в localStorage.
После обычной перезагрузки страницы fixture adapter исчезает; для повторной
проверки снова открывать URL стенда. Стенд не является entry point production build.
