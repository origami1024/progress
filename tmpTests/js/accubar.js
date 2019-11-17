;(function(){

let presets = {
  svgWidth: 142, //Длина(ее пропорция) viewBox в сторонней свгшке
  svgHeight: 62, //Высота(ее пропорция) viewBox в сторонней свгшке
  grayscaleBGCopy: true, //Нужна ли серая копия свгшки бэкграундом?
  maskBGColor: '#333', //хексы длиной 7 и 4 символа
  ghostTime: 1750, //"Время в лимбе": после окончания загрузки и последней анимации, анимация скрытия враппера accubar(сейчас opacity в 0) будет длится столько ms
  useCssTransition: true,//Если true - по прогрессу меняется css переменная, которая указана в transform: translate, что обеспечивает плавную анимацию; если false, то просто двигать координату x в части маски в svg
  picPath: 'assets/img/progress_v5.svg', //Путь к сторонней свгшке. Она должна грузится как можно раньше, поэтому эту часть нужно продублировать в html в head, по типу: <link rel="preload" href="assets/img/visa-5.svg" as="image">
  debugOn: true, //Выводить дебаг текст или нет
  maxImagesPerTick: 15, //Кол-во готовых изображений, добавленных в прогресс за 1 тик таймера, если изображений мало, можно поставить 1 для повышения плавности
}


//////
// Принимаем настройки из параметров к script
// Возможные параметры: data-svgw, data-svgh, data-grayscale, data-ghostdur, data-cssanim, data-picPath, data-maskbg, data-debug
//////
for (let index = 0; index < document.scripts.length; index++) {
  if (document.scripts[index].src.split('/').pop() ==='accubar.js') {
    //Возможно нужно добавить проверку на валидность данных
    if (document.scripts[index].getAttribute('data-svgw')) presets.svgWidth = +document.scripts[index].getAttribute('data-svgw')
    if (document.scripts[index].getAttribute('data-svgh')) presets.svgHeight = +document.scripts[index].getAttribute('data-svgh')
    if (document.scripts[index].getAttribute('data-grayscale') == "false") presets.grayscaleBGCopy = false
    if (document.scripts[index].getAttribute('data-ghostdur')) presets.ghostTime = +document.scripts[index].getAttribute('data-ghostdur')
    if (document.scripts[index].getAttribute('data-cssanim') == "false") presets.useCssTransition = false
    if (document.scripts[index].getAttribute('data-picPath')) presets.picPath = document.scripts[index].getAttribute('data-picPath')
    if (document.scripts[index].getAttribute('data-maskbg')) presets.maskBGColor = document.scripts[index].getAttribute('data-maskbg')
    if (document.scripts[index].getAttribute('data-debug') == "false") presets.debugOn = false
    if (document.scripts[index].getAttribute('data-imgsPerTick')) presets.maxImagesPerTick = +document.scripts[index].getAttribute('data-imgsPerTick')
    
    //проверка, если браузер edge - перевод в режим без css, так худо бедно раюотает
    if ((window.navigator.userAgent.indexOf("Edge") > -1) || navigator.userAgent.indexOf('MSIE')!==-1 || navigator.appVersion.indexOf('Trident/') > -1) presets.useCssTransition = false
    break;
  }
}




////////////////////////////////

  //Время начала работы скрипта/приблизительное время начала загрузки страницы
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
  var startTime = new Date().getTime(),
      bar = document.createElement('div'),
      stat = document.createElement('div')

  function initBarElement(){
    console.log('initBarElement time: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
    var svgCode = `
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
    bar.innerHTML = svgCode
    bar.appendChild(stat)
    bar.classList.add('accubar')
    document.body.appendChild(bar)
  }
  function loadbar() {
    console.log('loadbar time: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
    var img = document.images,
    c = 0,
    tot = img.length,
    timeStamps = []
    
    function imgLoaded(){
      c += 1;
      var perc = 100/tot*c
      console.log(perc)
      document.documentElement.style.setProperty('--maskPosX', perc / 100 * (presets.svgWidth) + 'px')
      
      stat.textContent = "Loading "+ (perc << 0) +"%"
      
      let tmpTime = ((new Date().getTime() - startTime) / 1000).toFixed(2)
      timeStamps.push(tmpTime)
      let animTime = tmpTime / (timeStamps.length + 0.15)
      if (animTime < 0.5) animTime = 0.5 // если очень быстро, то замедляем
      document.documentElement.style.setProperty('--maskAnimDuration', animTime + 's')
      if(c===tot) return doneLoading()
    }
    function doneLoading(){
      console.log('done time: ',((new Date().getTime() - startTime) / 1000).toFixed(2) + 's')
      //bar.style.opacity = 0;
      setTimeout(function(){
        bar.style.display = "none";
      }, 600);
    }
    for(var i=0; i<tot; i++) {
      var tImg     = new Image();
      tImg.onload  = imgLoaded;
      tImg.onerror = imgLoaded;
      tImg.src     = img[i].src;
    }    
  }

  function start() {
    try {
      initBarElement()
    } catch (_error) {}
    if (!document.querySelector('.accubar')) {
      //пробуй запустить через 30мс
      return setTimeout(start, 30)
    } else {
      //Успешный запуск
    }
  }
  start() //Мы можем прикрепить бар еще до DOMContentLoaded
  document.addEventListener('DOMContentLoaded', loadbar, false);
}());