https://origami1024.github.io/progress/


#### Скрипт - загрузочный скрин. Функциональность:
* Скрипт добавляет загрузочный скрин показывающий прогресс загрузки
* Загрузка изображений - таймер проверяет состояние complete всех img на странице
* Дебаг инфа о том, что учитывается в подсчете прогресса на экране
* На экранчик ставится картинка, которая скрывается за свг маской, маска по загрузке уезжает - плавно показывая картинку
* Браузеры, на которых тестировал на firefox, chrome, chrome mobile


#### Идеи по доработке:
* Другие опции анимации маски, например: с права на лево, снизу вверх
* Вариант маски - круг из центра с радиусом 0 в полную картинку
* Вариант - делать большой блюр и снижать его по загрузке, и вообще разные фильтры
* Можно сделать с css файлами то же, что сделано со скриптами, но из-за их небольшого веса (относительно картинок или даже скриптов) визуально в прогрессбаре этого не будет заметно, разве что изначально прогрессбар будет уже начинать с дополнительных завершенных процентов.
* Ajax запросы не реализованы
* Можно продумать получение размеров файлов из php для предусмотрения более плавной анимации загрузки, но это даже если и добавит, то не много


#### Конфиг скрипта:
1. Скрипт нужно помещать перед head
2. Стили <link href="assets/accubar.css" rel="stylesheet" />
3. Нужно, чтобы браузер грузил свгшку первой - для этого в HTML в head, нужно добавлять <link rel="preload" href="assets/img/progress_v5.svg" as="image">
4. Скрипт принимает такие параметры в теге: data-svgw, data-svgh, data-grayscale, data-ghostdur, data-cssanim, data-picPath


#### Пример подключения к страничке (В html в head):
```
<script src="assets/accubar.js" data-svgw=142 data-svgh=62 data-grayscale="true" data-ghostdur=5000 data-cssanim="true" data-picPath="assets/img/visa-5.svg"></script>
<link href="assets/accubar.css" rel="stylesheet" />
<link rel="preload" href="assets/img/visa-5.svg" as="image">
```


#### Другое

##### Чтобы поменять svg на загрузке нужно в presets (Или лучше задать эти параметры скрипту):
1. изменить picPath
2. изменить svgWidth и svgHeight, на ПРОПОРЦИОНАЛЬНЫЕ тем, что в свг viewBox; пропорционально, чтобы свгшка правильно сжималась/растягивалась по ширине и высоте
3. установить grayscaleBGCopy в нужное значение - true/false