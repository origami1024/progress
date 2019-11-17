//////////////
// Конфиг скрипта:
// 1. Скрипт нужно помещать перед head
// 2. Стили <link href="assets/accubar.css" rel="stylesheet" />
// 3. Нужно, чтобы браузер грузил свгшку первой - для этого в HTML в head, нужно добавлять <link rel="preload" href="assets/img/progress_v5.svg" as="image">
// 4. Скрипт принимает такие параметры в теге: data-svgw, data-svgh, data-grayscale, data-ghostdur, data-cssanim, data-picPath
//////////////
//////////////
// Пример рабочего head
/*
<link rel="preload" href="assets/img/logo2.svg" as="image">
<script src="assets/accubar.js"
  data-maskbg=#333333
  data-picPath="assets/img/logo2.svg"
  data-ghostdur=0
  data-svgw=142
  data-svgh=62
  data-grayscale="true"
  data-cssanim="true"
  data-debug="true"
  data-imgsPerTick=20>
</script>
<link href="assets/accubar.css" rel="stylesheet" />
*/
//////////////


//////////
// presets - объект пользовательских настроек
//////////
let presets = {
  svgWidth: 142, //Длина(ее пропорция) viewBox в сторонней свгшке
  svgHeight: 62, //Высота(ее пропорция) viewBox в сторонней свгшке
  grayscaleBGCopy: true, //Нужна ли серая копия свгшки бэкграундом?
  maskBGColor: '#333', //хексы длиной 7 и 4 символа
  ghostTime: 1750, //"Время в лимбе": после окончания загрузки и последней анимации, анимация скрытия враппера accubar(сейчас opacity в 0) будет длится столько ms
  useCssTransition: true,//Если true - по прогрессу меняется css переменная, которая указана в transform: translate, что обеспечивает плавную анимацию; если false, то просто двигать координату x в части маски в svg
  picPath: 'assets/img/progress_v5.svg', //Путь к сторонней свгшке. Она должна грузится как можно раньше, поэтому эту часть нужно продублировать в html в head, по типу: <link rel="preload" href="assets/img/visa-5.svg" as="image">
  debugOn: true, //Выводить дебаг текст или нет
  maxImagesPerTick: 1, //Кол-во готовых изображений, добавленных в прогресс за 1 тик таймера, если изображений мало, можно поставить 1 для повышения плавности
}


//////
// Принимаем настройки из параметров к script
// Возможные параметры: data-svgw, data-svgh, data-grayscale, data-ghostdur, data-cssanim, data-picPath, data-maskbg, data-debug
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
    if (document.scripts[index].getAttribute('data-maskbg')) presets.maskBGColor = document.scripts[index].getAttribute('data-maskbg')
    if (document.scripts[index].getAttribute('data-debug') == "false") presets.debugOn = false
    if (document.scripts[index].getAttribute('data-imgsPerTick')) presets.maxImagesPerTick = document.scripts[index].getAttribute('data-imgsPerTick')
    
    //проверка, если браузер edge - перевод в режим без css, так худо бедно раюотает
    if ((window.navigator.userAgent.indexOf("Edge") > -1) || navigator.userAgent.indexOf('MSIE')!==-1 || navigator.appVersion.indexOf('Trident/') > -1) presets.useCssTransition = false
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
    <filter id="composite">
      <feColorMatrix type="saturate" in="SourceGraphic" result="B" values="0.1"/> <!--GRAYSCALE-->
      <feComponentTransfer in="B" result="C">
        <feFuncR type="linear" slope="30"/>
        <feFuncG type="linear" slope="30"/>
        <feFuncB type="linear" slope="30"/>
      </feComponentTransfer>
      <feColorMatrix type="matrix" in="C" result="D" values="${hexToFe(presets.maskBGColor)}" /> <!--NEW COLOR-->
    </filter>
  </defs>
  ${presets.grayscaleBGCopy ? `<image filter="url(#composite)" xlink:href="${presets.picPath}" x="0" y="0" preserveAspectRatio="none" width="${presets.svgWidth}" height="${presets.svgHeight}" />` : ''}
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
let tracker = setInterval(function(){
  //1. Проверка загрузки изображений
  //за один интервал в прогресс добавляется только первая перебранная картинка, завершившая загрузку, для более плавных анимаций
  composite.imageCollection = document.getElementsByTagName("img")
  let tmpCounter = 0
  for (let i = 0, icount=composite.imageCollection.length; i < icount; i++){
    if (composite.imageCollection[i].complete) {
      if (composite.imageCollection[i].dataset['loadcomplete'] != 1) {
        composite.imageCollection[i].dataset['loadcomplete'] = 1
        composite.doneImages += 1
        if (composite.doneImages == composite.imageCollection.length) {
          //чисто косметическое действие - убрать крутящийся лоадер, когда последний img загружен
          if (presets.debugOn) document.getElementsByClassName('imgsLoader')[0].classList.remove('imgsLoader')
        }
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
        }
        tmpCounter += 1
        if (tmpCounter >= composite.maxImagesPerTick) {
          break //для большей плавности
        }
      }
    }
  }

  //2. Изменения и рассчеты фактического значения загрузки - composite.realProgress
  composite.realProgress = composite.doneImages * 2 + composite.documentInteractive * 2 + composite.documentComplete + composite.loadedScripts
  composite.progressCap = composite.imageCollection.length * 2 + composite.loadedScripts + 2 + 1 //имеджи * 2 + 1 за каждый скрипт + 2 за интерактив + 1 за комплит
  
  //3. Таймер удаляет сам себя, если загрузка дошла до 100%
  if (composite.progressCap === composite.realProgress) {
    clearInterval(tracker)
  }
  
  //4. Каждую итерацию таймера пытаемся запустить функцию "отрисовки" анимации (сначала не будет получаться, но при таком варианте запуска начнет работать уже с первых загруженных в дом элементов)
  try {
    barAnimateProgress()
  } catch (e) {}

  //5. Учёт загруженных скриптов
  if (document.scripts.length > composite.loadedScripts) {
    composite.loadedScripts = document.scripts.length
  }
},50)


/////////////
// readystatechange
/////////////
document.addEventListener('readystatechange', function () {
  if (document.readyState == 'interactive') {
    composite.documentTimeStampsHtml = 'document interactive: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
    document.body.classList.add('stop-scrolling')
    composite.documentInteractive = 1
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
  debugRender(perc)
  if (presets.useCssTransition) {
    document.documentElement.style.setProperty('--maskPosX', perc * presets.svgWidth + 'px')
  } else {
    composite.mask.setAttribute('x', perc * presets.svgWidth)
  }
  //На 100% запускаем последовательность терминации
  if (perc >= 1) {
    //Вешаем вторую часть терминации на завершение transition маски
    composite.mask.addEventListener('transitionend', function () {
      debugLastAnimation(parseFloat((new Date().getTime() - startTime)/1000).toFixed(2))
      
      //Вешаем третью часть терминации на таймер со временем presets.ghostTime
      setTimeout(function() {
        debugLastBit()
        document.documentElement.style.setProperty('transition-duration', '1s')
        bar.classList.add('barEndAnimation')
        bar.addEventListener('transitionend', function (e) {
          //Полная терминация на окончании transition элемента bar
          if (e.target == bar) {
            bar.style.display = 'none' //здесь можно удалить его вообще из дом, если дебаг не нужен
            console.log('Total time: ', parseFloat((new Date().getTime() - startTime)/1000).toFixed(2))
          }
        })
        setTimeout(function () {
          
          document.body.classList.remove('stop-scrolling')
        }, 1000)
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
  } catch (_error) {}
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
bar.innerHTML = svgCode + (presets.debugOn ? `
<div class="debuggerTxt realProgressDebug"></div>
<div class="debuggerTxt dbtxt2"></div>
<div class="debuggerTxt imagesProgressDebug imgsLoader">imgs: 0 / 0</div>
<div class="debuggerTxt dbtxt4"></div>
<div class="debuggerTxt scriptsDebug"></div>
<div class="debuggerTxt dbtxt5"></div>
<div class="debuggerTxt documentTimeStampsDebug"></div>
<div class="debuggerTxt lastTipDebug"></div>
<div class="debuggerTxt"></div>
` : '')

bar.classList.add('accubar')

//Запуск!
start()


//конвертация hex в 0-1
function hexToFe(hex) {
  let r, g, b //красный, зеленый, голубой
  if (hex.length==7) {
    r = parseInt(hex.substring(1,3),16) / 255
    g = parseInt(hex.substring(3,5),16) / 255
    b = parseInt(hex.substring(5,7),16) / 255
  } else if (hex.length==4) {
    r = parseInt(hex.substring(1,2),16) / 15
    g = parseInt(hex.substring(2,3),16) / 15
    b = parseInt(hex.substring(3,4),16) / 15
  }
  return r.toFixed(2) +" 0 0 0 0 0 " + g.toFixed(2) + " 0 0 0 0 0 " + b.toFixed(2) + " 0 0 0 0 0 1 0"
}


//3 функции вывода дебага, сам вывод потенциально можно улучшить код
function debugRender(perc){
  if (presets.debugOn) {
    document.getElementsByClassName('realProgressDebug')[0].textContent = 'real progress: ' + composite.realProgress + ' / ' + composite.progressCap + ' (' + (perc * 100 | 0) + '%)'
    document.getElementsByClassName('dbtxt2')[0].textContent = 'document state: ' + document.readyState + ' (' + (document.readyState == 'interactive' ? '2' : '3') + ' / 3)'
    document.getElementsByClassName('imagesProgressDebug')[0].textContent = 'imgs: ' + composite.doneImages + ' / ' + composite.imageCollection.length + (composite.doneImages == composite.imageCollection.length ? ' done' : '')
    document.getElementsByClassName('dbtxt4')[0].textContent = 'img loading timestamps: ' + composite.imageTimeStamps.join('s ') + 's'
    document.getElementsByClassName('documentTimeStampsDebug')[0].innerHTML = composite.documentTimeStampsHtml
    document.getElementsByClassName('scriptsDebug')[0].innerHTML = 'scripts loaded: ' + composite.loadedScripts
    if (perc >= 1) {
      document.getElementsByClassName('documentTimeStampsDebug')[0] += 'real progress 100%: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
    }
  }
}
function debugLastAnimation(animationFinished){
  if (presets.debugOn) {
    document.getElementsByClassName('documentTimeStampsDebug')[0] += 'animation finished at 100%: ' + animationFinished + 's'
    document.getElementsByClassName('lastTipDebug')[0].textContent = 'Время до закрытия(ghost time): ' + parseFloat(presets.ghostTime / 1000).toFixed(2) + 's'
    document.getElementsByClassName('lastTipDebug')[0].classList.add('imgsLoader')
  }
}

function debugLastBit(){
  if (presets.debugOn) {
    document.getElementsByClassName('lastTipDebug')[0].classList.remove('imgsLoader')
    document.getElementsByClassName('lastTipDebug')[0].textContent += ' done'
  }
}