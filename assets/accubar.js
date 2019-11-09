//////////////
// Конфиг скрипта:
// 1. Скрипт нужно помещать перед head
// 2. Стили <link href="assets/accubar.css" rel="stylesheet" />
// 2. Нужно, чтобы браузер грузил свгшку первой - для этого в HTML в head, нужно добавлять <link rel="preload" href="assets/img/progress_v5.svg" as="image">
//////////////
//////////////
// Чтобы поменять svg на загрузке нужно в presets (Или лучше задать эти параметры скрипту):
// 1. изменить picPath
// 2. изменить svgWidth и svgHeight, на ПРОПОРЦИОНАЛЬНЫЕ тем, что в свг viewBox; пропорционально, чтобы свгшка правильно сжималась/растягивалась по ширине и высоте
// 3. установить grayscaleBGCopy в нужное значение - true/false
//////////////


//////////
// presets - объект пользовательских настроек
//////////
let presets = {
  svgWidth: 142, //Длина(ее пропорция) viewBox в сторонней свгшке
  svgHeight: 62, //Высота(ее пропорция) viewBox в сторонней свгшке
  grayscaleBGCopy: true, //Нужна ли серая копия свгшки бэкграундом?
  ghostTime: 1750, //"Время в лимбе": после окончания загрузки и последней анимации, анимация скрытия враппера accubar(сейчас opacity в 0) будет длится столько ms
  useCssTransition: true,//Если true - по прогрессу меняется css переменная, которая указана в transform: translate, что обеспечивает плавную анимацию; если false, то просто двигать координату x в части маски в svg
  picPath: 'assets/img/progress_v5.svg', //Путь к сторонней свгшке. Она должна грузится как можно раньше, поэтому эту часть нужно продублировать в html в head, по типу: <link rel="preload" href="assets/img/visa-5.svg" as="image">
}


//////
// Принимаем настройки из параметров к script
// Возможные параметры: data-svgw, data-svgh, data-grayscale, data-ghostdur, data-cssanim, data-picPath
//////
for (let index = 0; index < document.scripts.length; index++) {
  if (document.scripts[index].src.split('/').pop() ==='accubar.js') {
    //Возможно нужно добавить проверку на валидность данных
    if (document.scripts[index].getAttribute('data-svgw')) presets.svgWidth = document.scripts[index].getAttribute('data-svgw')
    if (document.scripts[index].getAttribute('data-svgh')) presets.svgHeight = document.scripts[index].getAttribute('data-svgh')
    if (document.scripts[index].getAttribute('data-grayscale') == "false") presets.grayscaleBGCopy = false
    if (document.scripts[index].getAttribute('data-ghostdur')) presets.ghostTime = document.scripts[index].getAttribute('data-ghostdur')
    if (document.scripts[index].getAttribute('data-cssanim') == "false") presets.useCssTransition = false
    if (document.scripts[index].getAttribute('data-picPath')) presets.picPath = document.scripts[index].getAttribute('data-picPath')
    break;
  }
}


//Время начала работы скрипта/приблизительное время начала загрузки страницы
let startTime = new Date().getTime()


/////////////////
// Дальше идет свгшка-враппер(шаблонная часть), в которой реализованы следующие идеи:
// 1. Маска из двух прямоугольников на всю svg: 1) белый - показать всё, второй черный, который двигается при анимации. Здесь есть потенциал для оптимизации - сделать одним прямоугольником
// 2. Сторонняя основная свгшка подгружается из файла, по пути из presets.picPath
// 3. Если presets.grayscaleBGCopy задан true, то свгшка вставляется 2 раз с чернобелым фильтром - как фон
// 4. Свгшка и маска растянуты на весь viewBox, и изменяются через presets.svgWidth, presets.svgHeight
/////////////////
let svgCode = `
<svg class="inner-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${presets.svgWidth} ${presets.svgHeight}">
  <defs>
    <mask id="myMask" x="0" y="0">
      <rect class="maskPart1" x="0" y="0" width="${presets.svgWidth}" height="${presets.svgHeight}" fill="white"></rect>
      <rect class="maskMovingPart maskLeftToRight" x="0" y="0" width="${presets.svgWidth}" height="${presets.svgHeight}" fill="black"></rect>
    </mask>
    <filter id="grayscale">
      <feColorMatrix type="saturate" values="0.10"/>
    </filter>
  </defs>
  ${presets.grayscaleBGCopy ? `<image filter="url(#grayscale)" xlink:href="${presets.picPath}" x="0" y="0" preserveAspectRatio="none" width="${presets.svgWidth}" height="${presets.svgHeight}" />` : ''}
  <image mask="url(#myMask)" xlink:href="${presets.picPath}" x="0" y="0" preserveAspectRatio="none" width="${presets.svgWidth}" height="${presets.svgHeight}" />
</svg>
`


////////////
// composite - объект с основными внутренними состояниями/моделью данных
////////////
let composite = {
  realProgress: 0, //фактический(в противовес фейковому/анимированному) прогресс, измеряемый в условных единицах; 2 единицы каждое изображение, 2 и 1 единицы на изменениях documentreadystate
  progressCap: 3, //максимальный прогресс, когда документ догружается до interactive, определяется кол-во изображений и это значение пересчитывается, так что realProgress в конце будет равен progressCap и делением этих двух получаем текущий фактический процент загрузки
  documentInteractive: 0, //догрузился ли док-т до Interactive
  documentComplete: 0, //догрузился ли док-т до Complete
  doneImages: 0, //кол-во изображений, которые либо завершили загрузку, либо на них ошибка загрузки
  imageCollection: [], //html-коллекция, с ссылками на все img на странице
  images: [], //массив значения которого - ИНДЕКСЫ в composite.imageCollection, нужен чтобы знать какие именно изображения еще не загружены и их нужно проверять на таймере. Скорее всего, тут есть потенциал для оптимизации
  imageTimeStamps: [], //сюда записываются значения времени окончания загрузки каждого изображания по мере их загрузки
  mask: undefined, //ссылка на двигающийся элемент в свг-враппере
  documentTimeStampsHtml: '', //дебуг текст, сохраняется сюда, для сокращения рассчетов. Потенциал для оптимизации
  loadedScripts: 0, //количество загруженных скриптов
  //ajax? - слежка за аякс запросами не реализована, потенциально может быть нужно, реализовано в PACE
}


//////////////////
// tracker - постоянный таймер с интервалом 50мс, реализующий следующие идеи:
// 1. Проверка img.complete - какие изображения завершили загрузку/произошла ошибка загрузки
// 2. Изменение переменной composite.realProgress на основании данных о том, что уже загружено
// 3. ClearInterval этому таймеру, когда composite.realProgress == composite.progressCap, т. е. 100% достигнуто
// 4. Вызов barAnimateProgress() - функция "отрисовки" элементов и анимации
// 5. Подсчет загруженных скриптов, каждый добавляет 1 к realProgress и к progressCap. Такая странная реализация - потому что нельзя узнать сколько будет скриптов заранее.
//////////////////
let tracker = setInterval(()=>{
  //1. Проверка загрузки изображений
  //Кол-во изображений видимых изображений до полной загрузки dom дерева изменяется,
  //Нужно проверять их кол-во, пока documentReadyState не станет interactive, когда структура дом дерева полностью построена
  //Есть потенциал для оптимизации
  if (composite.documentInteractive == 0) {
    composite.imageCollection = document.getElementsByTagName("img")
    composite.imageCount = composite.imageCollection.length
  }
  //Сама проверка изображений, за один интервал в прогресс добавляется только первая перебранная картинка, завершившая загрузку, для более плавных анимаций
  for (let i = 0, icount=composite.images.length; i < icount; i++){
    if (composite.imageCollection[composite.images[i]].complete) {
      if (icount == 1) {
        //чисто косметическое действие - убрать крутящийся лоадер, когда последний img загружен
        document.getElementsByClassName('imgsLoader')[0].classList.remove('imgsLoader')
      }
      composite.images.splice(i,1)
      composite.doneImages += 1
      //далее на загрузке каждого img добавить время от старта в composite, для рассчетов скорости анимации и дебаггинга
      let tmpTime = ((new Date().getTime() - startTime) / 1000).toFixed(2)
      composite.imageTimeStamps.push(tmpTime)
      let animTime = tmpTime / (composite.imageTimeStamps.length + 0.25)
      if (presets.useCssTransition) {
        if (animTime < 0.4) animTime = 0.4 // если очень быстро, то замедляем
        if ((composite.documentComplete == 1) && (animTime > 1)) animTime = 1 // если очень длинная загрузка, то в момент реальных 100% загрузки максимальное время анимации выставить в 1сек
        document.documentElement.style.setProperty('--maskAnimDuration', animTime + 's')        
      } else {
        document.documentElement.style.setProperty('--maskAnimDuration', 0)
        console.log('no animation mode')
      }
      break //break при первом найденом новом img.complete, чтобы сделать анимацию более плавной - не обрабатывать одновременные загрузки в одном цикле, а откладывая их на след
    }
  }

  //2. Изменения и рассчеты фактического значения загрузки - composite.realProgress
  composite.realProgress = composite.doneImages * 2 + composite.documentInteractive * 2 + composite.documentComplete + composite.loadedScripts
  if (composite.imageCollection.length == composite.images.length + composite.doneImages) {
    composite.progressCap = composite.imageCollection.length * 2 + composite.loadedScripts + 2 + 1 //имеджи * 2 + 1 за каждый скрипт + 2 за интерактив + 1 за комплит
  } else {
    composite.progressCap = composite.imageCollection.length * 2 + composite.loadedScripts + 2 + 1
    console.log('UNSYNCRONIZED')
    //Сюда попадаешь при несоответствиях в формулах рассчета progressCap и realProgress. Только для дебага, есть потенциал для оптимизации.
  }
  console.log(`progress: ${composite.realProgress} / ${composite.progressCap}`)
  
  //3. Таймер удаляет сам себя, если загрузка дошла до 100%
  if (composite.progressCap === composite.realProgress) {
    clearInterval(tracker)
    console.log('TRACKER KILLED')
  }
  
  //4. Каждую итерацию таймера пытаемся запустить функцию "отрисовки" анимации (сначала не будет получаться, но при таком варианте запуска начнет работать уже с первых загруженных в дом элементов)
  try {
    barAnimateProgress()
  } catch {}

  //5. Учёт загруженных скриптов
  if (document.scripts.length > composite.loadedScripts) {
    composite.loadedScripts = document.scripts.length
  }
},50)


/////////////
// readystatechange
// На interactive уже загружено почти все - кроме картинок
// На complete всё равно часть картинок еще не загружена
/////////////
document.addEventListener('readystatechange', e => {
  console.log('readyStateChange: ', document.readyState)
  if (document.readyState == 'interactive') {
    composite.documentTimeStampsHtml = 'document interactive: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
    document.body.classList.add('stop-scrolling')
    composite.documentInteractive = 1
    composite.imageCollection = document.getElementsByTagName("img")
    composite.imageCount = composite.imageCollection.length
    for (let i = 0; i < composite.imageCount; i++){
      composite.images.push(i)
    }
  } else
  if (document.readyState == 'complete') {
    composite.documentComplete = 1
    composite.documentTimeStampsHtml += 'document complete: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
  }
})


/////////
// Функция добавления bar к документу
/////////
function initLoadingBar(){
  document.body.appendChild(bar)
  composite.mask = document.getElementsByClassName('maskMovingPart')[0]
  document.documentElement.style.setProperty('--ghostTime', presets.ghostTime + 'ms')
}


////////
// Функция "отрисовки" элементов и анимации
// 
// Реализация вывода дебага имеет потенциал для оптимизации
////////
function barAnimateProgress(){
  let perc = composite.realProgress / composite.progressCap
  document.getElementsByClassName('realProgressDebug')[0].textContent = `real progress: ${composite.realProgress} / ${composite.progressCap} (${(perc * 100 | 0)}%)`
  document.getElementsByClassName('dbtxt2')[0].textContent = `document state: ${document.readyState} (${document.readyState == 'interactive' ? 2 : 3} / 3)`
  document.getElementsByClassName('imagesProgressDebug')[0].textContent = `imgs: ${composite.doneImages} / ${composite.imageCollection.length}${composite.images.length==0 ? ' done' : ''}`
  document.getElementsByClassName('dbtxt4')[0].textContent = 'img loading timestamps: ' + composite.imageTimeStamps.join('s ') + 's'
  document.getElementsByClassName('documentTimeStampsDebug')[0].innerHTML = composite.documentTimeStampsHtml
  document.getElementsByClassName('scriptsDebug')[0].innerHTML = 'scripts loaded: ' + composite.loadedScripts
  if (presets.useCssTransition) {
    composite.mask.style.setProperty('--maskPosX', perc * presets.svgWidth + 'px')
  } else {
    composite.mask.setAttribute('x', perc * presets.svgWidth)
  }
  //На 100% запускаем последовательность терминации
  if (perc >= 1) {
    document.getElementsByClassName('documentTimeStampsDebug')[0] += 'real progress 100%: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
    //Вешаем вторую часть терминации на завершение transition маски
    composite.mask.addEventListener('transitionend', () => {
      document.getElementsByClassName('documentTimeStampsDebug')[0] += 'animation finished at 100%: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's'
      document.getElementsByClassName('lastTipDebug')[0].textContent = `Дополнительное время до закрытия(ghost time): ${parseFloat(presets.ghostTime / 1000).toFixed(2)}s`
      document.getElementsByClassName('inner-svg')[0].classList.add('svgEndAnimation')
      bar.style.setProperty('transition-duration', 'var(--ghostTime)')
      bar.classList.add('barEndAnimation')
      //Вешаем третью часть терминации на таймер со временем presets.ghostTime
      setTimeout(()=>{
        bar.addEventListener('transitionend', (e) => {
          //Полная терминация на окончании transition элемента bar
          if (e.target == bar) bar.style.display = 'none' //здесь можно удалить его вообще из дом, если дебаг не нужен
        })
        document.body.classList.remove('stop-scrolling')
        console.log('BAR TERMINATED')
      },presets.ghostTime)
    })
    //Далее если presets.useCssTransition выключено, т.е. прогресс двигается без css анимаций, то сразу делаем фэйковый ивент завершения анимации на маске
    if (!presets.useCssTransition) {
      let fakeTransitionEnd = document.createEvent('Events')
      fakeTransitionEnd.initEvent('transitionend', true, false)
      composite.mask.dispatchEvent(fakeTransitionEnd)
    }
  }
}

////////
// Функция запуска - с попытками запуститься как можно раньше, не дожидаясь конкретных ивентов
// Идея украдена из PACE)
////////
function start() {
  try {
    initLoadingBar()
  } catch (_error) {
    NoTargetError = _error
  }
  if (!document.querySelector('.accubar')) {
    //пробуй запустить через 50мс
    return setTimeout(start, 50)
  } else {
    //Успешный запуск
  }
}


let bar = document.createElement('div')
//Прилепляем svg заполненный шаблон к дебаг шаблону и всё это вставляем в bar
//который в initLoadingBar потом будет прилеплен к body 
bar.innerHTML = `
${svgCode}
<div class="debuggerTxt realProgressDebug"></div>
<div class="debuggerTxt dbtxt2"></div>
<div class="debuggerTxt imagesProgressDebug imgsLoader"></div>
<div class="debuggerTxt dbtxt4"></div>
<div class="debuggerTxt scriptsDebug"></div>
<div class="debuggerTxt dbtxt5"></div>
<div class="debuggerTxt documentTimeStampsDebug"></div>
<div class="debuggerTxt lastTipDebug"></div>
`
bar.classList.add('accubar')

//Запуск!
start()