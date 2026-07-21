# Синхронизация Business Process Template и BPMN

## Архитектурная граница

Исполняемой и канонической моделью остаются:

- `BusinessProcessTemplate.steps`;
- `BusinessProcessTemplate.transitions`;
- `BusinessProcessTemplate.parameters`;
- `BusinessProcessTemplate.startCondition`.

`bpmnXml` хранит визуальное представление. Изменение диаграммы должно сначала
преобразоваться в каноническую модель, пройти валидацию и только затем попасть
в Angular Form. Backend не исполняет BPMN XML.

## Проблемы текущей реализации

1. `BusinessProcessBpmnMapperService` выполняет только первичное
   `steps/transitions -> BPMN`; при наличии `bpmnXml` табличные изменения
   игнорируются.
2. Изменение диаграммы обновляет только XML и очищает `visualMapping`.
3. `edgeMap` использует составной ключ с индексом строки. После сортировки,
   вставки или удаления строки identity перехода теряется.
4. В метаданных формы нет межтабличной и графовой валидации.
5. Нет защиты от цикла `form -> diagram -> form` и правил разрешения конфликтов.

## Целевой metadata contract (v2)

Переход получает постоянный технический ключ:

```ts
interface BusinessProcessTransition {
  key: string;
  from: string;
  on: 'APPROVE' | 'REJECT' | 'TIMEOUT' | 'AUTO';
  to: string;
  condition?: unknown;
}
```

`step.key` остаётся постоянным доменным identity шага. Изменение названия шага
меняет `title`, но не `key`.

```ts
interface BusinessProcessVisualMappingV2 {
  schemaVersion: 2;
  notation: 'BPMN';
  routeHash: string;
  startEventId?: string;
  nodeMap: Record<string, string>;       // step key -> BPMN element id
  edgeMap: Record<string, string>;       // transition key -> sequence flow id
  endNodeMap?: Record<string, string>;   // END_* -> BPMN end event id
}
```

`routeHash` вычисляется только по нормализованным `steps`, `transitions` и
`parameters.startStepKey`. Геометрия BPMN в hash не входит.

Для старых шаблонов переходные ключи генерируются один раз при нормализации.
Существующий `visualMapping` v1 читается, но при ближайшем сохранении
перезаписывается в v2. Изменение схемы БД не требуется: оба поля уже JSON.

## Поддерживаемое BPMN-подмножество

- один StartEvent;
- UserTask -> `USER_TASK`;
- ServiceTask -> `SYSTEM_TASK`;
- Task -> `AUTO`;
- IntermediateCatchEvent с timer definition -> `TIMER`;
- EndEvent -> один из `END_APPROVED`, `END_REJECTED`, `END_CANCELLED`;
- SequenceFlow;
- ExclusiveGateway как визуальный routing-узел без отдельной строки `steps`.

SubProcess, parallel/inclusive gateways и произвольные события на первом этапе
дают диагностическую ошибку и не перезаписывают таблицы.

## Правила синхронизации

### Tables -> BPMN

1. Нормализовать и валидировать route DTO.
2. Сопоставить элементы по `visualMapping`.
3. Обновить type/name существующих BPMN-узлов, сохранив их координаты.
4. Создать недостающие и удалить только элементы, управляемые mapping.
5. Обновить sequence flows и `visualMapping`.
6. Импортировать XML с origin `TABLES`, не запуская обратную синхронизацию.

### BPMN -> Tables

1. Экспортировать XML после debounce `commandStack.changed`.
2. Разобрать только поддерживаемое BPMN-подмножество.
3. Сопоставить узлы и связи по обратному `visualMapping`.
4. Для новых узлов создать постоянные keys; для существующих сохранить
   невизуальные поля (`assignmentRule`, SLA, penalty и condition).
5. Обновить FormArray через `emitEvent: false`, пометить форму dirty и один раз
   уведомить coordinator.
6. При ошибке оставить последнюю валидную табличную модель и показать JSON
   diagnostics.

Для новых sequence flows событие определяется по известному BPMN metadata/name;
если оно отсутствует, создаётся `AUTO` и предупреждение. Существующий `on`
сохраняется по transition key.

## Защита от циклов и конфликтов

Coordinator хранит origin операции: `TABLES`, `DIAGRAM`, `LOAD` или `SAVE`.
Повторное событие с тем же нормализованным route hash/XML hash игнорируется.
Синхронизация сериализуется через очередь; устаревший generation result не
применяется.

Изменение только координат обновляет `bpmnXml`, но не FormArray. Семантическое
изменение узла или связи обновляет обе стороны. При одновременных изменениях
побеждает последняя завершённая пользовательская команда, а конфликт выводится
в diagnostics вместо молчаливой потери данных.

## Checkpoints

1. **Metadata v2 и совместимость.** Добавить transition key, v2 mapping,
   нормализатор старых данных, required/enum metadata и структурированные
   validation issues.
2. **Чистая доменная модель.** Вынести route graph, stable hash и валидатор;
   покрыть ссылочную целостность, uniqueness, start/end и supported types.
3. **Tables -> BPMN.** Реализовать forward adapter с сохранением DI geometry и
   обновлением mapping v2.
4. **BPMN -> route preview.** Реализовать parser поддерживаемого подмножества и
   JSON diagnostics без изменения формы.
5. **BPMN -> Tables.** Подключить безопасное обновление FormArray, сохранение
   невизуальных свойств и origin guard.
6. **Coordinator.** Объединить оба направления, debounce, generation guard,
   dirty/pristine и undo/redo boundaries.
7. **UX и тесты.** Cross-selection строка/узел, ошибки около таблиц, unit tests
   round-trip и интеграционные сценарии create/rename/delete/connect/undo.

## Критерий round-trip

Для поддерживаемого подмножества должно выполняться:

```text
normalize(route) == normalize(parse(render(route)))
```

При этом перемещение BPMN-элементов не меняет route DTO, а редактирование
невизуальных свойств таблиц не сбрасывает координаты диаграммы.
