//////////////
// Конфиг скрипта:
// 1. Скрипт нужно помещать перед head
// 2. Стили <link href="assets/accubar.css" rel="stylesheet" />
// 2. Нужно, чтобы браузер грузил свгшку первой - для этого в HTML в head, нужно добавлять <link rel="preload" href="assets/img/progress_v5.svg" as="image">
//////////////
//////////////
// Чтобы поменять svg на загрузке нужно в presets:
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
  //picPath: 'assets/img/progress_v5.svg',//
  picPath: 'assets/img/visa-5.svg', //Путь к сторонней свгшке. Она должна грузится как можно раньше, поэтому эту часть нужно продублировать в html в head, по типу: <link rel="preload" href="assets/img/visa-5.svg" as="image">
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
// 1.1. 
// 2. Изменение переменной composite.realProgress на основании данных о том, что уже загружено
// 3. Когда composite.realProgress == composite.progressCap, т. е. 100% достигнуто, остановка этого tracker
// 4. Вызов barAnimateProgress() - функция "отрисовки" элементов и анимации
//////////////////
let tracker = setInterval(()=>{

  //counting images - its dynamically changing, so has to be here
  //OPTIMIZE THIS!
  composite.imageCollection = document.getElementsByTagName("img")
  composite.imageCount = composite.imageCollection.length

  //Далее следует часть 1, в которой проверяется какие изображения завершили загрузку
  for (let i = 0, icount=composite.images.length; i < icount; i++){
    if (composite.imageCollection[composite.images[i]].complete) {
      if (icount == 1) {
        //do it once when last image is complete
        document.getElementsByClassName('imgsLoader')[0].classList.remove('imgsLoader')
      }
      composite.images.splice(i,1)
      composite.doneImages += 1
      //HERE LOG THE TIME NEEDED
      //ALSO LOG TOTAL TIME IN THE END!
      //SHOW IT AS SEPARATE DEBUG LINES
      let tmpTime = ((new Date().getTime() - startTime) / 1000).toFixed(2)
      //so we have tmpTime
      let animTime = tmpTime / (composite.imageTimeStamps.length + 0.25)
      console.log('animTime: ', animTime)
      if (presets.useCssTransition) {
        //console.log('right')
        document.documentElement.style.setProperty('--maskAnimDuration', animTime + 's')
        if ((composite.documentComplete == 1) && (animTime > 1)) document.documentElement.style.setProperty('--maskAnimDuration', '1s')
      } else {
        document.documentElement.style.setProperty('--maskAnimDuration', 0)
      }
      composite.imageTimeStamps.push(tmpTime)
      //console.log(`an image completed. At ${tmpTime - startTime}ms since start.`)
      
      break;//one at a time, for a smoother loading
    }
  }


  //progress change
  composite.realProgress = composite.doneImages * 2 + composite.documentInteractive * 2 + composite.documentComplete + composite.loadedScripts
  if (composite.imageCollection.length == composite.images.length + composite.doneImages) {
    composite.progressCap = composite.imageCollection.length * 2 + composite.loadedScripts + 2 + 1 //имеджи * 2 + 1 за каждый скрипт + 2 за интерактив + 1 за комплит
  } else {
    composite.progressCap = composite.imageCollection.length * 2 + composite.loadedScripts + 2 + 1
    console.log('UNSYNCRONIZED')
    //duno wot to do if this happens yet, can it happen?
  }
  console.log(`progress: ${composite.realProgress} / ${composite.progressCap}`)
  

  //delete this timer
  if (composite.progressCap === composite.realProgress) {
    //if (composite.progressCap === composite.animatedProgress) {
    clearInterval(tracker)
    console.log('TRACKER KILLED')
  }
  

  ////////
  try {
    barAnimateProgress()
  } catch {}

  //counting loaded scripts
  if (document.scripts.length > composite.loadedScripts) {
    composite.loadedScripts = document.scripts.length
  }

  
},50)




document.onreadystatechange = () => {
  console.log('readyStateChange: ', document.readyState)
  if (document.readyState == 'interactive') {
    //initLoadingBar()
    composite.documentTimeStampsHtml = 'document interactive: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
    document.body.classList.add('stop-scrolling')
    composite.documentInteractive = 1
    composite.imageCollection = document.getElementsByTagName("img")
    composite.imageCount = composite.imageCollection.length
    //barAnimateProgress()
    for (let i = 0; i < composite.imageCount; i++){
      composite.images.push(i)
    }
    
  } else
  if (document.readyState == 'complete') {
    composite.documentComplete = 1
    composite.documentTimeStampsHtml += 'document complete: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'

  }
}



let bar = document.createElement('div')
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

function initLoadingBar(){
  document.body.appendChild(bar)
  composite.mask = document.getElementsByClassName('maskMovingPart')[0]
  document.documentElement.style.setProperty('--ghostTime', presets.ghostTime + 'ms')
}


function barAnimateProgress(){
  let perc = composite.realProgress / composite.progressCap//, animPerc = composite.animatedProgress / composite.progressCap
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

  if (perc >= 1) {
    document.getElementsByClassName('documentTimeStampsDebug')[0] += 'real progress 100%: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's<br>'
    composite.mask.addEventListener('transitionend', () => {
      document.getElementsByClassName('documentTimeStampsDebug')[0] += 'animation finished at 100%: ' + parseFloat((new Date().getTime() - startTime)/1000).toFixed(2) + 's'
      document.getElementsByClassName('lastTipDebug')[0].textContent = `Дополнительное время до закрытия(ghost time): ${parseFloat(presets.ghostTime / 1000).toFixed(2)}s`
      document.getElementsByClassName('inner-svg')[0].classList.add('svgEndAnimation')
      bar.style.setProperty('transition-duration', 'var(--ghostTime)')
      bar.classList.add('barEndAnimation')
      setTimeout(()=>{
        
        bar.addEventListener('transitionend', (e) => {
          if (e.target == bar) bar.style.display = 'none' //change this for some disappering effect  
        })
        
        document.body.classList.remove('stop-scrolling')
        console.log('BAR TERMINATED')
      },presets.ghostTime)
    })
    if (!presets.useCssTransition) {
      let fakeTransitionEnd = document.createEvent('Events')
      fakeTransitionEnd.initEvent('transitionend', true, false)
      composite.mask.dispatchEvent(fakeTransitionEnd)
    }
    //bar.classList.add('endAnimation')
    
  }
}


function start() {
  try {
    initLoadingBar()
  } catch (_error) {
    NoTargetError = _error
  }
  if (!document.querySelector('.accubar')) {
    //try again
    return setTimeout(start, 50);
  } else {
    //it started succesfully
  }
}
start()