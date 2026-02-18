# RU Label Map: Short vs Full

Purpose:
- `short` labels for constrained UI (chips, narrow dropdown rows, compact buttons, dense card metadata).
- `full` labels for unconstrained UI (headers, panels, forms, dialogs, tooltips).

## Roles

| Key | Full (RU) | Short (RU) |
|---|---|---|
| warehouse | Склад | Склад |
| lab_operator | Лаборант | Лаборант |
| action_supervision | Контроль воздействий | Воздействия |
| admin | Администратор | Админ |

## Methods

| Key | Full (RU) | Short (RU) |
|---|---|---|
| SARA | SARA | SARA |
| IR | ИК | ИК |
| mass_spectrometry | Масс-спектрометрия | Масс-спектр. |
| rheology | Реология | Реология |
| electrophoresis | Электрофорез | Электрофорез |
| nmr | ЯМР | ЯМР |

## Board Column Statuses

| Key | Full (RU) | Short (RU) |
|---|---|---|
| planned | Запланировано | План |
| awaiting_arrival | Ожидание поступления | Ожидание |
| in_progress | В работе | В работе |
| needs_attention | Требует внимания | Внимание |
| completed | Завершено | Завершено |
| stored | Хранится | Хранится |
| issues | Проблемы | Проблемы |
| conflicts | Конфликты | Конфликты |
| uploaded_batch | Загруженная партия | Партия |
| deleted | Удалено | Удалено |

## Card Micro-Labels

| Key | Full (RU) | Short (RU) |
|---|---|---|
| sample | Образец | Образец |
| analysis | Анализ | Анализ |
| conflict | Конфликт | Конфликт |
| sampling | Отбор | Отбор |
| well | Скважина | Скв. |
| horizon | Горизонт | Гор. |
| fridge | Холодильник | Холод. |
| bin | Ячейка | Яч. |
| place | Место | Место |
| unassigned | Не назначен | Не назн. |

## Common Compact Actions

| Key | Full (RU) | Short (RU) |
|---|---|---|
| sort | Сортировка | Сорт. |
| filter_visibility | Видимость фильтров | Фильтры |
| apply_filters | Применить фильтры | Применить |
| mark_all_read | Отметить все прочитанными | Прочитано всё |
| returned_for_analysis | Вернуть на анализ | Вернуть |
| stored_not_resolved | Сохранить как неурегулированное | Не урегулировано |
| resolve_conflict | Урегулировать конфликт | Урегулировать |

## Notes

- Keep scientific method abbreviations (`SARA`, `ИК`, `ЯМР`) unchanged between full/short.
- Use short labels only where horizontal space is constrained.
- Keep full labels for all validation errors, event log entries, and modal titles/descriptions.
